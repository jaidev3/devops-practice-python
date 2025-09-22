
# # Use Python 3.12 slim image as base
# FROM python:3.12-slim as base
FROM python:3.12-slim

# Install uv (super fast package manager)
RUN pip install --no-cache-dir uv

# Set work directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN uv pip install --system -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
# CMD ["python", "main.py"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
