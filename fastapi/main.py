import base64
from fastapi import FastAPI, Query, Request, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from diffusers import DiffusionPipeline
import io
from PIL import Image
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with frontend domain
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Load the DiffusionPipeline with optimizations
model_id = "runwayml/stable-diffusion-v1-5"
pipeline = DiffusionPipeline.from_pretrained(model_id)

#mps for mac, can switch to cuda if able too 
pipe = pipeline.to("mps")

# Recommended if computer has < 64 GB of RAM
pipe.enable_attention_slicing()

@app.get("/")
async def root():
    return {"message": "Welcome to the Stable Diffusion API!"}

@app.get("/generate/text2img", response_class=StreamingResponse)
async def generate_image(prompt: str = Query(..., description="Text prompt for image generation"),
                         temperature: float = Query(0.9, ge=0.1, le=1.0, description="Temperature for diversity"),
                         width: int = Query(512, ge=64, le=1024, description="Image width"),
                         height: int = Query(512, ge=64, le=1024, description="Image height"),
                         scale: int = Query(7, ge=1, le=10, description="CFG scale"),
                         seed: int = Query(-1, description="Random seed"),
                         sampling_steps: int = Query(20, ge=1, le=100, description="Sampling steps"),
                         num_inference_steps: int = Query(50, ge=1, le=100, description="Number of inference steps")):
    
    # Generate image with fewer inference steps
    image = pipe(prompt, 
                 width=width,
                 height=height, 
                 num_inference_steps=num_inference_steps, 
                 temperature = temperature, 
                 scale=scale, seed=seed, 
                 sampling_steps=sampling_steps).images[0]
    
    # Convert image to PNG format
    image_data = io.BytesIO()
    image.save(image_data, format="PNG")
    image_data.seek(0)
    
    # Return the streaming response
    return StreamingResponse(image_data, media_type="image/png")


@app.post("/generate/img2img")
async def generate_image(request: Request):
    # Parse JSON body
    try:
        body = await request.json()

        # Extract base64-encoded image from request body
        base64_image = body.get("base64_image", "")
        prompt = body.get("prompt", "")
        strength = body.get("strength", 0.75)
        scale = body.get("scale", 7)
        sampling_steps = body.get("sampling_steps", 10)
        num_inference_steps = body.get("num_inference_steps", 20)

        print("Received request to generate image.")
        print(f"Prompt: {prompt}")

        # Decode base64-encoded image
        image_bytes = base64.b64decode(base64_image.split(",")[-1])
        init_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        init_image = init_image.resize((768, 512))
        init_image.save("init_image.png")

        # Generate image with the provided prompt
        images = pipe(
            prompt=prompt,
            image=init_image,
            strength=strength,
            num_inference_steps=num_inference_steps,
            sampling_steps=sampling_steps,
            scale=scale
        ).images
        generated_image = images[0]

        # Convert generated image to PNG format
        image_data = io.BytesIO()
        generated_image.save(image_data, format="PNG")
        image_data.seek(0)

        # Convert generated image to base64 format
        base64_image_str = base64.b64encode(image_data.getvalue()).decode('utf-8')

        # Return the streaming response
        return JSONResponse({
            "base64_image": f"data:image/png;base64,{base64_image_str}"})
    except Exception as e:
         # If any error occurs, return an error response
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)