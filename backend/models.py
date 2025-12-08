from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    num_chunks: int
    message: str


class QuestionFormat(BaseModel):
    count: int = Field(..., ge=0, le=20, description="Number of questions of this type")
    marks: int = Field(..., ge=1, le=20, description="Marks per question")


class QuestionGenerationRequest(BaseModel):
    topic: Optional[str] = Field(None, description="Specific topic to focus on")
    difficulty: DifficultyLevel = Field(DifficultyLevel.MEDIUM, description="Difficulty level")
    num_questions: int = Field(5, ge=1, le=50, description="Number of questions to generate")
    question_types: Optional[List[str]] = Field(
        None,
        description="Types of questions (very_short_answer, short_answer, long_answer)"
    )
    use_context: bool = Field(True, description="Whether to use uploaded documents as context")
    bloom_distribution: Optional[Dict[str, int]] = Field(
        None,
        description="Bloom's taxonomy distribution percentages"
    )
    question_format: Optional[Dict[str, QuestionFormat]] = Field(
        None,
        description="Format for each question type with count and marks"
    )
    instructions: Optional[str] = Field(None, description="Additional instructions for paper generation")
    subject: Optional[str] = Field(None, description="Subject for the question paper")
    subject_id: Optional[str] = Field(None, description="Subject ID for subject-specific RAG data")
    paper_id: Optional[str] = Field(None, description="Optional ID for the paper to be generated/updated")


class Question(BaseModel):
    question_number: int
    question_text: str
    question_type: str
    difficulty: DifficultyLevel
    marks: int
    options: Optional[List[str]] = None  # For MCQ and true/false questions
    correct_answer: Optional[Any] = None  # Index for MCQ (0-based), or string for others
    sample_answer: Optional[str] = None
    context_source: Optional[str] = None


class QuestionPaper(BaseModel):
    id: Optional[str] = None  # Firebase document ID
    title: str
    subject: Optional[str] = None
    difficulty: DifficultyLevel
    total_marks: int
    questions: List[Question]
    instructions: Optional[str] = None
    generated_at: Optional[str] = None
    pdf_path: Optional[str] = None
    password: Optional[str] = None


class EmbeddingResponse(BaseModel):
    success: bool
    num_documents: int
    num_chunks: int
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str


# Course Structure Models
class Subject(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    created_at: str
    updated_at: str


class Unit(BaseModel):
    id: str
    subject_id: str
    name: str
    description: Optional[str] = None
    order: int
    created_at: str
    updated_at: str


class Lesson(BaseModel):
    id: str
    unit_id: str
    name: str
    description: Optional[str] = None
    order: int
    learning_objectives: Optional[List[str]] = None
    created_at: str
    updated_at: str


# Create Models
class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = Field(None, max_length=500)


class UnitCreate(BaseModel):
    subject_id: str
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    order: int = Field(1, ge=1)


class LessonCreate(BaseModel):
    unit_id: str
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    order: int = Field(1, ge=1)
    learning_objectives: Optional[List[str]] = Field(None, max_items=10)


# ==================== Evaluation Models ====================

class Answer(BaseModel):
    question_id: str
    answer: str  # Student's answer
    time_spent: Optional[int] = 0  # Time spent in seconds


class QuestionEvaluation(BaseModel):
    question_id: str
    question_text: str
    question_type: str
    max_marks: int
    awarded_marks: float
    feedback: str
    is_correct: Optional[bool] = None  # For MCQ/true_false


class SubmissionEvaluationRequest(BaseModel):
    submission_id: str
    exam_id: str
    student_id: str
    answers: List[Answer]


class SubmissionEvaluationResponse(BaseModel):
    submission_id: str
    exam_id: str
    student_id: str
    total_score: float
    max_score: int
    percentage: float
    question_evaluations: List[QuestionEvaluation]
    overall_feedback: str
    evaluated_at: str
    evaluated_by: str = "ai"


# ==================== Analytics Models ====================

class ExamAnalytics(BaseModel):
    exam_id: str
    exam_title: str
    total_submissions: int
    average_score: float
    highest_score: float
    lowest_score: float
    pass_rate: float  # Percentage of students scoring >= 40%
    score_distribution: Dict[str, int]  # e.g., {"0-20": 5, "21-40": 10, ...}
    question_analytics: List[Dict]  # Per-question stats
    anti_cheat_violations: int
    generated_at: str


class StudentAnalytics(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    total_exams_taken: int
    average_score: float
    best_score: float
    exams_history: List[Dict]  # List of exam results
    performance_trend: List[Dict]  # Scores over time
    generated_at: str


class OverviewAnalytics(BaseModel):
    total_exams: int
    total_submissions: int
    total_students: int
    average_score_all: float
    exams_by_status: Dict[str, int]
    recent_activity: List[Dict]
    generated_at: str

