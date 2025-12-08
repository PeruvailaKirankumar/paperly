@echo off
REM Paperly Backend Start Script for Windows

echo Starting Paperly Backend API...
echo ================================

REM Check if virtual environment exists
if not exist "venv" (
    echo Virtual environment not found. Creating one...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/Update dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create uploads directory if it doesn't exist
if not exist "uploads" mkdir uploads

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo WARNING: Please update .env with your API credentials
)

REM Start the server
echo.
echo ================================
echo Starting FastAPI server...
echo API will be available at: http://localhost:8000
echo API docs: http://localhost:8000/docs
echo ================================
echo.

python main.py
