"""HTTP API of the inference service. Only the ArtifyMe API calls it, using a shared API key."""

import base64
import hmac
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import Settings, load_settings
from app.generators import ControlNetGenerator, Generator, MockGenerator
from app.images import InvalidImage, decode_sketch, prepare_sketch
from app.jobs import Job, JobError, JobQueue, JobStatus, QueueFull

log = logging.getLogger(__name__)

# A sketch is a few hundred KB; anything much larger is refused before it's read
MAX_BODY_BYTES = 10 * 1024 * 1024


class JobRequest(BaseModel):
    sketch: str = Field(min_length=1, description="Base64 PNG, JPEG or WebP, optionally as a data: URI")
    prompt: str = Field(min_length=1, max_length=1000)
    seed: int | None = Field(default=None, ge=0, lt=2**32)


class JobView(BaseModel):
    id: str
    status: JobStatus
    step: int
    total_steps: int
    position: int | None = Field(description="Jobs ahead of this one while it waits; null once it has started")
    seed: int
    error: JobError | None
    image: str | None = Field(description="Base64 WebP, once the job has succeeded")
    thumbnail: str | None = Field(description="Base64 WebP, 384 px wide, once the job has succeeded")
    outline: str | None = Field(description="Base64 WebP of the lines ControlNet followed, once the job has succeeded")
    preview: str | None = Field(description="Base64 WebP of the latest step, while the job runs")
    model: str
    device: str


def create_app(settings: Settings | None = None, generator: Generator | None = None) -> FastAPI:
    """Settings and generator can be passed in by tests; otherwise they come from the environment."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        config = settings or load_settings()
        model = generator or (ControlNetGenerator(device=config.device) if config.mode == "real" else MockGenerator())
        if not config.api_key:
            log.warning("INFERENCE_API_KEY is not set; any caller can submit jobs (fine for local mock mode only)")
        queue = JobQueue(model, config.steps, config.max_waiting, config.job_ttl_seconds)
        queue.start()
        app.state.settings, app.state.generator, app.state.queue = config, model, queue
        yield
        queue.stop()

    app = FastAPI(title="ArtifyMe inference", lifespan=lifespan)

    @app.middleware("http")
    async def limit_body_size(request: Request, call_next):
        if int(request.headers.get("content-length") or 0) > MAX_BODY_BYTES:
            return JSONResponse({"detail": "Request body is too large."}, status_code=413)
        return await call_next(request)

    def queue_of(request: Request) -> JobQueue:
        return request.app.state.queue

    Queue = Annotated[JobQueue, Depends(queue_of)]

    def require_api_key(request: Request, x_api_key: Annotated[str | None, Header()] = None) -> None:
        expected = request.app.state.settings.api_key
        if expected and not hmac.compare_digest(x_api_key or "", expected):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing or wrong API key.")

    def view(job: Job, request: Request) -> JobView:
        queue, generator = request.app.state.queue, request.app.state.generator
        succeeded = job.status == JobStatus.SUCCEEDED
        return JobView(
            id=job.id,
            status=job.status,
            step=job.step,
            total_steps=job.total_steps,
            position=queue.position(job),
            seed=job.seed,
            error=job.error,
            image=encode(job.image) if succeeded else None,
            thumbnail=encode(job.thumbnail) if succeeded else None,
            outline=encode(job.outline) if succeeded else None,
            preview=encode(job.preview) if job.status == JobStatus.RUNNING else None,
            model=generator.description,
            device=generator.device,
        )

    def submit(queue: JobQueue, body: JobRequest) -> Job:
        try:
            sketch = prepare_sketch(decode_sketch(body.sketch))
        except InvalidImage as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        try:
            return queue.submit(sketch, body.prompt, body.seed)
        except QueueFull as error:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "The studio is busy. Try again shortly.",
                headers={"Retry-After": "30"},
            ) from error

    @app.get("/health")
    def health(request: Request) -> dict:
        return {
            "status": "ok",
            "mode": request.app.state.settings.mode,
            "model": request.app.state.generator.name,
            "device": request.app.state.generator.device,
            "queue": queue_of(request).counts(),
        }

    @app.post("/jobs", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_api_key)])
    def create_job(body: JobRequest, queue: Queue, request: Request) -> JobView:
        return view(submit(queue, body), request)

    @app.get("/jobs/{job_id}", dependencies=[Depends(require_api_key)])
    def get_job(job_id: str, queue: Queue, request: Request) -> JobView:
        job = queue.get(job_id)
        if job is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No such job.")
        return view(job, request)

    @app.delete("/jobs/{job_id}", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_api_key)])
    def cancel_job(job_id: str, queue: Queue, request: Request) -> JobView:
        job = queue.cancel(job_id)
        if job is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No such job.")
        return view(job, request)

    return app


def encode(data: bytes | None) -> str | None:
    return base64.b64encode(data).decode() if data else None


app = create_app()
