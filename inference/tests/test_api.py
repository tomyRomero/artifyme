import base64
import io
import re

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.generators import MockGenerator
from app.main import create_app
from tests.helpers import GatedGenerator, sketch_data_uri, wait_until

API_KEY = "test-key"
HEADERS = {"X-API-Key": API_KEY}


def client_for(generator=None, max_waiting=2):
    settings = Settings(mode="mock", api_key=API_KEY, steps=3, max_waiting=max_waiting, job_ttl_seconds=600)
    return TestClient(create_app(settings, generator or MockGenerator(step_delay=0)))


def test_every_route_but_health_requires_the_right_api_key():
    with client_for() as client:
        routes = [r for r in client.app.routes if isinstance(r, APIRoute) and r.path != "/health"]
        assert routes
        for route in routes:
            path = re.sub(r"\{[^}]+\}", "some-id", route.path)
            for method in route.methods:
                for headers in ({}, {"X-API-Key": "wrong"}):
                    response = client.request(method, path, json={}, headers=headers)
                    assert response.status_code == 401, f"{method} {route.path} with {headers}"


def test_a_sketch_goes_in_and_a_portrait_webp_image_and_thumbnail_come_out():
    with client_for() as client:
        created = client.post(
            "/jobs", json={"sketch": sketch_data_uri(), "prompt": "a couch", "seed": 3}, headers=HEADERS
        )
        assert created.status_code == 202
        job_id = created.json()["id"]

        wait_until(lambda: client.get(f"/jobs/{job_id}", headers=HEADERS).json()["status"] == "succeeded")
        job = client.get(f"/jobs/{job_id}", headers=HEADERS).json()

    assert (job["step"], job["total_steps"], job["seed"], job["error"]) == (3, 3, 3, None)
    image = Image.open(io.BytesIO(base64.b64decode(job["image"])))
    assert (image.format, image.size) == ("WEBP", (512, 768))
    assert Image.open(io.BytesIO(base64.b64decode(job["thumbnail"]))).width == 384
    outline = Image.open(io.BytesIO(base64.b64decode(job["outline"])))
    assert (outline.format, outline.size) == ("WEBP", (512, 768))
    assert (job["model"], job["device"], job["preview"]) == ("Mock generator (no model)", "cpu", None)


def test_a_running_job_shows_a_preview_of_its_latest_step():
    generator = GatedGenerator()
    with client_for(generator) as client:
        job_id = client.post("/jobs", json={"sketch": sketch_data_uri(), "prompt": "a couch"}, headers=HEADERS).json()[
            "id"
        ]
        assert client.get(f"/jobs/{job_id}", headers=HEADERS).json()["preview"] is None

        generator.release(1)
        wait_until(lambda: client.get(f"/jobs/{job_id}", headers=HEADERS).json()["step"] == 1)
        job = client.get(f"/jobs/{job_id}", headers=HEADERS).json()
        generator.release(2)

    preview = Image.open(io.BytesIO(base64.b64decode(job["preview"])))
    assert (preview.format, preview.size) == ("WEBP", (256, 384))
    assert job["outline"] is None


@pytest.mark.parametrize(
    ("body", "expected"),
    [
        ({"sketch": "definitely not an image", "prompt": "a couch"}, 400),
        ({"sketch": sketch_data_uri(), "prompt": ""}, 422),
        ({"sketch": sketch_data_uri(), "prompt": "x" * 1001}, 422),
        ({"sketch": sketch_data_uri(), "prompt": "a couch", "seed": -1}, 422),
    ],
)
def test_bad_requests_are_rejected(body, expected):
    with client_for() as client:
        assert client.post("/jobs", json=body, headers=HEADERS).status_code == expected


def test_a_full_queue_answers_429_with_retry_after():
    generator = GatedGenerator()
    with client_for(generator, max_waiting=0) as client:
        client.post("/jobs", json={"sketch": sketch_data_uri(), "prompt": "running"}, headers=HEADERS)
        generator.started.wait(timeout=5)

        response = client.post("/jobs", json={"sketch": sketch_data_uri(), "prompt": "no room"}, headers=HEADERS)

        assert response.status_code == 429
        assert response.headers["retry-after"] == "30"
        generator.release(3)


def test_a_job_can_be_cancelled():
    generator = GatedGenerator()
    with client_for(generator) as client:
        job_id = client.post("/jobs", json={"sketch": sketch_data_uri(), "prompt": "stop"}, headers=HEADERS).json()[
            "id"
        ]
        generator.started.wait(timeout=5)

        client.delete(f"/jobs/{job_id}", headers=HEADERS)
        generator.release(3)

        wait_until(lambda: client.get(f"/jobs/{job_id}", headers=HEADERS).json()["status"] == "cancelled")


def test_unknown_jobs_are_404():
    with client_for() as client:
        assert client.get("/jobs/nope", headers=HEADERS).status_code == 404


def test_health_reports_mode_and_queue_without_the_api_key():
    with client_for() as client:
        body = client.get("/health").json()

    assert body["status"] == "ok"
    assert body["mode"] == "mock"
    assert body["queue"] == {"waiting": 0, "running": 0}
