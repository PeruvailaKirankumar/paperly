// API client for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          error: errorText || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; version: string }>> {
    return this.request('/health');
  }

  // Document operations
  async uploadDocument(file: File): Promise<ApiResponse<{
    document_id: string;
    filename: string;
    file_type: string;
    num_chunks: number;
    message: string;
  }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/upload-document', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async uploadMultipleDocuments(files: File[]): Promise<ApiResponse<{
    document_id: string;
    filename: string;
    file_type: string;
    num_chunks: number;
    message: string;
  }[]>> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.request('/upload-documents', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async getDocuments(): Promise<ApiResponse<Array<{
    document_id: string;
    filename: string;
    file_type: string;
    num_chunks: number;
  }>>> {
    return this.request('/documents');
  }

  async deleteDocument(documentId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async clearAllDocuments(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/documents', {
      method: 'DELETE',
    });
  }

  // Question generation
  async generateQuestions(request: {
    topic?: string;
    subject?: string;
    subject_id?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    num_questions: number;
    question_types: string[];
    question_format?: Record<string, { count: number; marks: number }>;
    use_context: boolean;
  }): Promise<ApiResponse<{
    id?: string;
    title: string;
    subject: string;
    difficulty: string;
    total_marks: number;
    questions: Array<{
      question: string;
      type: string;
      marks: number;
      difficulty: string;
      bloom_level?: string;
    }>;
    generated_at: string;
    pdf_path?: string;
    password?: string;
  }>> {
    return this.request('/generate-questions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // RAG Management
  async processRAGForSubject(subjectId: string, files: File[]): Promise<ApiResponse<{
    message: string;
    subject_id: string;
    files_processed: string[];
    num_chunks: number;
    rag_path: string;
  }>> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.request(`/process-rag/${subjectId}`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async getRAGStatus(subjectId: string): Promise<ApiResponse<{
    subject_id: string;
    rag_exists: boolean;
    rag_path: string | null;
    stats: {
      num_documents: number;
      has_vector_store: boolean;
    } | null;
  }>> {
    return this.request(`/rag-status/${subjectId}`);
  }

  async getRAGDocuments(subjectId: string): Promise<ApiResponse<{
    subject_id: string;
    documents: Array<{
      document_id: string;
      filename: string;
      file_type: string;
      subject_id: string;
      chunk_count: number;
      preview: string;
    }>;
    total_documents: number;
    total_chunks: number;
  }>> {
    return this.request(`/rag-documents/${subjectId}`);
  }

  async organizeMaterialsAI(subjectId: string): Promise<ApiResponse<{
    subject_id: string;
    organization: {
      units: Array<{
        name: string;
        order: number;
        description: string;
        lessons: Array<{
          name: string;
          order: number;
          description: string;
          source_documents: string[];
          learning_objectives: string[];
        }>;
      }>;
    };
    message: string;
  }>> {
    return this.request(`/organize-materials/${subjectId}`, {
      method: 'POST',
    });
  }

  async deleteRAGData(subjectId: string): Promise<ApiResponse<{
    message: string;
    subject_id: string;
  }>> {
    return this.request(`/rag/${subjectId}`, {
      method: 'DELETE',
    });
  }

  // System stats
  async getStats(): Promise<ApiResponse<{
    num_uploaded_documents: number;
    num_indexed_chunks: number;
    has_vector_store: boolean;
    supported_formats: string[];
  }>> {
    return this.request('/stats');
  }

  async getGeneratedPapers(): Promise<ApiResponse<{
    papers: Array<{
      id: string;
      title: string;
      subject: string;
      difficulty: string;
      total_marks: number;
      questions: any[];
      generated_at: string;
      pdf_path?: string;
    }>;
    total: number;
  }>> {
    return this.request('/generated-papers');
  }

  async getPaper(paperId: string): Promise<ApiResponse<{
    id: string;
    title: string;
    subject: string;
    difficulty: string;
    total_marks: number;
    questions: any[];
    instructions?: string;
    generated_at: string;
    password?: string;
  }>> {
    return this.request(`/papers/${paperId}`);
  }

  async setPaperPassword(paperId: string, password: string): Promise<ApiResponse<{
    message: string;
    password: string;
  }>> {
    return this.request(`/papers/${paperId}/password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async downloadPaperPdf(paperId: string): Promise<{ blob: Blob; password?: string; filename: string } | { error: string }> {
    const url = `${this.baseUrl}/papers/${paperId}/pdf`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        return { error: errorText || `HTTP error! status: ${response.status}` };
      }

      const blob = await response.blob();
      const password = response.headers.get('X-PDF-Password') || undefined;
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      const filenameMatch = contentDisposition.match(/filename=(.+)$/);
      const filename = filenameMatch ? filenameMatch[1] : 'paper.pdf';

      return { blob, password, filename };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Course structure management
  async getSubjects(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    code: string;
    description?: string;
    created_at: string;
    updated_at: string;
  }>>> {
    return this.request('/subjects');
  }

  async createSubject(subject: {
    name: string;
    code: string;
    description?: string;
  }): Promise<ApiResponse<{
    id: string;
    name: string;
    code: string;
    description?: string;
    created_at: string;
    updated_at: string;
  }>> {
    return this.request('/subjects', {
      method: 'POST',
      body: JSON.stringify(subject),
    });
  }

  async getUnits(subjectId: string): Promise<ApiResponse<Array<{
    id: string;
    subject_id: string;
    name: string;
    description?: string;
    order: number;
    created_at: string;
    updated_at: string;
  }>>> {
    return this.request(`/subjects/${subjectId}/units`);
  }

  async createUnit(unit: {
    subject_id: string;
    name: string;
    description?: string;
    order: number;
  }): Promise<ApiResponse<{
    id: string;
    subject_id: string;
    name: string;
    description?: string;
    order: number;
    created_at: string;
    updated_at: string;
  }>> {
    return this.request('/units', {
      method: 'POST',
      body: JSON.stringify(unit),
    });
  }

  async getLessons(unitId: string): Promise<ApiResponse<Array<{
    id: string;
    unit_id: string;
    name: string;
    description?: string;
    order: number;
    learning_objectives?: string[];
    created_at: string;
    updated_at: string;
  }>>> {
    return this.request(`/units/${unitId}/lessons`);
  }

  async createLesson(lesson: {
    unit_id: string;
    name: string;
    description?: string;
    order: number;
    learning_objectives?: string[];
  }): Promise<ApiResponse<{
    id: string;
    unit_id: string;
    name: string;
    description?: string;
    order: number;
    learning_objectives?: string[];
    created_at: string;
    updated_at: string;
  }>> {
    return this.request('/lessons', {
      method: 'POST',
      body: JSON.stringify(lesson),
    });
  }

  async getFullCourseStructure(): Promise<ApiResponse<{
    [subjectId: string]: {
      id: string;
      name: string;
      code: string;
      description?: string;
      units: Array<{
        id: string;
        name: string;
        description?: string;
        order: number;
        lessons: Array<{
          id: string;
          name: string;
          description?: string;
          order: number;
          learning_objectives?: string[];
        }>;
      }>;
    };
  }>> {
    return this.request('/course-structure');
  }

  async deleteSubject(subjectId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/subjects/${subjectId}`, {
      method: 'DELETE',
    });
  }

  async deleteUnit(unitId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/units/${unitId}`, {
      method: 'DELETE',
    });
  }

  async deleteLesson(lessonId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Evaluation ====================

  async evaluateSubmission(submission: {
    submission_id: string;
    exam_id: string;
    student_id: string;
    answers: Array<{
      question_id: string;
      answer: string;
      time_spent?: number;
    }>;
  }): Promise<ApiResponse<{
    submission_id: string;
    exam_id: string;
    student_id: string;
    total_score: number;
    max_score: number;
    percentage: number;
    question_evaluations: Array<{
      question_id: string;
      question_text: string;
      question_type: string;
      max_marks: number;
      awarded_marks: number;
      feedback: string;
      is_correct?: boolean;
    }>;
    overall_feedback: string;
    evaluated_at: string;
    evaluated_by: string;
  }>> {
    return this.request('/evaluate-submission', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  // ==================== Analytics ====================

  async getExamAnalytics(examId: string): Promise<ApiResponse<{
    exam_id: string;
    exam_title: string;
    total_submissions: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
    score_distribution: Record<string, number>;
    question_analytics: Array<{
      question_id: string;
      average_score: number;
      attempts: number;
      success_rate: number;
    }>;
    anti_cheat_violations: number;
    generated_at: string;
  }>> {
    return this.request(`/analytics/exam/${examId}`);
  }

  async getStudentAnalytics(studentId: string): Promise<ApiResponse<{
    student_id: string;
    student_name?: string;
    total_exams_taken: number;
    average_score: number;
    best_score: number;
    exams_history: Array<{
      exam_id: string;
      exam_title: string;
      score: number;
      total_score: number;
      max_score: number;
      submitted_at: string;
    }>;
    performance_trend: Array<{
      date: string;
      score: number;
    }>;
    generated_at: string;
  }>> {
    return this.request(`/analytics/student/${studentId}`);
  }

  async getOverviewAnalytics(): Promise<ApiResponse<{
    total_exams: number;
    total_submissions: number;
    total_students: number;
    average_score_all: number;
    exams_by_status: Record<string, number>;
    recent_activity: Array<{
      type: string;
      student_id: string;
      exam_id: string;
      score: number;
      timestamp: string;
    }>;
    generated_at: string;
  }>> {
    return this.request('/analytics/overview');
  }

  // ==================== Scheduler ====================

  async triggerScheduler(): Promise<ApiResponse<{
    message: string;
    timestamp: string;
  }>> {
    return this.request('/scheduler/run', {
      method: 'POST',
    });
  }

  async getSchedulerStatus(): Promise<ApiResponse<{
    running: boolean;
    timezone: string;
    message: string;
  }>> {
    return this.request('/scheduler/status');
  }
}

export const apiClient = new ApiClient();
export default apiClient;