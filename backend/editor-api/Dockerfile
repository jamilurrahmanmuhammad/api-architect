# Stage 1: Builder
FROM python:3.12-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy all source files (needed for pip install)
COPY pyproject.toml README.md ./
COPY src/ ./src/

# Install Python dependencies
RUN pip install --no-cache-dir --user .

# Stage 2: Runtime
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8765 \
    HOST=0.0.0.0

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN useradd -m -u 1000 appuser

# Copy Python dependencies from builder to user directory
COPY --from=builder /root/.local /home/appuser/.local

# Add local pip to PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Copy application code
COPY . .

# Fix ownership
RUN chown -R appuser:appuser /app /home/appuser/.local
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE ${PORT}

# Run the application
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8765"]
