#!/bin/bash

# Paperly Setup Script
echo "🎓 Setting up Paperly Exam Management System..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.11+ first."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

echo "✅ Frontend dependencies installed"

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    cd ..
    exit 1
fi

cd ..
echo "✅ Backend dependencies installed"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOL
# Firebase Configuration (Already set in code, but can be overridden here)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAQvdoPDmtR4ebp9ebQOvJGx7sWrfV3FAg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=paperly-b08fb.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=paperly-b08fb
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=paperly-b08fb.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1035771786744
NEXT_PUBLIC_FIREBASE_APP_ID=1:1035771786744:web:7e6d54287163c86752d20d
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-X4E9Q9PS9Z

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
EOL
    echo "✅ .env.local created"
else
    echo "ℹ️  .env.local already exists, skipping..."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Quick Start Guide:"
echo "  1. Start backend:  cd backend && python start.py"
echo "  2. Start frontend: npm run dev"
echo "  3. Visit:          http://localhost:3000"
echo ""
echo "📖 For more details, see IMPLEMENTATION_GUIDE.md"
echo ""
echo "🎉 Happy coding!"
