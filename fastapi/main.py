from fastapi import FastAPI, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from diffusers import DiffusionPipeline
import io
from PIL import Image

app = FastAPI()

# Load the DiffusionPipeline with optimizations
model_id = "runwayml/stable-diffusion-v1-5"
pipeline = DiffusionPipeline.from_pretrained(model_id)
pipe = pipeline.to("mps")

# Recommended if your computer has < 64 GB of RAM
pipe.enable_attention_slicing()

@app.get("/")
async def root():
    return {"message": "Welcome to the Text-to-Image API!"}

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


@app.post("/generate/img2img", response_class=StreamingResponse)
async def generate_image(
    image: UploadFile = File(...),
    prompt: str = Query(..., description="Text prompt for image generation"),
    strength: float = Query(0.75, ge=0.0, le=1.0, description="Strength of image generation"),
    scale: int = Query(7, ge=1, le=10, description="CFG scale"),
    sampling_steps: int = Query(10, ge=1, le=100, description="Sampling steps"),
    num_inference_steps: int = Query(40, ge=1, le=100, description="Number of inference steps")
):

    # Read the uploaded image file
    contents = await image.read()
    init_image = Image.open(io.BytesIO(contents)).convert("RGB")
    init_image = init_image.resize((768, 512))

  
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

    # Return the streaming response
    return StreamingResponse(image_data, media_type="image/png")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
