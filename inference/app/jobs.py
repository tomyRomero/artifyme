"""A small in-memory job queue with one worker thread: the model runs one image at a time,
callers get a job id straight away and poll for progress."""

import logging
import random
import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import StrEnum

from PIL import Image

from app.generators import Cancelled, ContentFiltered, Generator
from app.images import encode_outline, encode_outputs, encode_preview

log = logging.getLogger(__name__)


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobError(StrEnum):
    FILTERED = "filtered"
    GENERATION_FAILED = "generation_failed"


FINISHED = {JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.CANCELLED}


class QueueFull(Exception):
    """Too many jobs are already waiting."""


@dataclass
class Job:
    prompt: str
    seed: int
    sketch: Image.Image | None
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    status: JobStatus = JobStatus.QUEUED
    step: int = 0
    total_steps: int = 0
    error: JobError | None = None
    image: bytes | None = None
    thumbnail: bytes | None = None
    outline: bytes | None = None
    # The latest step, while it runs
    preview: bytes | None = None
    finished_at: float | None = None
    cancel_requested: bool = False


class JobQueue:
    def __init__(self, generator: Generator, steps: int, max_waiting: int, job_ttl_seconds: float):
        self._generator = generator
        self._steps = steps
        self._max_waiting = max_waiting
        self._job_ttl_seconds = job_ttl_seconds
        self._jobs: dict[str, Job] = {}
        self._waiting: deque[Job] = deque()
        self._lock = threading.Lock()
        self._work_available = threading.Condition(self._lock)
        self._stopping = False
        self._worker = threading.Thread(target=self._run, name="generation-worker", daemon=True)

    def start(self) -> None:
        self._worker.start()

    def stop(self) -> None:
        with self._lock:
            self._stopping = True
            self._work_available.notify()
        self._worker.join(timeout=5)

    def submit(self, sketch: Image.Image, prompt: str, seed: int | None = None) -> Job:
        with self._lock:
            self._forget_expired()
            if len(self._waiting) >= self._max_waiting:
                raise QueueFull()
            job = Job(prompt=prompt, seed=seed if seed is not None else random.randrange(2**32), sketch=sketch)
            self._jobs[job.id] = job
            self._waiting.append(job)
            self._work_available.notify()
            return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            self._forget_expired()
            return self._jobs.get(job_id)

    def position(self, job: Job) -> int | None:
        """How many jobs are ahead of this one (0 means it runs next), or None once it has started."""
        with self._lock:
            return next((i for i, waiting in enumerate(self._waiting) if waiting is job), None)

    def cancel(self, job_id: str) -> Job | None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None or job.status in FINISHED:
                return job
            if job.status == JobStatus.QUEUED:
                self._waiting.remove(job)
                self._finish(job, JobStatus.CANCELLED)
            else:
                # The worker checks this flag after every step
                job.cancel_requested = True
            return job

    def counts(self) -> dict[str, int]:
        with self._lock:
            running = sum(1 for job in self._jobs.values() if job.status == JobStatus.RUNNING)
            return {"waiting": len(self._waiting), "running": running}

    def _run(self) -> None:
        while True:
            with self._lock:
                while not self._waiting and not self._stopping:
                    self._work_available.wait()
                if self._stopping:
                    return
                job = self._waiting.popleft()
                job.status = JobStatus.RUNNING

            self._generate(job)

    def _generate(self, job: Job) -> None:
        def on_step(step: int, total: int, preview: Image.Image | None) -> None:
            if preview is not None:
                job.preview = encode_preview(preview)
            job.step, job.total_steps = step, total
            if job.cancel_requested:
                raise Cancelled()

        try:
            image = self._generator.generate(job.sketch, job.prompt, job.seed, self._steps, on_step)
            job.image, job.thumbnail = encode_outputs(image)
            job.outline = encode_outline(job.sketch)
            outcome, error = JobStatus.SUCCEEDED, None
        except Cancelled:
            outcome, error = JobStatus.CANCELLED, None
        except ContentFiltered:
            outcome, error = JobStatus.FAILED, JobError.FILTERED
        except Exception:
            log.exception("Generation failed for job %s", job.id)
            outcome, error = JobStatus.FAILED, JobError.GENERATION_FAILED

        with self._lock:
            job.error = error
            self._finish(job, outcome)

    def _finish(self, job: Job, status: JobStatus) -> None:
        job.status = status
        job.finished_at = time.monotonic()
        job.sketch = job.preview = None

    def _forget_expired(self) -> None:
        cutoff = time.monotonic() - self._job_ttl_seconds
        expired = [id for id, job in self._jobs.items() if job.finished_at is not None and job.finished_at < cutoff]
        for job_id in expired:
            del self._jobs[job_id]
