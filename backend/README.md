# Paperly Backend API

A FastAPI-based backend for generating educational question papers using RAG (Retrieval Augmented Generation) and LLM technology.

## Features

- 📄 **Document Processing**: Upload and process PDF and PPTX files
- 🧠 **Contextual Embeddings**: Generate enhanced embeddings using GLM-4.5-air
- 🔍 **Vector Search**: FAISS-based semantic search using sentence-transformers
- 📝 **Question Generation**: Generate questions at three difficulty levels (Easy, Medium, Hard)
- 🎯 **RAG-Enhanced**: Uses uploaded documents as context for better question generation
- 🚀 **RESTful API**: Clean FastAPI endpoints for easy integration

## Architecture

### Components

1. **Document Processor**: Extracts text from PDF and PPTX files
2. **Contextual Embedding Service**: Enhances text with semantic analysis using GLM-4.5-air
3. **RAG Service**: Manages vector store and retrieval using FAISS + sentence-transformers
4. **Question Generation Service**: Generates questions using GLM-4.5 LLM

### Models Used

- **LLM**: GLM-4.5 (via Anthropic-compatible API)
- **Contextual Embeddings**: GLM-4.5-air
- **Document Embeddings**: sentence-transformers/all-MiniLM-L6-v2
- **Vector Store**: FAISS

## Installation

### Prerequisites

- Python 3.8+
- pip

### Setup

1. Clone the repository and navigate to backend:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file from example:
```bash
cp .env.example .env
```

5. Update `.env` with your API credentials if needed.

## Usage

### Start the Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Health Check
```
GET /
GET /health
```

### Document Management

#### Upload Document
```
POST /upload-document
Content-Type: multipart/form-data

file: <PDF or PPTX file>
```

#### Upload Multiple Documents
```
POST /upload-documents
Content-Type: multipart/form-data

files: <Multiple PDF or PPTX files>
```

#### List Documents
```
GET /documents
```

#### Delete Document
```
DELETE /documents/{document_id}
```

#### Clear All Documents
```
DELETE /documents
```

### Question Generation

#### Generate Questions
```
POST /generate-questions
Content-Type: application/json

{
  "topic": "Machine Learning",
  "difficulty": "medium",
  "num_questions": 5,
  "question_types": ["mcq", "short_answer"],
  "use_context": true
}
```

**Parameters:**
- `topic` (optional): Specific topic to focus on
- `difficulty`: "easy", "medium", or "hard"
- `num_questions`: Number of questions (1-20)
- `question_types` (optional): Array of question types
- `use_context`: Whether to use uploaded documents

**Question Types:**
- `mcq`: Multiple Choice Questions
- `short_answer`: Short answer questions
- `long_answer`: Long answer questions
- `numerical`: Numerical problems
- `true_false`: True/False questions

### Statistics
```
GET /stats
```

## Example Usage

### Python Client Example

```python
import requests

BASE_URL = "http://localhost:8000"

# Upload a document
with open("lecture_notes.pdf", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/upload-document",
        files={"file": f}
    )
    print(response.json())

# Generate questions
payload = {
    "topic": "Neural Networks",
    "difficulty": "medium",
    "num_questions": 10,
    "use_context": True
}

response = requests.post(
    f"{BASE_URL}/generate-questions",
    json=payload
)

question_paper = response.json()
print(f"Generated {len(question_paper['questions'])} questions")
print(f"Total marks: {question_paper['total_marks']}")
```

### cURL Example

```bash
# Upload document
curl -X POST "http://localhost:8000/upload-document" \
  -F "file=@lecture_notes.pdf"

# Generate questions
curl -X POST "http://localhost:8000/generate-questions" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Data Structures",
    "difficulty": "hard",
    "num_questions": 5,
    "use_context": true
  }'
```

## Configuration

Edit `config.py` or use environment variables:

```python
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
LLM_MODEL=glm-4.5
EMBEDDING_MODEL=glm-4.5-air
MAX_TOKENS=4096
```

## Difficulty Levels

### Easy
- Basic understanding and recall
- Simple definitions
- Straightforward problems

### Medium
- Analysis and comprehension
- Application of concepts
- Multi-step problems

### Hard
- Synthesis and evaluation
- Complex problem-solving
- Critical thinking required

## Project Structure

```
backend/
├── main.py                 # FastAPI application
├── config.py              # Configuration settings
├── models.py              # Pydantic models
├── requirements.txt       # Python dependencies
├── services/
│   ├── __init__.py
│   ├── contextual_embedding.py   # Contextual embedding service
│   ├── rag_service.py            # RAG and vector store
│   └── question_generation.py   # Question generation
└── utils/
    ├── __init__.py
    └── document_processor.py    # Document text extraction
```

## Troubleshooting

### Common Issues

1. **Import errors**: Make sure all dependencies are installed
   ```bash
   pip install -r requirements.txt
   ```

2. **API authentication errors**: Check your API key in `.env`

3. **File upload errors**: Ensure the `uploads/` directory is writable

4. **Memory issues with large PDFs**: Consider splitting documents or increasing chunk size

## Development

### Running Tests
```bash
pytest tests/
```

### Code Formatting
```bash
black .
flake8 .
```

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
