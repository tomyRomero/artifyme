"""Turning an uploaded sketch into model input, and model output into files to store."""

import base64
import binascii
import io

from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError

# The artboard is a 2:3 portrait, so the model works at that shape too
WIDTH, HEIGHT = 512, 768
THUMBNAIL_WIDTH = 384
PREVIEW_SIZE = (256, 384)
MAX_SKETCH_PIXELS = 4096 * 4096


class InvalidImage(ValueError):
    """The uploaded sketch isn't a readable image."""


def decode_sketch(data: str) -> Image.Image:
    """Reads a base64 image, with or without a data: URI prefix."""
    encoded = data.split(",", 1)[1] if data.startswith("data:") else data
    try:
        raw = base64.b64decode(encoded, validate=True)
        image = Image.open(io.BytesIO(raw))
        if image.width * image.height > MAX_SKETCH_PIXELS:
            raise InvalidImage("The sketch is too large.")
        image.load()
        return image
    except (binascii.Error, UnidentifiedImageError, OSError) as error:
        raise InvalidImage("The sketch must be a base64-encoded PNG, JPEG or WebP image.") from error


def prepare_sketch(image: Image.Image) -> Image.Image:
    """White paper background, fitted (not stretched) into the model's portrait frame."""
    rgba = image.convert("RGBA")
    # Transparent areas become white paper; a plain convert("RGB") would turn them black
    paper = Image.new("RGBA", rgba.size, "white")
    flattened = Image.alpha_composite(paper, rgba).convert("RGB")
    return ImageOps.pad(flattened, (WIDTH, HEIGHT), color="white")


def scribble_control(sketch: Image.Image) -> Image.Image:
    """ControlNet's scribble model expects white lines on black, a few pixels thick."""
    lines = ImageOps.invert(ImageOps.grayscale(sketch))
    # Anything darker than the paper is a line, so pale yellow and see-through marker count too
    lines = lines.point(lambda value: 255 if value > 8 else 0)
    return lines.filter(ImageFilter.MaxFilter(3)).convert("RGB")


def encode_outputs(image: Image.Image) -> tuple[bytes, bytes]:
    """The full image and a gallery thumbnail, both as WebP."""
    full = io.BytesIO()
    image.save(full, format="WEBP", quality=90)

    thumbnail_size = (THUMBNAIL_WIDTH, round(image.height * THUMBNAIL_WIDTH / image.width))
    thumbnail = io.BytesIO()
    image.resize(thumbnail_size, Image.Resampling.LANCZOS).save(thumbnail, format="WEBP", quality=80)

    return full.getvalue(), thumbnail.getvalue()


def encode_preview(image: Image.Image) -> bytes:
    """A small, soft WebP of a step in progress."""
    preview = io.BytesIO()
    image.convert("RGB").resize(PREVIEW_SIZE, Image.Resampling.BICUBIC).save(preview, format="WEBP", quality=60)
    return preview.getvalue()


def encode_outline(sketch: Image.Image) -> bytes:
    """The lines ControlNet followed, as WebP."""
    outline = io.BytesIO()
    scribble_control(sketch).save(outline, format="WEBP", quality=80)
    return outline.getvalue()
