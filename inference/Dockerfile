# The image service. Mock mode by default: small and quick, for running the whole app without the model.
# For the real model, build with EXTRAS=real (several GB of packages) and run with INFERENCE_MODE=real.
# On a Mac the model is much faster run directly with uv, where it can use the Apple GPU (see the README).
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.10.6 /uv /bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
ARG EXTRAS=
# The packages, from the lockfile exactly, before the code, so a code change reuses this layer
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev ${EXTRAS:+--extra "$EXTRAS"}
COPY app ./app
RUN useradd --create-home app
USER app
EXPOSE 8000
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
