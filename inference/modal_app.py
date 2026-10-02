"""Runs the inference service on a cloud GPU with Modal (https://modal.com).

    modal secret create artifyme-inference INFERENCE_API_KEY=<the API's Inference:ApiKey>
    modal deploy modal_app.py

Then set the API's Inference:BaseUrl to the address the deploy prints.
"""

from pathlib import Path

import modal

HERE = Path(__file__).parent


def download_weights() -> None:
    import torch
    from diffusers import ControlNetModel, StableDiffusionControlNetPipeline

    from app.generators import ControlNetGenerator

    # The same half-precision files the generator loads on a GPU
    controlnet = ControlNetModel.from_pretrained(
        ControlNetGenerator.CONTROLNET_MODEL, torch_dtype=torch.float16, variant="fp16"
    )
    StableDiffusionControlNetPipeline.from_pretrained(
        ControlNetGenerator.BASE_MODEL, controlnet=controlnet, torch_dtype=torch.float16, variant="fp16"
    )


image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_sync(str(HERE), extras=["real"])
    .env({"HF_HOME": "/models", "INFERENCE_MODE": "real"})
    .add_local_dir(HERE / "app", "/root/app", copy=True)
    # Kept in the image, so a container starts without downloading 3 GB
    .run_function(download_weights)
)

app = modal.App("artifyme-inference", image=image)


@app.function(
    gpu="T4",
    secrets=[modal.Secret.from_name("artifyme-inference")],
    # Jobs are kept in memory, so the API's checks must reach the container doing the painting
    max_containers=1,
    # Stops 10 minutes after the last request, and starts again on the next
    scaledown_window=600,
)
@modal.concurrent(max_inputs=32)
@modal.asgi_app()
def web():
    from app.main import app as service

    return service
