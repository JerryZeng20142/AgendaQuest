#!/bin/bash
# AgendaQuest Server Startup Script

cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt -q

# Copy .env.example to .env if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit .env file with your configuration before starting the server."
fi

# Create uploads directory
mkdir -p uploads

# Start the server
echo "Starting AgendaQuest server..."
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
