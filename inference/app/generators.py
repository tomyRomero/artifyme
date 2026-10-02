"""The things that turn a prepared sketch into an image: a quick mock and the real model."""

import logging
import random
import time
from collections.abc import Callable
from typing import Protocol

from PIL import Image, ImageFilter, ImageOps

from app.images import HEIGHT, WIDTH, scribble_control

log = logging.getLogger(__name__)

# Called after each denoising step with (step, total, preview). Raising Cancelled from it stops the run.
OnStep = Callable[[int, int, Image.Image | None], None]

# Approximates RGB from SD 1.5 latents without running the VAE, for cheap previews
LATENT_RGB_FACTORS = [
    [0.3512, 0.2297, 0.3227],
    [0.3250, 0.4974, 0.2350],
    [-0.2829, 0.1762, 0.2721],
    [-0.2120, -0.2616, -0.7177],
]


class Cancelled(Exception):
    """The job was cancelled while it was running."""


class ContentFiltered(Exception):
    """The model's safety checker blocked the result."""


class Generator(Protocol):
    name: str
    description: str
    device: str

    def generate(self, sketch: Image.Image, prompt: str, seed: int, steps: int, on_step: OnStep) -> Image.Image: ...


class MockGenerator:
    """Development stand-in: paints the sketch's lines over a gradient chosen from the prompt and seed.
    Deterministic, and it reports progress and previews like the real model does, slowly enough
    (about six seconds for 20 steps) that the app's live preview has something to show."""

    name = "mock"
    description = "Mock generator (no model)"
    device = "cpu"

    def __init__(self, step_delay: float = 0.3):
        self._step_delay = step_delay

    def generate(self, sketch: Image.Image, prompt: str, seed: int, steps: int, on_step: OnStep) -> Image.Image:
        rng = random.Random(f"{prompt}|{seed}")
        image = self._paint(sketch, rng)
        noise = Image.effect_noise(sketch.size, 64).convert("RGB")
        for step in range(1, steps + 1):
            time.sleep(self._step_delay)
            on_step(step, steps, Image.blend(noise, image, step / steps))
        return image

    @staticmethod
    def _paint(sketch: Image.Image, rng: random.Random) -> Image.Image:
        top = tuple(rng.randint(60, 230) for _ in range(3))
        bottom = tuple(rng.randint(30, 200) for _ in range(3))
        gradient = Image.linear_gradient("L").resize(sketch.size)
        background = Image.composite(
            Image.new("RGB", sketch.size, bottom), Image.new("RGB", sketch.size, top), gradient
        )

        # Thicken the strokes and keep their colors, as if painted over the background
        stroke_mask = ImageOps.invert(ImageOps.grayscale(sketch)).point(lambda v: 255 if v > 32 else 0)
        stroke_mask = stroke_mask.filter(ImageFilter.MaxFilter(7))
        strokes = sketch.filter(ImageFilter.MinFilter(7))
        return Image.composite(strokes, background, stroke_mask).filter(ImageFilter.SMOOTH_MORE)


class ControlNetGenerator:
    """Stable Diffusion 1.5 with ControlNet "scribble". ControlNet holds the drawing's lines while the model
    paints the whole picture from the prompt."""

    name = "controlnet-scribble"
    description = "Stable Diffusion 1.5 with ControlNet Scribble"
    BASE_MODEL = "stable-diffusion-v1-5/stable-diffusion-v1-5"
    CONTROLNET_MODEL = "lllyasviel/control_v11p_sd15_scribble"
    NEGATIVE_PROMPT = "low quality, blurry, distorted, deformed, watermark, text, signature"

    def __init__(self, device: str | None = None, guidance_scale: float = 7.5, controlnet_scale: float = 1.0):
        # Heavy imports stay here so mock mode and tests never need torch installed
        import torch
        from diffusers import ControlNetModel, DPMSolverMultistepScheduler, StableDiffusionControlNetPipeline

        self._torch = torch
        self.device = device or self._best_device(torch)
        self._guidance_scale = guidance_scale
        self._controlnet_scale = controlnet_scale

        half_precision = self.device in ("cuda", "mps")
        dtype = torch.float16 if half_precision else torch.float32
        variant = "fp16" if half_precision else None

        log.info("Loading %s and %s on %s", self.BASE_MODEL, self.CONTROLNET_MODEL, self.device)
        controlnet = ControlNetModel.from_pretrained(self.CONTROLNET_MODEL, torch_dtype=dtype, variant=variant)
        self._pipe = StableDiffusionControlNetPipeline.from_pretrained(
            self.BASE_MODEL, controlnet=controlnet, torch_dtype=dtype, variant=variant
        )
        # DPM-Solver++ gives good results in about 20-25 steps
        self._pipe.scheduler = DPMSolverMultistepScheduler.from_config(self._pipe.scheduler.config)
        self._pipe.to(self.device)
        if self.device == "mps":
            self._pipe.enable_attention_slicing()

    @staticmethod
    def _best_device(torch) -> str:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def generate(self, sketch: Image.Image, prompt: str, seed: int, steps: int, on_step: OnStep) -> Image.Image:
        def callback(pipe, step_index, timestep, callback_kwargs):
            on_step(step_index + 1, steps, latent_preview(callback_kwargs["latents"]))
            return callback_kwargs

        try:
            result = self._pipe(
                prompt=prompt,
                negative_prompt=self.NEGATIVE_PROMPT,
                image=scribble_control(sketch),
                width=WIDTH,
                height=HEIGHT,
                num_inference_steps=steps,
                guidance_scale=self._guidance_scale,
                controlnet_conditioning_scale=self._controlnet_scale,
                generator=self._torch.Generator(device="cpu").manual_seed(seed),
                callback_on_step_end=callback,
            )
        finally:
            # The Apple GPU keeps a run's working memory cached; on a Mac that memory is the computer's own
            if self.device == "mps":
                self._torch.mps.empty_cache()
        if result.nsfw_content_detected and any(result.nsfw_content_detected):
            raise ContentFiltered()
        return result.images[0]


def latent_preview(latents) -> Image.Image:
    """A rough picture of SD 1.5 latents (batch, 4, h, w), one pixel per latent."""
    import torch

    factors = torch.tensor(LATENT_RGB_FACTORS, dtype=latents.dtype, device=latents.device)
    rgb = (latents[0].permute(1, 2, 0) @ factors).add(1).div(2).clamp(0, 1).mul(255)
    return Image.fromarray(rgb.byte().cpu().numpy())
