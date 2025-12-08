// Firestore Service Functions
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db, auth } from './config';

// ==================== Type Definitions ====================

export interface Subject {
  id?: string;
  name: string;
  code: string;
  description?: string;
  facultyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id?: string;
  subjectId: string;
  fileName: string;
  storagePath: string;
  downloadURL: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
  ragProcessed?: boolean;
}

export interface Exam {
  id?: string;
  subjectId: string;
  title: string;
  description?: string;
  type: 'mock' | 'question_paper';
  duration: number; // in minutes
  totalMarks: number;
  scheduledAt?: string;
  startTime?: string;
  endTime?: string;
  questions: Question[];
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  createdAt: string;
  createdBy: string;
  settings?: ExamSettings;
  pdfPassword?: string; // For question papers
}

export interface Question {
  id?: string;
  text: string;
  type: 'mcq' | 'short_answer' | 'long_answer' | 'true_false';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[]; // For MCQs
  correctAnswer?: string | number; // For MCQs and true/false
  bloomLevel?: string;
  topic?: string;
}

export interface ExamSettings {
  randomizeQuestions: boolean;
  antiCheat: {
    preventTabSwitch: boolean;
    preventCopyPaste: boolean;
    fullScreenRequired: boolean;
    detectDevTools: boolean;
  };
  allowedAttempts: number;
  showResults: boolean;
}

export interface Submission {
  id?: string;
  examId: string;
  studentId: string;
  generatedQuestions?: Question[]; // The unique questions generated for this student
  answers: Answer[];
  questionTimings?: Record<string, number>; // Per-question time spent
  submittedAt: string;
  status: 'submitted' | 'evaluating' | 'evaluated';
  score?: number;
  evaluation?: Evaluation;
  antiCheatLog: AntiCheatEvent[];
  timeSpent: number; // in seconds
}

export interface Answer {
  questionId: string;
  answer: string | number;
  timeSpent?: number;
}

export interface Evaluation {
  totalScore: number;
  maxScore: number;
  percentage: number;
  questionScores: QuestionScore[];
  feedback?: string;
  evaluatedAt: string;
  evaluatedBy: 'ai' | 'manual';
}

export interface QuestionScore {
  questionId: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

export interface AntiCheatEvent {
  type: 'tab_switch' | 'copy' | 'paste' | 'devtools' | 'fullscreen_exit';
  timestamp: string;
  details?: string;
}

export interface RAGData {
  id?: string;
  subjectId: string;
  materialIds: string[];
  embeddings: any;
  chunks: any[];
  createdAt: string;
  createdBy: string;
  version: string;
}

export interface Unit {
  id?: string;
  subjectId: string;
  name: string;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id?: string;
  unitId: string;
  name: string;
  description?: string;
  order: number;
  learningObjectives?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RubricSection {
  name: string;
  marks: number;
  questionCount: number;
  instructions?: string;
}

export interface Rubric {
  id?: string;
  subjectId: string;
  subjectName?: string;
  totalMarks: number;
  duration: string;
  bloomDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  sectionFormat: RubricSection[];
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedPaper {
  id?: string;
  subjectId: string;
  subjectName: string;
  examTitle: string;
  examType: 'mid_term' | 'end_term' | 'quiz' | 'assignment';
  examDate: string;
  duration: string;
  totalMarks: number;
  semester: string;
  academicYear: string;
  department: string;
  courseCode: string;
  instructions: string[];
  questions: Question[];
  rubricId?: string;
  pdfStoragePath?: string; // Firebase Storage path
  pdfUrl?: string; // Download URL
  pdfGenerated: boolean;
  localCacheKey?: string; // For local storage lookup
  generatedBy: string; // Faculty/Coordinator ID
  generatedAt: string;
  status: 'draft' | 'finalized' | 'published';
  metadata?: {
    questionDistribution?: Record<string, number>;
    difficultyBreakdown?: Record<string, number>;
    bloomBreakdown?: Record<string, number>;
  };
}

// ==================== Generic CRUD Operations ====================

export const firestoreService = {
  // Create document
  async create<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date().toISOString()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating document:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Read document by ID
  async read<T>(
    collectionName: string,
    docId: string
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          success: true,
          data: { id: docSnap.id, ...docSnap.data() } as T
        };
      } else {
        return { success: false, error: 'Document not found' };
      }
    } catch (error) {
      console.error('Error reading document:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Read all documents in collection
  async readAll<T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<{ success: boolean; data?: T[]; error?: string }> {
    try {
      const q = constraints.length > 0
        ? query(collection(db, collectionName), ...constraints)
        : collection(db, collectionName);

      const querySnapshot = await getDocs(q);
      const data: T[] = [];

      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as T);
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error reading documents:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Update document
  async update(
    collectionName: string,
    docId: string,
    data: Partial<DocumentData>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating document:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Delete document
  async delete(
    collectionName: string,
    docId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Query documents
  async query<T>(
    collectionName: string,
    ...constraints: QueryConstraint[]
  ): Promise<{ success: boolean; data?: T[]; error?: string }> {
    return this.readAll<T>(collectionName, constraints);
  }
};

// ==================== Specific Service Functions ====================

// Subject Services
export const subjectService = {
  create: (data: Omit<Subject, 'id'>) =>
    firestoreService.create<Subject>('subjects', data),

  getAll: () =>
    firestoreService.readAll<Subject>('subjects', [orderBy('name')]),

  getById: (id: string) =>
    firestoreService.read<Subject>('subjects', id),

  update: (id: string, data: Partial<Subject>) =>
    firestoreService.update('subjects', id, data),

  delete: (id: string) =>
    firestoreService.delete('subjects', id)
};

// Material Services
export const materialService = {
  create: (data: Omit<Material, 'id'>) =>
    firestoreService.create<Material>('materials', data),

  getBySubject: (subjectId: string) =>
    firestoreService.query<Material>('materials', where('subjectId', '==', subjectId)),

  getById: (id: string) =>
    firestoreService.read<Material>('materials', id),

  delete: (id: string) =>
    firestoreService.delete('materials', id)
};

// Exam Services
export const examService = {
  create: (data: Omit<Exam, 'id'>) =>
    firestoreService.create<Exam>('exams', data),

  getAll: () =>
    firestoreService.readAll<Exam>('exams', [orderBy('createdAt', 'desc')]),

  getById: (id: string) =>
    firestoreService.read<Exam>('exams', id),

  getBySubject: (subjectId: string) =>
    firestoreService.query<Exam>('exams', where('subjectId', '==', subjectId)),

  getActive: () =>
    firestoreService.query<Exam>('exams', where('status', '==', 'active')),

  update: (id: string, data: Partial<Exam>) =>
    firestoreService.update('exams', id, data),

  delete: (id: string) =>
    firestoreService.delete('exams', id)
};

// Submission Services
export const submissionService = {
  create: (data: Omit<Submission, 'id'>) =>
    firestoreService.create<Submission>('submissions', data),

  getById: (id: string) =>
    firestoreService.read<Submission>('submissions', id),

  getByStudent: (studentId: string) =>
    firestoreService.query<Submission>('submissions',
      where('studentId', '==', studentId),
      orderBy('submittedAt', 'desc')
    ),

  getByExam: (examId: string) =>
    firestoreService.query<Submission>('submissions',
      where('examId', '==', examId),
      orderBy('submittedAt', 'desc')
    ),

  update: (id: string, data: Partial<Submission>) =>
    firestoreService.update('submissions', id, data)
};

// RAG Data Services
export const ragService = {
  create: (data: Omit<RAGData, 'id'>) =>
    firestoreService.create<RAGData>('rag_data', data),

  getBySubject: (subjectId: string) =>
    firestoreService.query<RAGData>('rag_data',
      where('subjectId', '==', subjectId),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
};

// Unit Services
export const unitService = {
  create: (data: Omit<Unit, 'id'>) =>
    firestoreService.create<Unit>('units', data),

  getBySubject: (subjectId: string) =>
    firestoreService.query<Unit>('units', where('subjectId', '==', subjectId), orderBy('order')),

  update: (id: string, data: Partial<Unit>) =>
    firestoreService.update('units', id, data),

  delete: (id: string) =>
    firestoreService.delete('units', id)
};

// Lesson Services
export const lessonService = {
  create: (data: Omit<Lesson, 'id'>) =>
    firestoreService.create<Lesson>('lessons', data),

  getByUnit: (unitId: string) =>
    firestoreService.query<Lesson>('lessons', where('unitId', '==', unitId), orderBy('order')),

  update: (id: string, data: Partial<Lesson>) =>
    firestoreService.update('lessons', id, data),

  delete: (id: string) =>
    firestoreService.delete('lessons', id)
};

// Rubric Services
export const rubricService = {
  create: (data: Omit<Rubric, 'id'>) =>
    firestoreService.create<Rubric>('rubrics', data),

  getAll: () =>
    firestoreService.readAll<Rubric>('rubrics', [orderBy('createdAt', 'desc')]),

  delete: (id: string) =>
    firestoreService.delete('rubrics', id)
};

// Generated Paper Services
export const generatedPaperService = {
  create: (data: Omit<GeneratedPaper, 'id'>) =>
    firestoreService.create<GeneratedPaper>('generated_papers', data),

  getAll: () =>
    firestoreService.readAll<GeneratedPaper>('generated_papers', [orderBy('generatedAt', 'desc')]),

  getById: (id: string) =>
    firestoreService.read<GeneratedPaper>('generated_papers', id),

  getBySubject: (subjectId: string) =>
    firestoreService.query<GeneratedPaper>('generated_papers',
      where('subjectId', '==', subjectId),
      orderBy('generatedAt', 'desc')
    ),

  getByGeneratedBy: (userId: string) =>
    firestoreService.query<GeneratedPaper>('generated_papers',
      where('generatedBy', '==', userId),
      orderBy('generatedAt', 'desc')
    ),

  update: (id: string, data: Partial<GeneratedPaper>) =>
    firestoreService.update('generated_papers', id, data),

  delete: (id: string) =>
    firestoreService.delete('generated_papers', id)
};
