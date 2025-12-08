# RAG Integration Guide

## Overview
The backend and frontend are now fully integrated for RAG-based question paper generation with subject-specific data persistence.

## Backend Changes

### 1. Configuration (`backend/config.py`)
- Added `rag_data_dir` configuration for storing RAG vector stores
- Directory structure: `rag_data/{subject_id}/`
- Automatically creates directories on startup

### 2. RAG Service (`backend/services/rag_service.py`)
- Enhanced `save_vector_store()` to create directories automatically
- Improved `load_vector_store()` with better error handling
- Added `has_data()` method to check if RAG service has loaded data

### 3. New API Endpoints (`backend/main.py`)

#### Process RAG Data for Subject
```
POST /process-rag/{subject_id}
Content-Type: multipart/form-data
Files: files[] (PDF, PPTX)

Response:
{
  "message": "RAG data processed and saved successfully",
  "subject_id": "subject-123",
  "files_processed": ["file1.pdf", "file2.pdf"],
  "num_chunks": 45,
  "rag_path": "rag_data/subject-123"
}
```

#### Check RAG Status
```
GET /rag-status/{subject_id}

Response:
{
  "subject_id": "subject-123",
  "rag_exists": true,
  "rag_path": "rag_data/subject-123",
  "stats": {
    "num_documents": 45,
    "has_vector_store": true
  }
}
```

#### Delete RAG Data
```
DELETE /rag/{subject_id}

Response:
{
  "message": "RAG data deleted successfully",
  "subject_id": "subject-123"
}
```

#### Updated Generate Questions
```
POST /generate-questions
Content-Type: application/json

{
  "topic": "Data Structures",
  "subject": "Computer Science",
  "subject_id": "subject-123",  // NEW: For subject-specific RAG
  "difficulty": "medium",
  "num_questions": 8,
  "question_types": ["short_answer", "long_answer"],
  "use_context": true
}
```

### 4. Subject-Specific RAG Management
- Each subject has its own RAG vector store
- Stored in `rag_data/{subject_id}/` directory
- Contains `index.faiss` and `documents.pkl`
- Automatically loads when needed for question generation

## Frontend Changes

### 1. API Client (`src/lib/api.ts`)

Added RAG management methods:
```typescript
// Process RAG data for a subject
apiClient.processRAGForSubject(subjectId: string, files: File[])

// Check RAG status
apiClient.getRAGStatus(subjectId: string)

// Delete RAG data
apiClient.deleteRAGData(subjectId: string)

// Updated generate questions with subject_id
apiClient.generateQuestions({
  subject_id: string,  // NEW
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  num_questions: number,
  question_types: string[],
  use_context: boolean
})
```

### 2. Subjects Page (`src/app/dashboard/coordinator/subjects/page.tsx`)

Complete redesign with:
- **Real-time RAG Status**: Shows if RAG data exists for selected subject
- **Upload Interface**: Upload multiple PDFs/PPTX files
- **Progress Feedback**: Real-time updates during processing
- **Regeneration**: Delete and regenerate RAG data
- **Visual Indicators**: 
  - Green badge = RAG data available
  - Yellow badge = No RAG data (needs processing)

Features:
```tsx
// Check RAG status
const ragStatus = await apiClient.getRAGStatus(subjectId);

// Process files
const result = await apiClient.processRAGForSubject(subjectId, files);

// Shows real-time progress:
- "Uploading files..."
- "Processing documents and creating embeddings..."
- "✓ Processed 3 files (45 chunks)"
```

### 3. Generate Papers Page (`src/app/dashboard/coordinator/generate/page.tsx`)

Enhanced with:
- **Subject ID Tracking**: Automatically captures subject ID when selecting subject
- **RAG Status Check**: Validates RAG data exists before generation
- **Warning Messages**: Shows alert if RAG data missing with link to process materials
- **Context-Aware Generation**: Uses subject-specific RAG data

New features:
```tsx
// Checks RAG status on subject selection
const ragStatus = await apiClient.getRAGStatus(formData.subjectId);

// Shows warning if no RAG data
if (!ragStatus.rag_exists) {
  // Display yellow alert with link to subjects page
}

// Sends subject_id in generation request
const request = {
  subject_id: formData.subjectId,
  // ... other fields
};
```

## User Workflow

### 1. Add Subject
1. Go to **Subjects & Materials** page
2. Click "Add Subject"
3. Enter subject code, name, and description
4. Submit

### 2. Upload Materials & Process RAG
1. Select a subject from the list
2. Upload PDF or PPTX files (multiple files supported)
3. Click "Process RAG Data"
4. Watch real-time progress:
   - Upload progress
   - Document processing
   - Embedding creation
   - Final status
5. Green badge appears when complete

### 3. Generate Question Papers
1. Go to **Generate Papers** page
2. Select subject in Step 1
3. If RAG data missing, see warning with link to process materials
4. Configure paper settings
5. Generate with context using subject-specific RAG data

### 4. Regenerate RAG Data
1. Go to **Subjects & Materials**
2. Select subject with existing RAG data
3. Click "Regenerate" button
4. Confirm deletion
5. Upload new materials
6. Process RAG data again

## File Storage Structure

```
backend/
├── uploads/              # Uploaded PDF/PPTX files
│   ├── subject-id_doc-id.pdf
│   └── subject-id_doc-id.pptx
├── rag_data/            # RAG vector stores
│   ├── subject-123/
│   │   ├── index.faiss        # FAISS vector index
│   │   ├── index.pkl          # FAISS metadata
│   │   └── documents.pkl      # Document chunks
│   └── subject-456/
│       ├── index.faiss
│       ├── index.pkl
│       └── documents.pkl
```

## Error Handling

### Frontend
- Shows real-time progress messages
- Displays errors in user-friendly format
- Provides links to fix issues (e.g., "Process materials" link)
- Loading states during async operations

### Backend
- Validates subject existence
- Checks file formats (PDF, PPTX only)
- Handles missing RAG data gracefully
- Returns detailed error messages
- Automatic cleanup on failure

## Benefits

1. **Subject Isolation**: Each subject has independent RAG data
2. **Persistent Storage**: RAG data saved to disk, survives restarts
3. **Real-time Feedback**: Users see progress during processing
4. **Smart Validation**: Checks for RAG data before generation
5. **Easy Regeneration**: One-click to update RAG data
6. **Scalable**: Handles multiple subjects efficiently
7. **User-Friendly**: Clear warnings and guidance

## Testing

### Backend
```bash
# Start backend
cd backend
python main.py

# Test endpoints
curl http://localhost:8000/rag-status/test-subject-id
curl -X POST http://localhost:8000/process-rag/test-subject-id \
  -F "files=@document.pdf"
```

### Frontend
```bash
# Start frontend
bun run dev

# Navigate to:
http://localhost:3001/dashboard/coordinator/subjects
http://localhost:3001/dashboard/coordinator/generate
```

## Future Enhancements

1. Batch RAG processing for multiple subjects
2. RAG data versioning
3. Incremental updates (add documents without regenerating)
4. RAG quality metrics dashboard
5. Export/import RAG data between environments
6. Scheduled RAG data refresh
7. Material preview before processing
8. Document-level RAG management (add/remove specific files)
