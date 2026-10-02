import io

import pytest
from PIL import Image, ImageDraw

from app.images import (
    HEIGHT,
    THUMBNAIL_WIDTH,
    WIDTH,
    InvalidImage,
    decode_sketch,
    encode_outputs,
    prepare_sketch,
    scribble_control,
)
from tests.helpers import sketch_data_uri


def test_transparent_areas_become_white_paper_not_black():
    sketch = prepare_sketch(decode_sketch(sketch_data_uri(transparent=True)))

    assert sketch.getpixel((5, 5)) == (255, 255, 255)


def test_the_sketch_is_fitted_into_the_portrait_frame_without_stretching():
    wide = Image.new("RGB", (200, 100), (255, 0, 0))

    fitted = prepare_sketch(wide)

    assert fitted.size == (WIDTH, HEIGHT)
    # 200x100 scales to 512x256 and is centered, with white paper above and below
    assert fitted.getpixel((WIDTH // 2, HEIGHT // 2)) == (255, 0, 0)
    assert fitted.getpixel((WIDTH // 2, 10)) == (255, 255, 255)
    assert fitted.getpixel((WIDTH // 2, HEIGHT // 2 - 130)) == (255, 255, 255)


def test_the_controlnet_input_is_white_lines_on_black():
    sketch = prepare_sketch(decode_sketch(sketch_data_uri()))

    control = scribble_control(sketch)

    assert control.getpixel((5, 5)) == (0, 0, 0)
    assert control.getpixel((WIDTH // 2, HEIGHT // 2)) == (255, 255, 255)


# Yellow, and a yellow marker over the paper
@pytest.mark.parametrize("color", [(255, 255, 0), (255, 255, 102)])
def test_pale_colors_still_count_as_lines(color):
    sketch = Image.new("RGB", (WIDTH, HEIGHT), "white")
    ImageDraw.Draw(sketch).line([(100, 100), (400, 100)], fill=color, width=6)

    control = scribble_control(sketch)

    assert control.getpixel((250, 100)) == (255, 255, 255)
    assert control.getpixel((250, 300)) == (0, 0, 0)


def test_outputs_are_webp_with_a_384px_thumbnail():
    full, thumbnail = encode_outputs(Image.new("RGB", (WIDTH, HEIGHT), "purple"))

    assert Image.open(io.BytesIO(full)).format == "WEBP"
    thumb = Image.open(io.BytesIO(thumbnail))
    assert thumb.format == "WEBP"
    assert thumb.size == (THUMBNAIL_WIDTH, 576)


@pytest.mark.parametrize("data", ["not base64 at all!", "data:image/png;base64,aGVsbG8="])
def test_unreadable_sketches_are_rejected(data):
    with pytest.raises(InvalidImage):
        decode_sketch(data)
