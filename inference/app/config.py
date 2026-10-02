"""Settings for the inference service, read from environment variables."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # "mock" returns a quick stand-in image; "real" runs Stable Diffusion + ControlNet
    mode: str = "mock"
    # Shared secret the API sends in the X-API-Key header. Required in real mode.
    api_key: str = ""
    # Denoising steps per image
    steps: int = 20
    # Jobs allowed to wait behind the running one; beyond that, new jobs get 429
    max_waiting: int = 8
    # Force "cuda", "mps" or "cpu"; by default the best available device is used
    device: str | None = None
    # Finished jobs are forgotten after this many seconds
    job_ttl_seconds: int = 600


def load_settings() -> Settings:
    settings = Settings(
        mode=os.environ.get("INFERENCE_MODE", "mock"),
        api_key=os.environ.get("INFERENCE_API_KEY", ""),
        steps=int(os.environ.get("INFERENCE_STEPS", "20")),
        max_waiting=int(os.environ.get("INFERENCE_MAX_WAITING", "8")),
        device=os.environ.get("INFERENCE_DEVICE") or None,
        job_ttl_seconds=int(os.environ.get("INFERENCE_JOB_TTL_SECONDS", "600")),
    )
    if settings.mode not in ("mock", "real"):
        raise ValueError(f"INFERENCE_MODE must be 'mock' or 'real', not {settings.mode!r}")
    if settings.mode == "real" and not settings.api_key:
        raise ValueError("INFERENCE_API_KEY must be set when INFERENCE_MODE is 'real'")
    return settings
