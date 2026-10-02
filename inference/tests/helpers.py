import base64
import io
import threading
import time

from PIL import Image, ImageDraw

from app.generators import ContentFiltered


def sketch_data_uri(size=(390, 585), transparent=True) -> str:
    """A phone-shaped sketch: one dark stroke on a transparent (or white) background."""
    image = Image.new("RGBA", size, (0, 0, 0, 0) if transparent else (255, 255, 255, 255))
    ImageDraw.Draw(image).line([(40, 40), (size[0] - 40, size[1] - 40)], fill=(23, 26, 33, 255), width=6)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


def wait_until(condition, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if condition():
            return
        time.sleep(0.01)
    raise AssertionError("Condition was not met in time")


class GatedGenerator:
    """Runs one step each time the test calls release(), so tests control exactly when work happens."""

    name = "gated"
    description = "Gated test generator"
    device = "cpu"

    def __init__(self):
        self.started = threading.Event()
        self._gate = threading.Semaphore(0)

    def release(self, steps=1):
        for _ in range(steps):
            self._gate.release()

    def generate(self, sketch, prompt, seed, steps, on_step):
        self.started.set()
        for step in range(1, steps + 1):
            self._gate.acquire(timeout=5)
            on_step(step, steps, sketch)
        return sketch


class FailingGenerator:
    name = "failing"
    description = "Failing test generator"
    device = "cpu"

    def __init__(self, error: Exception):
        self._error = error

    def generate(self, sketch, prompt, seed, steps, on_step):
        raise self._error


def filtered_generator() -> FailingGenerator:
    return FailingGenerator(ContentFiltered())
