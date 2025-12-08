from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from typing import List, Optional
import os
import uuid
import shutil
import json
from datetime import datetime

from config import settings
from models import (
    DocumentUploadResponse,
    QuestionGenerationRequest,
    QuestionPaper,
    EmbeddingResponse,
    HealthResponse,
    DifficultyLevel,
    Subject,
    Unit,
    Lesson,
    SubjectCreate,
    UnitCreate,
    LessonCreate
)
from services.rag_service import RAGService
from services.question_generation import QuestionGenerationService
from services.contextual_embedding import ContextualEmbeddingService
from utils.document_processor import DocumentProcessor
from firebase_config import db

# Initialize FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="API for generating question papers using RAG and LLM"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
print(f"Static directory: {static_dir}")
print(f"Static directory exists: {os.path.exists(static_dir)}")

if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    print("Static files mounted successfully")
else:
    print("Warning: Static directory not found")

# Static file endpoints for debugging
@app.get("/js/app.js")
async def serve_js():
    js_file = os.path.join(static_dir, "js", "app.js")
    if os.path.exists(js_file):
        return FileResponse(js_file, media_type="application/javascript")
    return {"error": "JavaScript file not found"}

@app.get("/css/{file_name}")
async def serve_css(file_name: str):
    css_file = os.path.join(static_dir, "css", file_name)
    if os.path.exists(css_file):
        return FileResponse(css_file, media_type="text/css")
    return {"error": "CSS file not found"}

# Root endpoint to serve the frontend
@app.get("/", response_class=HTMLResponse)
async def read_root():
    static_file = os.path.join(static_dir, "index.html")
    if os.path.exists(static_file):
        return FileResponse(static_file)
    return HTMLResponse("""
    <html>
        <head><title>Paperly API</title></head>
        <body>
            <h1>Paperly Question Generation API</h1>
            <p>API is running. Visit <a href="/docs">/docs</a> for API documentation.</p>
        </body>
    </html>
    """)

# Initialize services
rag_service = RAGService()
question_service = QuestionGenerationService()
contextual_embedding_service = ContextualEmbeddingService()
document_processor = DocumentProcessor()

# Store uploaded documents metadata
uploaded_documents = {}

# Store course structure data
subjects = {}
units = {}
lessons = {}

# Store subject-specific RAG services
subject_rag_services = {}


@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version=settings.api_version
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check."""
    return HealthResponse(
        status="healthy",
        version=settings.api_version
    )


@app.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document (PDF, PPTX) for question generation.
    The document will be processed, embedded, and stored for retrieval.
    """
    # Check file extension
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in document_processor.get_supported_extensions():
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported formats: {document_processor.get_supported_extensions()}"
        )
    
    # Generate unique document ID
    doc_id = str(uuid.uuid4())
    
    # Save uploaded file
    file_path = os.path.join(settings.upload_dir, f"{doc_id}{ext}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Extract text from document
    try:
        text_content = document_processor.extract_text(file_path)
    except Exception as e:
        os.remove(file_path)  # Clean up
        raise HTTPException(status_code=400, detail=f"Error processing document: {str(e)}")
    
    # Generate contextual embeddings (optional enhancement)
    try:
        enriched_text = contextual_embedding_service.generate_contextual_embedding(
            text_content[:5000]  # Limit for API
        )
        # Combine original and enriched text
        final_text = f"{text_content}\n\n--- AI Analysis ---\n{enriched_text}"
    except Exception as e:
        print(f"Warning: Could not generate contextual embedding: {e}")
        final_text = text_content
    
    # Add to RAG system
    try:
        num_chunks = rag_service.add_documents(
            texts=[final_text],
            metadatas=[{
                "document_id": doc_id,
                "filename": file.filename,
                "file_type": ext
            }]
        )
    except Exception as e:
        os.remove(file_path)  # Clean up
        raise HTTPException(status_code=500, detail=f"Error indexing document: {str(e)}")
    
    # Store metadata
    uploaded_documents[doc_id] = {
        "filename": file.filename,
        "file_path": file_path,
        "file_type": ext,
        "num_chunks": num_chunks
    }
    
    return DocumentUploadResponse(
        document_id=doc_id,
        filename=file.filename,
        file_type=ext,
        num_chunks=num_chunks,
        message="Document uploaded and indexed successfully"
    )


@app.post("/upload-documents", response_model=List[DocumentUploadResponse])
async def upload_multiple_documents(files: List[UploadFile] = File(...)):
    """Upload multiple documents at once."""
    results = []
    for file in files:
        try:
            result = await upload_document(file)
            results.append(result)
        except HTTPException as e:
            # Continue with other files but log error
            print(f"Error uploading {file.filename}: {e.detail}")
    
    if not results:
        raise HTTPException(status_code=400, detail="No documents were successfully uploaded")
    
    return results


@app.post("/process-rag/{subject_id}")
async def process_rag_for_subject(subject_id: str, files: List[UploadFile] = File(...)):
    """Process and save RAG data for a specific subject."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Create subject-specific RAG service
    subject_rag = RAGService()
    
    all_texts = []
    all_metadatas = []
    processed_files = []
    
    for file in files:
        # Check file extension
        _, ext = os.path.splitext(file.filename)
        if ext.lower() not in document_processor.get_supported_extensions():
            continue
        
        # Generate unique document ID
        doc_id = str(uuid.uuid4())
        
        # Save uploaded file
        file_path = os.path.join(settings.upload_dir, f"{subject_id}_{doc_id}{ext}")
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            print(f"Error saving file {file.filename}: {str(e)}")
            continue
        
        # Extract text from document
        try:
            text_content = document_processor.extract_text(file_path)
            all_texts.append(text_content)
            all_metadatas.append({
                "document_id": doc_id,
                "filename": file.filename,
                "file_type": ext,
                "subject_id": subject_id
            })
            processed_files.append(file.filename)
        except Exception as e:
            print(f"Error processing {file.filename}: {str(e)}")
            os.remove(file_path)
            continue
    
    if not all_texts:
        raise HTTPException(status_code=400, detail="No valid documents could be processed")
    
    # Add documents to RAG system
    try:
        num_chunks = subject_rag.add_documents(texts=all_texts, metadatas=all_metadatas)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error indexing documents: {str(e)}")
    
    # Save RAG data to disk
    rag_path = os.path.join(settings.rag_data_dir, subject_id)
    try:
        subject_rag.save_vector_store(rag_path)
        subject_rag_services[subject_id] = subject_rag
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving RAG data: {str(e)}")
    
    return {
        "message": "RAG data processed and saved successfully",
        "subject_id": subject_id,
        "files_processed": processed_files,
        "num_chunks": num_chunks,
        "rag_path": rag_path
    }


@app.get("/rag-status/{subject_id}")
async def get_rag_status(subject_id: str):
    """Check if RAG data exists for a subject."""
    rag_path = os.path.join(settings.rag_data_dir, subject_id)
    exists = os.path.exists(rag_path) and os.path.exists(os.path.join(rag_path, "index.faiss"))
    
    stats = None
    if exists:
        # Load if not already loaded
        if subject_id not in subject_rag_services:
            subject_rag = RAGService()
            if subject_rag.load_vector_store(rag_path):
                subject_rag_services[subject_id] = subject_rag
                stats = subject_rag.get_stats()
        else:
            stats = subject_rag_services[subject_id].get_stats()
    
    return {
        "subject_id": subject_id,
        "rag_exists": exists,
        "rag_path": rag_path if exists else None,
        "stats": stats
    }


@app.get("/rag-documents/{subject_id}")
async def get_rag_documents(subject_id: str):
    """Get all documents stored in RAG for a subject."""
    rag_path = os.path.join(settings.rag_data_dir, subject_id)
    
    if not os.path.exists(rag_path):
        return {
            "subject_id": subject_id,
            "documents": [],
            "total_documents": 0
        }
    
    # Load RAG service if not already loaded
    if subject_id not in subject_rag_services:
        subject_rag = RAGService()
        if subject_rag.load_vector_store(rag_path):
            subject_rag_services[subject_id] = subject_rag
        else:
            return {
                "subject_id": subject_id,
                "documents": [],
                "total_documents": 0
            }
    
    # Get all documents
    rag_service = subject_rag_services[subject_id]
    all_docs = rag_service.get_all_documents()
    
    # Extract unique documents with metadata
    doc_map = {}
    for doc in all_docs:
        doc_id = doc.metadata.get('document_id', 'unknown')
        if doc_id not in doc_map:
            doc_map[doc_id] = {
                'document_id': doc_id,
                'filename': doc.metadata.get('filename', 'Unknown'),
                'file_type': doc.metadata.get('file_type', 'unknown'),
                'subject_id': doc.metadata.get('subject_id', subject_id),
                'chunk_count': 0,
                'preview': ''
            }
        doc_map[doc_id]['chunk_count'] += 1
        if not doc_map[doc_id]['preview']:
            doc_map[doc_id]['preview'] = doc.page_content[:200] + '...' if len(doc.page_content) > 200 else doc.page_content
    
    documents = list(doc_map.values())
    
    return {
        "subject_id": subject_id,
        "documents": documents,
        "total_documents": len(documents),
        "total_chunks": len(all_docs)
    }


@app.post("/organize-materials/{subject_id}")
async def organize_materials_ai(subject_id: str):
    """Use AI to automatically organize uploaded materials into units and lessons."""
    
    # Get RAG documents
    rag_path = os.path.join(settings.rag_data_dir, subject_id)
    if not os.path.exists(rag_path):
        raise HTTPException(status_code=404, detail="No RAG data found for this subject")
    
    # Load RAG service
    if subject_id not in subject_rag_services:
        subject_rag = RAGService()
        if not subject_rag.load_vector_store(rag_path):
            raise HTTPException(status_code=500, detail="Failed to load RAG data")
        subject_rag_services[subject_id] = subject_rag
    
    rag_service = subject_rag_services[subject_id]
    all_docs = rag_service.get_all_documents()
    
    # Prepare document summaries for AI
    doc_summaries = []
    doc_map = {}
    for doc in all_docs:
        doc_id = doc.metadata.get('document_id', 'unknown')
        if doc_id not in doc_map:
            filename = doc.metadata.get('filename', 'Unknown')
            doc_map[doc_id] = {
                'filename': filename,
                'content': []
            }
        doc_map[doc_id]['content'].append(doc.page_content)
    
    # Compile full content per document
    for doc_id, doc_data in doc_map.items():
        full_content = ' '.join(doc_data['content'])
        # Take first 3000 chars as summary
        summary = full_content[:3000] if len(full_content) > 3000 else full_content
        doc_summaries.append(f"**{doc_data['filename']}**:\n{summary}\n")
    
    # Create AI prompt
    doc_content = '\n'.join(doc_summaries)
    json_format = """{
  "units": [
    {
      "name": "Unit Name",
      "order": 1,
      "description": "Brief description",
      "lessons": [
        {
          "name": "Lesson Name",
          "order": 1,
          "description": "Brief description",
          "source_documents": ["filename1.pdf", "filename2.pptx"],
          "learning_objectives": ["Objective 1", "Objective 2"]
        }
      ]
    }
  ]
}"""
    
    prompt = f"""You are an educational content organizer. Analyze the following course materials and organize them into a structured curriculum.

Course Materials:
{doc_content}

Your task:
1. Carefully read and understand the content of each document
2. Identify major topics and group them into 3-6 units (major subject areas)
3. Within each unit, organize materials into 2-5 sequential lessons
4. Create meaningful unit and lesson names based on the actual content (not generic names)
5. Assign documents to lessons based on their content relevance
6. Provide brief, informative descriptions
7. Include 2-4 learning objectives per lesson

Guidelines:
- Unit names should represent broad topics (e.g., "Data Structures", "Web Architecture")
- Lesson names should be specific topics within units (e.g., "Linked Lists and Arrays", "RESTful API Design")
- Order lessons logically (basic concepts before advanced)
- Ensure every document is assigned to at least one lesson

Return ONLY a JSON object in this exact format (no markdown, no code blocks, no explanatory text):
{json_format}"""
    
    # Call AI service directly using Anthropic client
    try:
        response = question_service.client.messages.create(
            model=question_service.model,
            max_tokens=4096,
            temperature=0.3,  # Lower temp for more structured output
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        # Extract response text
        response_text = response.content[0].text if response.content else "{}"
        
        # Parse JSON response
        # Remove markdown code blocks if present
        response_text = response_text.strip()
        if response_text.startswith('```'):
            response_text = response_text.split('\n', 1)[1]
            response_text = response_text.rsplit('```', 1)[0]
        
        organization = json.loads(response_text)
        
        return {
            "subject_id": subject_id,
            "organization": organization,
            "message": "Materials organized successfully"
        }
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "rate limit" in error_msg.lower() or "insufficient balance" in error_msg.lower():
            raise HTTPException(
                status_code=503, 
                detail="AI service temporarily unavailable. Please check your API credits or try again later."
            )
        raise HTTPException(status_code=500, detail=f"AI organization failed: {error_msg}")


@app.delete("/rag/{subject_id}")
async def delete_rag_data(subject_id: str):
    """Delete RAG data for a subject."""
    rag_path = os.path.join(settings.rag_data_dir, subject_id)
    
    if not os.path.exists(rag_path):
        raise HTTPException(status_code=404, detail="RAG data not found for this subject")
    
    try:
        # Remove from memory
        if subject_id in subject_rag_services:
            del subject_rag_services[subject_id]
        
        # Remove from disk
        shutil.rmtree(rag_path)
        
        return {"message": "RAG data deleted successfully", "subject_id": subject_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting RAG data: {str(e)}")


@app.post("/generate-questions", response_model=QuestionPaper)
async def generate_questions(request: QuestionGenerationRequest):
    """
    Generate a question paper based on the request parameters.
    If use_context is True, uses subject-specific RAG data.
    """
    context_documents = []

    if request.use_context:
        # Use subject-specific RAG service if available
        subject_rag = None
        
        # Try to get subject_id from request (add it to the model if needed)
        subject_id = getattr(request, 'subject_id', None)
        
        if subject_id:
            # Load subject-specific RAG if not already loaded
            if subject_id not in subject_rag_services:
                rag_path = os.path.join(settings.rag_data_dir, subject_id)
                if os.path.exists(rag_path):
                    temp_rag = RAGService()
                    if temp_rag.load_vector_store(rag_path):
                        subject_rag_services[subject_id] = temp_rag
                        subject_rag = temp_rag
            else:
                subject_rag = subject_rag_services[subject_id]
        
        # Fall back to global RAG service if no subject-specific RAG
        if subject_rag is None:
            subject_rag = rag_service
        
        # Retrieve relevant context
        query = request.topic or "Generate educational questions from the study materials"
        context_documents = subject_rag.retrieve_context(
            query=query,
            k=settings.retrieval_k
        )

        if not context_documents:
            raise HTTPException(
                status_code=400,
                detail="No RAG data available for this subject. Please process documents first or set use_context to False."
            )

    # Build enhanced prompt with Bloom's taxonomy and question format
    prompt_parts = []

    # Basic information
    prompt_parts.append(f"Generate a question paper for: {request.topic or 'General subject'}")
    if request.subject:
        prompt_parts.append(f"Subject: {request.subject}")
    if request.difficulty:
        prompt_parts.append(f"Difficulty level: {request.difficulty}")

    # Question format specification
    if request.question_format:
        format_description = []
        for q_type, format_info in request.question_format.items():
            if format_info.count > 0:
                type_name = q_type.replace('_', ' ').title()
                format_description.append(
                    f"{format_info.count} {type_name} questions ({format_info.marks} marks each)"
                )

        if format_description:
            prompt_parts.append("Question format: " + "; ".join(format_description))

    # Bloom's taxonomy distribution
    if request.bloom_distribution:
        bloom_parts = []
        for level, percentage in request.bloom_distribution.items():
            if percentage > 0:
                bloom_parts.append(f"{level} ({percentage}%)")

        if bloom_parts:
            prompt_parts.append("Bloom's taxonomy distribution: " + "; ".join(bloom_parts))

    # Question types with format
    if request.question_format:
        format_parts = []
        for qtype, fmt in request.question_format.items():
            type_name = qtype.replace('_', ' ')
            format_parts.append(f"{fmt.count} x {type_name} ({fmt.marks} marks each)")
        prompt_parts.append("Question distribution: " + ", ".join(format_parts))
    elif request.question_types:
        type_names = [t.replace('_', ' ').replace('very short', 'very short') for t in request.question_types]
        prompt_parts.append("Question types: " + ", ".join(type_names))

    # Instructions
    if request.instructions:
        prompt_parts.append(f"Additional instructions: {request.instructions}")

    # Add context information if available
    if context_documents:
        context_text = "\n\n--- Context from uploaded documents ---\n"
        for i, doc in enumerate(context_documents[:3], 1):  # Use top 3 documents
            context_text += f"\nDocument {i}:\n{doc.page_content[:1000]}...\n"
        prompt_parts.append(context_text)

    # Build question format instructions
    format_instructions = ""
    if request.question_format:
        format_lines = []
        question_num = 1
        for qtype, fmt in request.question_format.items():
            type_name = qtype.replace('_', ' ')
            for i in range(fmt.count):
                format_lines.append(f"  Question {question_num}: {type_name}, {fmt.marks} marks")
                question_num += 1
        format_instructions = "\n".join(format_lines)

    # Add detailed JSON formatting instructions
    prompt_parts.append("\n\nIMPORTANT INSTRUCTIONS:")
    prompt_parts.append(f"1. Generate EXACTLY {request.num_questions} questions")
    prompt_parts.append("2. Return ONLY a valid JSON array - no other text")
    prompt_parts.append("3. Use question types: " + ", ".join(request.question_types or ["short_answer"]))
    if format_instructions:
        prompt_parts.append("4. Follow this EXACT format:\n" + format_instructions)
    prompt_parts.append("5. Each question must include all required fields")
    prompt_parts.append("6. For MCQ and true_false questions, ALWAYS include an 'options' array and 'correct_answer' (index 0-based)")
    prompt_parts.append("""
Expected JSON format:
[
  {
    "question_number": 1,
    "question_text": "Clear, well-formed question text",
    "question_type": "mcq",
    "difficulty": "medium",
    "marks": 2,
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "sample_answer": "Option A is correct because..."
  },
  {
    "question_number": 2,
    "question_text": "Is the sky blue?",
    "question_type": "true_false",
    "difficulty": "easy",
    "marks": 1,
    "options": ["True", "False"],
    "correct_answer": 0,
    "sample_answer": "True"
  },
  {
    "question_number": 3,
    "question_text": "Explain the concept...",
    "question_type": "short_answer",
    "difficulty": "medium",
    "marks": 5,
    "sample_answer": "Answer details..."
  }
]""")
    prompt_parts.append(f"CRITICAL: Generate exactly {request.num_questions} questions in valid JSON format.")

    full_prompt = "\n".join(prompt_parts)

    # Generate questions
    try:
        question_paper = question_service.generate_questions(
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            question_types=request.question_types,
            context_documents=context_documents,
            custom_prompt=full_prompt
        )

        # Set the title and subject in the response
        if request.subject:
            question_paper.title = f"{request.subject} Question Paper"
        elif request.topic:
            question_paper.title = f"Question Paper: {request.topic}"

        # Calculate total marks based on format if provided
        if request.question_format:
            total_marks = sum(
                format_info.count * format_info.marks
                for format_info in request.question_format.values()
            )
            question_paper.total_marks = total_marks

        # Save to Firebase for persistence (JSON only, PDF generated on-demand in frontend)
        paper_id = None
        if db:
            try:
                paper_id = str(uuid.uuid4())
                paper_data = {
                    'id': paper_id,
                    'title': question_paper.title,
                    'subject': question_paper.subject,
                    'difficulty': question_paper.difficulty.value,
                    'total_marks': question_paper.total_marks,
                    'questions': [q.model_dump() for q in question_paper.questions],
                    'instructions': question_paper.instructions,
                    'generated_at': question_paper.generated_at,
                    'password': None,  # Password set on first view/download
                }
                db.collection('generated_papers').document(paper_id).set(paper_data)
                print(f"✓ Paper saved to Firestore with ID: {paper_id}")
                question_paper.id = paper_id  # Set the ID for frontend use
            except Exception as db_error:
                print(f"⚠ Failed to save paper to Firestore: {str(db_error)}")

        return question_paper

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating questions: {str(e)}"
        )


@app.get("/generated-papers")
async def get_generated_papers():
    """Get all generated papers from Firebase."""
    if not db:
        return {"papers": [], "total": 0, "message": "Firebase not configured"}
    
    try:
        papers_ref = db.collection('generated_papers').order_by('generated_at', direction='DESCENDING').limit(50)
        docs = papers_ref.stream()
        papers = []
        for doc in docs:
            paper_data = doc.to_dict()
            papers.append(paper_data)
        return {"papers": papers, "total": len(papers)}
    except Exception as e:
        print(f"Error fetching papers: {e}")
        return {"papers": [], "total": 0, "error": str(e)}


@app.get("/papers/{paper_id}")
async def get_paper(paper_id: str):
    """Get a specific paper by ID."""
    if not db:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    
    try:
        doc = db.collection('generated_papers').document(paper_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Paper not found")
        return doc.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/papers/{paper_id}/password")
async def set_paper_password(paper_id: str, request: Request):
    """Set password for a paper (first time only)."""
    if not db:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    
    try:
        body = await request.json()
        password = body.get('password')
        
        if not password:
            raise HTTPException(status_code=400, detail="Password required")
        
        doc_ref = db.collection('generated_papers').document(paper_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        paper_data = doc.to_dict()
        
        # Only set password if not already set
        if paper_data.get('password'):
            return {"message": "Password already set", "password": paper_data['password']}
        
        doc_ref.update({'password': password})
        return {"message": "Password set successfully", "password": password}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/papers/{paper_id}/pdf")
async def download_paper_pdf(paper_id: str):
    """Generate and download encrypted PDF for a paper."""
    from fastapi.responses import Response
    from services.pdf_service import PDFService
    import secrets
    import string
    
    if not db:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    
    try:
        doc_ref = db.collection('generated_papers').document(paper_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        paper_data = doc.to_dict()
        
        # Get or generate password
        password = paper_data.get('password')
        is_first_access = not password
        
        if not password:
            # Generate password on first access
            alphabet = string.ascii_letters + string.digits
            password = ''.join(secrets.choice(alphabet) for _ in range(12))
            doc_ref.update({'password': password})
        
        # Generate encrypted PDF
        pdf_service = PDFService()
        pdf_bytes = pdf_service.generate_pdf_bytes(paper_data, password)
        
        # Return PDF with password in header (only on first access)
        headers = {
            "Content-Disposition": f"attachment; filename={paper_data.get('title', 'paper').replace(' ', '_')}.pdf"
        }
        if is_first_access:
            headers["X-PDF-Password"] = password
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers=headers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents", response_model=List[dict])
async def list_documents():
    """List all uploaded documents."""
    return [
        {
            "document_id": doc_id,
            "filename": info["filename"],
            "file_type": info["file_type"],
            "num_chunks": info["num_chunks"]
        }
        for doc_id, info in uploaded_documents.items()
    ]


@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a specific document."""
    if document_id not in uploaded_documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove file
    file_path = uploaded_documents[document_id]["file_path"]
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from metadata
    del uploaded_documents[document_id]
    
    return {"message": "Document deleted successfully"}


@app.delete("/documents")
async def clear_all_documents():
    """Clear all uploaded documents and reset the vector store."""
    # Remove all files
    for doc_id, info in uploaded_documents.items():
        file_path = info["file_path"]
        if os.path.exists(file_path):
            os.remove(file_path)
    
    # Clear metadata
    uploaded_documents.clear()
    
    # Clear RAG system
    rag_service.clear_documents()
    
    return {"message": "All documents cleared successfully"}


@app.get("/stats")
async def get_stats():
    """Get statistics about the system."""
    rag_stats = rag_service.get_stats()
    
    return {
        "num_uploaded_documents": len(uploaded_documents),
        "num_indexed_chunks": rag_stats["num_documents"],
        "has_vector_store": rag_stats["has_vector_store"],
        "supported_formats": document_processor.get_supported_extensions()
    }


# Course Structure Management Endpoints

@app.get("/subjects", response_model=List[Subject])
async def get_subjects():
    """Get all subjects."""
    if db:
        try:
            # Fetch from Firestore
            subjects_ref = db.collection('subjects')
            docs = subjects_ref.stream()
            subjects_list = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                subjects_list.append(Subject(**data))
            return subjects_list
        except Exception as e:
            print(f"Error fetching from Firestore: {e}")
            return list(subjects.values())
    return list(subjects.values())


@app.post("/subjects", response_model=Subject)
async def create_subject(subject_data: SubjectCreate):
    """Create a new subject."""
    subject_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    subject = Subject(
        id=subject_id,
        name=subject_data.name,
        code=subject_data.code,
        description=subject_data.description,
        created_at=now,
        updated_at=now
    )

    # Save to in-memory dict (fallback)
    subjects[subject_id] = subject
    
    # Save to Firestore
    if db:
        try:
            db.collection('subjects').document(subject_id).set({
                'name': subject.name,
                'code': subject.code,
                'description': subject.description,
                'created_at': subject.created_at,
                'updated_at': subject.updated_at
            })
            print(f"✓ Subject '{subject.name}' saved to Firestore")
        except Exception as e:
            print(f"⚠ Failed to save to Firestore: {e}")

    return subject


@app.get("/subjects/{subject_id}/units", response_model=List[Unit])
async def get_units(subject_id: str):
    """Get all units for a subject."""
    if db:
        try:
            units_ref = db.collection('units').where('subject_id', '==', subject_id)
            docs = units_ref.stream()
            units_list = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                units_list.append(Unit(**data))
            return units_list
        except Exception as e:
            print(f"Error fetching units from Firestore: {e}")
    return [unit for unit in units.values() if unit.subject_id == subject_id]


@app.post("/units", response_model=Unit)
async def create_unit(unit_data: UnitCreate):
    """Create a new unit."""
    if unit_data.subject_id not in subjects:
        if db:
            try:
                subj_doc = db.collection('subjects').document(unit_data.subject_id).get()
                if not subj_doc.exists:
                    raise HTTPException(status_code=404, detail="Subject not found")
            except HTTPException:
                raise
            except Exception as e:
                print(f"⚠ Subject lookup failed in Firestore: {e}")
        else:
            raise HTTPException(status_code=404, detail="Subject not found")

    unit_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    unit = Unit(
        id=unit_id,
        subject_id=unit_data.subject_id,
        name=unit_data.name,
        description=unit_data.description,
        order=unit_data.order,
        created_at=now,
        updated_at=now
    )

    units[unit_id] = unit

    if db:
        try:
            db.collection('units').document(unit_id).set({
                'subject_id': unit.subject_id,
                'name': unit.name,
                'description': unit.description,
                'order': unit.order,
                'created_at': unit.created_at,
                'updated_at': unit.updated_at
            })
            print(f"✓ Unit '{unit.name}' saved to Firestore")
        except Exception as e:
            print(f"⚠ Failed to save unit to Firestore: {e}")

    return unit


@app.get("/units/{unit_id}/lessons", response_model=List[Lesson])
async def get_lessons(unit_id: str):
    """Get all lessons for a unit."""
    if db:
        try:
            lessons_ref = db.collection('lessons').where('unit_id', '==', unit_id)
            docs = lessons_ref.stream()
            lessons_list = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                lessons_list.append(Lesson(**data))
            return lessons_list
        except Exception as e:
            print(f"Error fetching lessons from Firestore: {e}")
    return [lesson for lesson in lessons.values() if lesson.unit_id == unit_id]


@app.post("/lessons", response_model=Lesson)
async def create_lesson(lesson_data: LessonCreate):
    """Create a new lesson."""
    if lesson_data.unit_id not in units:
        if db:
            try:
                unit_doc = db.collection('units').document(lesson_data.unit_id).get()
                if not unit_doc.exists:
                    raise HTTPException(status_code=404, detail="Unit not found")
            except HTTPException:
                raise
            except Exception as e:
                print(f"⚠ Unit lookup failed in Firestore: {e}")
        else:
            raise HTTPException(status_code=404, detail="Unit not found")

    lesson_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    lesson = Lesson(
        id=lesson_id,
        unit_id=lesson_data.unit_id,
        name=lesson_data.name,
        description=lesson_data.description,
        order=lesson_data.order,
        learning_objectives=lesson_data.learning_objectives,
        created_at=now,
        updated_at=now
    )

    lessons[lesson_id] = lesson

    if db:
        try:
            db.collection('lessons').document(lesson_id).set({
                'unit_id': lesson.unit_id,
                'name': lesson.name,
                'description': lesson.description,
                'order': lesson.order,
                'learning_objectives': lesson.learning_objectives,
                'created_at': lesson.created_at,
                'updated_at': lesson.updated_at
            })
            print(f"✓ Lesson '{lesson.name}' saved to Firestore")
        except Exception as e:
            print(f"⚠ Failed to save lesson to Firestore: {e}")

    return lesson


@app.get("/course-structure", response_model=dict)
async def get_full_course_structure():
    """Get the complete course structure with subjects, units, and lessons."""
    structure = {}

    if db:
        try:
            # Fetch subjects
            subjects_ref = db.collection('subjects')
            subject_docs = subjects_ref.stream()
            for subj_doc in subject_docs:
                subj_data = subj_doc.to_dict()
                subject_id = subj_doc.id

                # Fetch units for subject
                unit_docs = db.collection('units').where('subject_id', '==', subject_id).stream()
                units_with_lessons = []
                for unit_doc in unit_docs:
                    unit_data = unit_doc.to_dict()
                    unit_id = unit_doc.id

                    # Fetch lessons for unit
                    lesson_docs = db.collection('lessons').where('unit_id', '==', unit_id).stream()
                    unit_lessons = []
                    for lesson_doc in lesson_docs:
                        lesson_data = lesson_doc.to_dict()
                        lesson_data['id'] = lesson_doc.id
                        unit_lessons.append(Lesson(**lesson_data))

                    units_with_lessons.append({
                        "id": unit_id,
                        "name": unit_data.get('name'),
                        "description": unit_data.get('description'),
                        "order": unit_data.get('order', 1),
                        "lessons": unit_lessons
                    })

                structure[subject_id] = {
                    "id": subject_id,
                    "name": subj_data.get('name'),
                    "code": subj_data.get('code'),
                    "description": subj_data.get('description'),
                    "units": units_with_lessons
                }

            return structure
        except Exception as e:
            print(f"⚠ Failed to fetch course structure from Firestore, falling back to in-memory: {e}")

    # Fallback to in-memory store
    for subject in subjects.values():
        subject_units = [unit for unit in units.values() if unit.subject_id == subject.id]

        units_with_lessons = []
        for unit in subject_units:
            unit_lessons = [lesson for lesson in lessons.values() if lesson.unit_id == unit.id]
            units_with_lessons.append({
                "id": unit.id,
                "name": unit.name,
                "description": unit.description,
                "order": unit.order,
                "lessons": unit_lessons
            })

        structure[subject.id] = {
            "id": subject.id,
            "name": subject.name,
            "code": subject.code,
            "description": subject.description,
            "units": units_with_lessons
        }

    return structure


@app.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str):
    """Delete a subject and all its units and lessons."""
    if subject_id not in subjects and db is None:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Delete from in-memory dict
    if subject_id in subjects:
        del subjects[subject_id]

    # Delete from Firestore
    if db:
        try:
            db.collection('subjects').document(subject_id).delete()
            print(f"✓ Subject {subject_id} deleted from Firestore")
        except Exception as e:
            print(f"⚠ Failed to delete from Firestore: {e}")

    # Delete all units for this subject
    units_to_delete = [unit_id for unit_id, unit in units.items() if unit.subject_id == subject_id]
    for unit_id in units_to_delete:
        del units[unit_id]

        # Delete all lessons for this unit
        lessons_to_delete = [lesson_id for lesson_id, lesson in lessons.items() if lesson.unit_id == unit_id]
        for lesson_id in lessons_to_delete:
            del lessons[lesson_id]

            if db:
                try:
                    db.collection('lessons').document(lesson_id).delete()
                except Exception as e:
                    print(f"⚠ Failed to delete lesson from Firestore: {e}")

        if db:
            try:
                db.collection('units').document(unit_id).delete()
            except Exception as e:
                print(f"⚠ Failed to delete unit from Firestore: {e}")

    return {"message": "Subject and all related units and lessons deleted successfully"}


@app.delete("/units/{unit_id}")
async def delete_unit(unit_id: str):
    """Delete a unit and all its lessons."""
    if unit_id not in units:
        if db:
            try:
                unit_doc = db.collection('units').document(unit_id).get()
                if not unit_doc.exists:
                    raise HTTPException(status_code=404, detail="Unit not found")
            except HTTPException:
                raise
            except Exception as e:
                print(f"⚠ Unit lookup failed in Firestore: {e}")
        else:
            raise HTTPException(status_code=404, detail="Unit not found")

    if db:
        try:
            db.collection('units').document(unit_id).delete()
        except Exception as e:
            print(f"⚠ Failed to delete unit from Firestore: {e}")

    # Delete unit
    del units[unit_id]

    # Delete all lessons for this unit
    lessons_to_delete = [lesson_id for lesson_id, lesson in lessons.items() if lesson.unit_id == unit_id]
    for lesson_id in lessons_to_delete:
        del lessons[lesson_id]

        if db:
            try:
                db.collection('lessons').document(lesson_id).delete()
            except Exception as e:
                print(f"⚠ Failed to delete lesson from Firestore: {e}")

    return {"message": "Unit and all related lessons deleted successfully"}


@app.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str):
    """Delete a lesson."""
    if lesson_id not in lessons:
        if db:
            try:
                lesson_doc = db.collection('lessons').document(lesson_id).get()
                if not lesson_doc.exists:
                    raise HTTPException(status_code=404, detail="Lesson not found")
            except HTTPException:
                raise
            except Exception as e:
                print(f"⚠ Lesson lookup failed in Firestore: {e}")
        else:
            raise HTTPException(status_code=404, detail="Lesson not found")

    if db:
        try:
            db.collection('lessons').document(lesson_id).delete()
        except Exception as e:
            print(f"⚠ Failed to delete lesson from Firestore: {e}")

    del lessons[lesson_id]
    return {"message": "Lesson deleted successfully"}


# ==================== AI Evaluation Endpoints ====================

from models import (
    Answer as AnswerModel,
    QuestionEvaluation,
    SubmissionEvaluationRequest,
    SubmissionEvaluationResponse,
    ExamAnalytics,
    StudentAnalytics,
    OverviewAnalytics
)


@app.post("/evaluate-submission", response_model=SubmissionEvaluationResponse)
async def evaluate_submission(request: SubmissionEvaluationRequest):
    """
    Evaluate a student's exam submission using AI.
    - MCQ and true_false are auto-graded
    - short_answer and long_answer are evaluated by AI
    """
    if not db:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    
    try:
        # Fetch exam data
        exam_doc = db.collection('exams').document(request.exam_id).get()
        if not exam_doc.exists:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        exam = exam_doc.to_dict()
        
        # For mock exams, questions are dynamically generated per student
        # They're stored in the submission document as generatedQuestions
        submission_doc = db.collection('submissions').document(request.submission_id).get()
        if submission_doc.exists:
            submission_data = submission_doc.to_dict()
            # Use generatedQuestions from submission if available (for mock exams)
            questions = submission_data.get('generatedQuestions', []) or exam.get('questions', [])
            print(f"📝 Using {len(questions)} questions from {'submission' if submission_data.get('generatedQuestions') else 'exam'}")
        else:
            questions = exam.get('questions', [])
            print(f"📝 Using {len(questions)} questions from exam (submission not found)")
        
        if not questions:
            raise HTTPException(status_code=400, detail="No questions found for evaluation. Make sure the exam has questions or the submission has generatedQuestions.")
        
        # Build question lookup
        question_map = {}
        for q in questions:
            q_id = q.get('id') or q.get('question_id', '')
            question_map[q_id] = q
        
        print(f"📊 Question IDs: {list(question_map.keys())}")
        print(f"📊 Answer IDs: {[a.question_id for a in request.answers]}")
        
        # Evaluate each answer
        question_evaluations = []
        total_score = 0.0
        max_score = 0
        
        for answer in request.answers:
            q_id = answer.question_id
            q = question_map.get(q_id)
            
            if not q:
                continue
            
            q_type = q.get('type', 'short_answer')
            q_text = q.get('text', '')
            q_marks = q.get('marks', 0)
            correct_answer = q.get('correctAnswer')
            
            max_score += q_marks
            awarded_marks = 0.0
            feedback = ""
            is_correct = None
            
            # Auto-grade MCQ and true_false
            if q_type in ['mcq', 'true_false']:
                try:
                    student_answer = int(answer.answer) if answer.answer else -1
                    if correct_answer is not None and student_answer == int(correct_answer):
                        awarded_marks = q_marks
                        is_correct = True
                        feedback = "Correct!"
                    else:
                        awarded_marks = 0
                        is_correct = False
                        feedback = f"Incorrect. The correct answer was option {int(correct_answer) + 1}."
                except:
                    awarded_marks = 0
                    is_correct = False
                    feedback = "Invalid answer format."
            
            # AI-grade short_answer and long_answer
            elif q_type in ['short_answer', 'long_answer']:
                try:
                    eval_prompt = f"""You are an expert exam evaluator. Evaluate the following student answer.

Question ({q_marks} marks): {q_text}

Student's Answer: {answer.answer or "(No answer provided)"}

Instructions:
1. Evaluate the answer for correctness, completeness, and clarity
2. Award marks out of {q_marks} (can be partial marks like 3.5)
3. Provide brief, constructive feedback

Return your evaluation in this exact JSON format:
{{"marks": <number>, "feedback": "<brief feedback>"}}

Be fair but strict. Award full marks only for complete, accurate answers."""

                    response = question_service.client.messages.create(
                        model=question_service.model,
                        max_tokens=500,
                        temperature=0.3,
                        messages=[{"role": "user", "content": eval_prompt}]
                    )
                    
                    eval_text = response.content[0].text.strip()
                    
                    # Parse JSON response
                    if eval_text.startswith('```'):
                        eval_text = eval_text.split('\n', 1)[1].rsplit('```', 1)[0]
                    
                    eval_result = json.loads(eval_text)
                    awarded_marks = min(float(eval_result.get('marks', 0)), q_marks)
                    feedback = eval_result.get('feedback', 'Evaluated by AI.')
                    
                except Exception as e:
                    print(f"⚠ AI evaluation error for question {q_id}: {e}")
                    awarded_marks = 0
                    feedback = "Could not evaluate. Please review manually."
            
            total_score += awarded_marks
            
            question_evaluations.append(QuestionEvaluation(
                question_id=q_id,
                question_text=q_text,
                question_type=q_type,
                max_marks=q_marks,
                awarded_marks=awarded_marks,
                feedback=feedback,
                is_correct=is_correct
            ))
        
        # Calculate percentage
        percentage = (total_score / max_score * 100) if max_score > 0 else 0
        
        # Generate detailed overall feedback
        # Analyze performance by question type
        type_performance = {}
        for q_eval in question_evaluations:
            q_type = q_eval.question_type
            if q_type not in type_performance:
                type_performance[q_type] = {'total': 0, 'max': 0, 'count': 0}
            type_performance[q_type]['total'] += q_eval.awarded_marks
            type_performance[q_type]['max'] += q_eval.max_marks
            type_performance[q_type]['count'] += 1
        
        # Build detailed feedback
        feedback_parts = []
        
        # Overall grade
        if percentage >= 90:
            feedback_parts.append(f"🏆 Outstanding Performance! You scored {percentage:.1f}% ({total_score}/{max_score} marks).")
            feedback_parts.append("You have demonstrated exceptional understanding of the subject matter.")
        elif percentage >= 80:
            feedback_parts.append(f"🌟 Excellent Performance! You scored {percentage:.1f}% ({total_score}/{max_score} marks).")
            feedback_parts.append("You have a strong grasp of the concepts covered in this exam.")
        elif percentage >= 70:
            feedback_parts.append(f"✅ Very Good Performance! You scored {percentage:.1f}% ({total_score}/{max_score} marks).")
            feedback_parts.append("You have shown good understanding with room for improvement.")
        elif percentage >= 60:
            feedback_parts.append(f"📊 Good Performance. You scored {percentage:.1f}% ({total_score}/{max_score} marks).")
            feedback_parts.append("Solid foundation with some areas that need more attention.")
        elif percentage >= 50:
            feedback_parts.append(f"📝 Satisfactory Performance. You scored {percentage:.1f}% ({total_score}/{max_score} marks).")
            feedback_parts.append("You passed, but there's significant room for improvement.")
        elif percentage >= 40:
            feedback_parts.append(f"⚠️ Pass (Marginal). You scored {percentage:.1f}% ({total_score}/{max_score} marks).")
            feedback_parts.append("You've met the minimum requirements. Focus on strengthening weak areas.")
        else:
            feedback_parts.append(f"❌ Below Passing. You scored {percentage:.1f}% ({total_score}/{max_score} marks).")
            feedback_parts.append("Please review the material thoroughly and consider seeking additional help.")
        
        # Add type-specific analysis
        feedback_parts.append("\n📈 Performance by Question Type:")
        strengths = []
        weaknesses = []
        
        type_names = {
            'mcq': 'Multiple Choice',
            'short_answer': 'Short Answer',
            'long_answer': 'Long Answer',
            'true_false': 'True/False'
        }
        
        for q_type, stats in type_performance.items():
            type_name = type_names.get(q_type, q_type.replace('_', ' ').title())
            type_pct = (stats['total'] / stats['max'] * 100) if stats['max'] > 0 else 0
            feedback_parts.append(f"  • {type_name}: {stats['total']}/{stats['max']} ({type_pct:.0f}%)")
            
            if type_pct >= 75:
                strengths.append(type_name)
            elif type_pct < 50:
                weaknesses.append(type_name)
        
        # Add strengths and areas for improvement
        if strengths:
            feedback_parts.append(f"\n💪 Strengths: {', '.join(strengths)}")
        
        if weaknesses:
            feedback_parts.append(f"\n📚 Areas for Improvement: {', '.join(weaknesses)}")
            if 'Long Answer' in weaknesses or 'Short Answer' in weaknesses:
                feedback_parts.append("  → Practice writing more comprehensive and structured answers.")
            if 'Multiple Choice' in weaknesses:
                feedback_parts.append("  → Review core concepts and focus on understanding key definitions.")
        
        # Add recommendations
        feedback_parts.append("\n🎯 Recommendations:")
        if percentage < 60:
            feedback_parts.append("  1. Review the topics where you lost the most marks")
            feedback_parts.append("  2. Practice with more sample questions")
            feedback_parts.append("  3. Consider creating study notes for weak areas")
        elif percentage < 80:
            feedback_parts.append("  1. Focus on the question types where you scored lower")
            feedback_parts.append("  2. Review your answers to understand where points were lost")
        else:
            feedback_parts.append("  1. Keep up the excellent work!")
            feedback_parts.append("  2. Consider helping peers who may be struggling")
        
        overall_feedback = "\n".join(feedback_parts)
        
        evaluated_at = datetime.now().isoformat()
        
        # Save evaluation to Firestore
        if db:
            try:
                db.collection('submissions').document(request.submission_id).update({
                    'status': 'evaluated',
                    'score': total_score,
                    'evaluation': {
                        'totalScore': total_score,
                        'maxScore': max_score,
                        'percentage': percentage,
                        'questionScores': [q.model_dump() for q in question_evaluations],
                        'feedback': overall_feedback,
                        'evaluatedAt': evaluated_at,
                        'evaluatedBy': 'ai'
                    }
                })
            except Exception as e:
                print(f"⚠ Failed to save evaluation: {e}")
        
        return SubmissionEvaluationResponse(
            submission_id=request.submission_id,
            exam_id=request.exam_id,
            student_id=request.student_id,
            total_score=total_score,
            max_score=max_score,
            percentage=round(percentage, 2),
            question_evaluations=question_evaluations,
            overall_feedback=overall_feedback,
            evaluated_at=evaluated_at,
            evaluated_by="ai"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")


# ==================== Analytics Endpoints ====================

@app.get("/analytics/exam/{exam_id}")
async def get_exam_analytics(exam_id: str):
    """Get analytics for a specific exam."""
    if not db:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    
    try:
        # Get exam details
        exam_doc = db.collection('exams').document(exam_id).get()
        if not exam_doc.exists:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        exam = exam_doc.to_dict()
        
        # Get all submissions for this exam
        submissions = db.collection('submissions').where('examId', '==', exam_id).stream()
        
        scores = []
        anti_cheat_violations = 0
        question_stats = {}
        
        for sub_doc in submissions:
            sub = sub_doc.to_dict()
            evaluation = sub.get('evaluation', {})
            score = evaluation.get('percentage', 0)
            scores.append(score)
            
            # Count anti-cheat violations
            anti_cheat_log = sub.get('antiCheatLog', [])
            anti_cheat_violations += len(anti_cheat_log)
            
            # Track per-question performance
            for q_score in evaluation.get('questionScores', []):
                q_id = q_score.get('question_id')
                if q_id:
                    if q_id not in question_stats:
                        question_stats[q_id] = {'total': 0, 'correct': 0, 'attempts': 0}
                    question_stats[q_id]['attempts'] += 1
                    question_stats[q_id]['total'] += q_score.get('awarded_marks', 0)
                    if q_score.get('is_correct'):
                        question_stats[q_id]['correct'] += 1
        
        if not scores:
            return {
                "exam_id": exam_id,
                "exam_title": exam.get('title', 'Unknown'),
                "total_submissions": 0,
                "message": "No submissions yet"
            }
        
        # Calculate score distribution
        distribution = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
        for s in scores:
            if s <= 20:
                distribution["0-20"] += 1
            elif s <= 40:
                distribution["21-40"] += 1
            elif s <= 60:
                distribution["41-60"] += 1
            elif s <= 80:
                distribution["61-80"] += 1
            else:
                distribution["81-100"] += 1
        
        return ExamAnalytics(
            exam_id=exam_id,
            exam_title=exam.get('title', 'Unknown'),
            total_submissions=len(scores),
            average_score=round(sum(scores) / len(scores), 2),
            highest_score=max(scores),
            lowest_score=min(scores),
            pass_rate=round(len([s for s in scores if s >= 40]) / len(scores) * 100, 2),
            score_distribution=distribution,
            question_analytics=[{
                'question_id': q_id,
                'average_score': round(stats['total'] / stats['attempts'], 2) if stats['attempts'] > 0 else 0,
                'attempts': stats['attempts'],
                'success_rate': round(stats['correct'] / stats['attempts'] * 100, 2) if stats['attempts'] > 0 else 0
            } for q_id, stats in question_stats.items()],
            anti_cheat_violations=anti_cheat_violations,
            generated_at=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")


@app.get("/analytics/student/{student_id}")
async def get_student_analytics(student_id: str):
    """Get analytics for a specific student."""
    if not db:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    
    try:
        # Get all submissions by this student
        submissions = db.collection('submissions').where('studentId', '==', student_id).stream()
        
        exams_history = []
        scores = []
        performance_trend = []
        
        for sub_doc in submissions:
            sub = sub_doc.to_dict()
            evaluation = sub.get('evaluation', {})
            score = evaluation.get('percentage', 0)
            
            # Get exam details
            exam_id = sub.get('examId')
            exam_title = "Unknown Exam"
            if exam_id:
                try:
                    exam_doc = db.collection('exams').document(exam_id).get()
                    if exam_doc.exists:
                        exam_title = exam_doc.to_dict().get('title', 'Unknown Exam')
                except:
                    pass
            
            submitted_at = sub.get('submittedAt', '')
            
            exams_history.append({
                'exam_id': exam_id,
                'exam_title': exam_title,
                'score': score,
                'total_score': evaluation.get('totalScore', 0),
                'max_score': evaluation.get('maxScore', 0),
                'submitted_at': submitted_at
            })
            
            scores.append(score)
            performance_trend.append({
                'date': submitted_at,
                'score': score
            })
        
        if not scores:
            return {
                "student_id": student_id,
                "total_exams_taken": 0,
                "message": "No exams taken yet"
            }
        
        return StudentAnalytics(
            student_id=student_id,
            total_exams_taken=len(scores),
            average_score=round(sum(scores) / len(scores), 2),
            best_score=max(scores),
            exams_history=sorted(exams_history, key=lambda x: x['submitted_at'], reverse=True),
            performance_trend=sorted(performance_trend, key=lambda x: x['date']),
            generated_at=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")


@app.get("/analytics/overview")
async def get_overview_analytics():
    """Get overall system analytics."""
    if not db:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    
    try:
        # Count exams by status
        exams_by_status = {"draft": 0, "scheduled": 0, "active": 0, "completed": 0}
        exams = db.collection('exams').stream()
        total_exams = 0
        
        for exam_doc in exams:
            total_exams += 1
            exam = exam_doc.to_dict()
            status = exam.get('status', 'draft')
            if status in exams_by_status:
                exams_by_status[status] += 1
        
        # Count submissions and calculate average
        submissions = db.collection('submissions').stream()
        total_submissions = 0
        all_scores = []
        student_ids = set()
        recent_activity = []
        
        for sub_doc in submissions:
            total_submissions += 1
            sub = sub_doc.to_dict()
            student_ids.add(sub.get('studentId', ''))
            
            evaluation = sub.get('evaluation', {})
            score = evaluation.get('percentage', 0)
            all_scores.append(score)
            
            if len(recent_activity) < 10:
                recent_activity.append({
                    'type': 'submission',
                    'student_id': sub.get('studentId'),
                    'exam_id': sub.get('examId'),
                    'score': score,
                    'timestamp': sub.get('submittedAt')
                })
        
        average_score = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0
        
        return OverviewAnalytics(
            total_exams=total_exams,
            total_submissions=total_submissions,
            total_students=len(student_ids),
            average_score_all=average_score,
            exams_by_status=exams_by_status,
            recent_activity=recent_activity,
            generated_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")


# ==================== Scheduler Endpoints ====================

from services.scheduler_service import exam_scheduler


@app.on_event("startup")
async def startup_event():
    """Start the exam scheduler on app startup."""
    exam_scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    """Stop the exam scheduler on app shutdown."""
    exam_scheduler.stop()


@app.post("/scheduler/run")
async def run_scheduler_now():
    """Manually trigger the exam scheduler (for testing)."""
    result = exam_scheduler.run_now()
    return result


@app.get("/scheduler/status")
async def get_scheduler_status():
    """Get the status of the exam scheduler."""
    return {
        "running": exam_scheduler.scheduler is not None and exam_scheduler.scheduler.running,
        "timezone": str(exam_scheduler.timezone),
        "message": "Scheduler checks exam schedules every minute"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )

