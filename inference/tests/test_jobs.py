import pytest
from PIL import Image

from app.generators import latent_preview
from app.jobs import JobError, JobQueue, JobStatus, QueueFull
from tests.helpers import FailingGenerator, GatedGenerator, filtered_generator, wait_until

SKETCH = Image.new("RGB", (512, 768), "white")


def make_queue(generator, steps=3, max_waiting=2):
    queue = JobQueue(generator, steps=steps, max_waiting=max_waiting, job_ttl_seconds=600)
    queue.start()
    return queue


def test_a_job_reports_progress_and_produces_an_image():
    generator = GatedGenerator()
    queue = make_queue(generator)
    job = queue.submit(SKETCH, "a couch", seed=7)

    generator.started.wait(timeout=5)
    generator.release(1)
    wait_until(lambda: job.step == 1)
    assert (job.status, job.total_steps) == (JobStatus.RUNNING, 3)
    assert job.preview

    generator.release(2)
    wait_until(lambda: job.status == JobStatus.SUCCEEDED)
    assert job.image and job.thumbnail and job.outline
    assert job.preview is None
    assert job.seed == 7
    queue.stop()


def test_a_waiting_job_can_be_cancelled_before_it_starts():
    generator = GatedGenerator()
    queue = make_queue(generator)
    first = queue.submit(SKETCH, "first")
    second = queue.submit(SKETCH, "second")
    generator.started.wait(timeout=5)

    assert queue.position(second) == 0
    queue.cancel(second.id)

    assert second.status == JobStatus.CANCELLED
    generator.release(3)
    wait_until(lambda: first.status == JobStatus.SUCCEEDED)
    assert second.step == 0
    queue.stop()


def test_a_running_job_stops_at_the_next_step_when_cancelled():
    generator = GatedGenerator()
    queue = make_queue(generator, steps=10)
    job = queue.submit(SKETCH, "cancel me")
    generator.started.wait(timeout=5)

    queue.cancel(job.id)
    generator.release(10)

    wait_until(lambda: job.status == JobStatus.CANCELLED)
    assert job.step == 1
    queue.stop()


def test_new_jobs_are_refused_when_too_many_are_waiting():
    generator = GatedGenerator()
    queue = make_queue(generator, max_waiting=1)
    queue.submit(SKETCH, "running")
    generator.started.wait(timeout=5)
    queue.submit(SKETCH, "waiting")

    with pytest.raises(QueueFull):
        queue.submit(SKETCH, "one too many")

    generator.release(6)
    queue.stop()


@pytest.mark.parametrize(
    ("generator", "error"),
    [
        (FailingGenerator(RuntimeError("GPU exploded")), JobError.GENERATION_FAILED),
        (filtered_generator(), JobError.FILTERED),
    ],
)
def test_failures_are_reported_with_a_code_not_the_exception_text(generator, error):
    queue = make_queue(generator)
    job = queue.submit(SKETCH, "doomed")

    wait_until(lambda: job.status == JobStatus.FAILED)

    assert job.error == error
    assert job.image is None
    queue.stop()


def test_latents_preview_as_a_small_picture():
    torch = pytest.importorskip("torch")

    preview = latent_preview(torch.zeros(1, 4, 96, 64))

    assert preview.size == (64, 96)
    assert preview.getpixel((0, 0)) == (127, 127, 127)
