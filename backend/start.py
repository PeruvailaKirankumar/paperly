#!/usr/bin/env python3

import uvicorn
import os
import sys

def main():
    print("🚀 Starting Paperly Backend Server...")
    print(f"📁 Working directory: {os.getcwd()}")

    # Check if static directory exists
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    print(f"📂 Static directory: {static_dir}")
    print(f"📂 Static exists: {os.path.exists(static_dir)}")

    if os.path.exists(static_dir):
        files = os.listdir(static_dir)
        print(f"📄 Static files: {files}")

        js_dir = os.path.join(static_dir, "js")
        if os.path.exists(js_dir):
            js_files = os.listdir(js_dir)
            print(f"📄 JavaScript files: {js_files}")

    print("\n🌐 Starting server at http://localhost:8000")
    print("📚 API docs available at http://localhost:8000/docs")
    print("🏠 Frontend available at http://localhost:8000")
    print("🧪 Test page at http://localhost:8000/test.html")
    print("\n💡 Press Ctrl+C to stop the server")

    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()