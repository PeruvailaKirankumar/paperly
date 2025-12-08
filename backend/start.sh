#!/bin/bash

# Paperly Backend Start Script

echo "Starting Paperly Backend API..."
echo "================================"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/Update dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your API credentials"
fi

# Start the server
echo ""
echo "================================"
echo "Starting FastAPI server..."
echo "API will be available at: http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo "================================"
echo ""

python main.py
