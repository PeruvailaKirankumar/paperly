#!/usr/bin/env fish

# Paperly Backend Start Script for Fish Shell

echo "Starting Paperly Backend API"
echo "================================"

# Kill any existing Python process running main.py (handles uvicorn reload spawned processes)
pkill -9 -f "python.*main.py" 2>/dev/null
sleep 1

# Double-check and kill any remaining processes on port 8000
set existing_pid (lsof -ti:8000 2>/dev/null)
if test -n "$existing_pid"
    echo "Killing existing process on port 8000 (PID: $existing_pid)..."
    kill -9 $existing_pid
    sleep 1
end

# # Check if virtual environment exists
# if not test -d venv
#     echo "Virtual environment not found. Creating one..."
#     python3 -m venv venv
# end

# # Activate virtual environment
# echo "Activating virtual environment..."
# source venv/bin/activate.fish

# # Install/Update dependencies
# echo "Installing dependencies..."
# pip install -r requirements.txt

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Check if .env exists
if not test -f .env
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your API credentials"
end

# Start the server
echo ""
echo "================================"
echo "Starting FastAPI server..."
echo "API will be available at: http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo "================================"
echo ""

python main.py
