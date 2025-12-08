import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { 
  GeneratedPaper, 
  generatedPaperService, 
  Question 
} from '@/lib/firebase/firestore';
import { 
  generateQuestionPaperPDF, 
  pdfStorageService 
} from '@/lib/pdf';
import { useAuth } from '@/lib/auth/auth-context';

interface GenerationFormData {
  title: string;
  subject: string;
  subjectId: string;
  courseCode: string;
  semester: string;
  academicYear: string;
  department: string;
  examType: 'mid_term' | 'end_term' | 'quiz' | 'assignment';
  examDate: string;
  units: string[];
  totalMarks: number;
  totalQuestions: number;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  bloomDistribution: Record<string, number>;
  questionTypes: Record<string, boolean>;
  instructions: string[];
  useContext: boolean;
}

interface GenerationResult {
  paper: GeneratedPaper;
  pdfBlob: Blob;
}

export function useQuestionPaperGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { user } = useAuth();

  const generatePaper = async (formData: GenerationFormData): Promise<GenerationResult | null> => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress(10);

    try {
      // Step 1: Validate RAG context if needed
      if (formData.useContext && formData.subjectId) {
        setGenerationProgress(15);
        const ragStatus = await apiClient.getRAGStatus(formData.subjectId);
        if (ragStatus.data && !ragStatus.data.rag_exists) {
          throw new Error('RAG data not found for this subject. Please process materials first.');
        }
      }

      // Step 2: Prepare API request
      setGenerationProgress(20);
      const selectedQuestionTypes = Object.entries(formData.questionTypes)
        .filter(([_, selected]) => selected)
        .map(([type]) => type);

      if (selectedQuestionTypes.length === 0) {
        throw new Error('Please select at least one question type');
      }

      const request = {
        topic: formData.title || `${formData.subject} - ${formData.units.join(', ')}`,
        subject: formData.subject,
        subject_id: formData.subjectId || undefined,
        difficulty: formData.difficulty,
        num_questions: formData.totalQuestions,
        question_types: selectedQuestionTypes,
        use_context: formData.useContext
      };

      // Step 3: Generate questions from backend
      setGenerationProgress(40);
      const result = await apiClient.generateQuestions(request);

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data || !result.data.questions) {
        throw new Error('No questions generated');
      }

      // Step 4: Create GeneratedPaper object
      setGenerationProgress(60);
      const now = new Date().toISOString();
      
      const paperData: Omit<GeneratedPaper, 'id'> = {
        subjectId: formData.subjectId,
        subjectName: formData.subject,
        examTitle: formData.title || `${formData.subject} ${formData.examType.replace('_', ' ').toUpperCase()}`,
        examType: formData.examType,
        examDate: formData.examDate,
        duration: formData.duration,
        totalMarks: formData.totalMarks,
        semester: formData.semester,
        academicYear: formData.academicYear,
        department: formData.department,
        courseCode: formData.courseCode,
        instructions: formData.instructions,
        questions: result.data.questions as Question[],
        pdfGenerated: false,
        generatedBy: user?.uid || 'unknown',
        generatedAt: now,
        status: 'draft',
        metadata: {
          questionDistribution: selectedQuestionTypes.reduce((acc, type) => {
            acc[type] = result.data.questions.filter((q: any) => q.type === type).length;
            return acc;
          }, {} as Record<string, number>),
          difficultyBreakdown: {
            easy: result.data.questions.filter((q: any) => q.difficulty === 'easy').length,
            medium: result.data.questions.filter((q: any) => q.difficulty === 'medium').length,
            hard: result.data.questions.filter((q: any) => q.difficulty === 'hard').length,
          },
          bloomBreakdown: formData.bloomDistribution
        }
      };

      // Step 5: Save to Firestore
      setGenerationProgress(70);
      const firestoreResult = await generatedPaperService.create(paperData);
      
      if (!firestoreResult.success || !firestoreResult.id) {
        throw new Error('Failed to save paper to database');
      }

      const savedPaper: GeneratedPaper = {
        ...paperData,
        id: firestoreResult.id
      };

      // Step 6: Generate PDF
      setGenerationProgress(80);
      const pdfBlob = await generateQuestionPaperPDF(savedPaper);

      // Step 7: Upload PDF to Firebase Storage and cache locally
      setGenerationProgress(90);
      const { storagePath, downloadURL } = await pdfStorageService.savePDF(
        savedPaper,
        pdfBlob
      );

      // Step 8: Update Firestore with PDF info
      await generatedPaperService.update(firestoreResult.id, {
        pdfStoragePath: storagePath,
        pdfUrl: downloadURL,
        pdfGenerated: true,
        status: 'finalized'
      });

      setGenerationProgress(100);

      // Return the complete paper
      const finalPaper: GeneratedPaper = {
        ...savedPaper,
        pdfStoragePath: storagePath,
        pdfUrl: downloadURL,
        pdfGenerated: true,
        status: 'finalized'
      };

      return {
        paper: finalPaper,
        pdfBlob
      };

    } catch (error) {
      console.error('Paper generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Generation failed');
      return null;
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(0), 1000);
    }
  };

  const regeneratePDF = async (paper: GeneratedPaper): Promise<Blob | null> => {
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      if (!paper.id) {
        throw new Error('Paper must have an ID');
      }

      setGenerationProgress(30);
      
      // Generate new PDF
      const pdfBlob = await generateQuestionPaperPDF(paper);
      
      setGenerationProgress(70);

      // Upload and cache
      const { storagePath, downloadURL } = await pdfStorageService.savePDF(
        paper,
        pdfBlob
      );

      setGenerationProgress(90);

      // Update Firestore
      await generatedPaperService.update(paper.id, {
        pdfStoragePath: storagePath,
        pdfUrl: downloadURL,
        pdfGenerated: true
      });

      setGenerationProgress(100);

      return pdfBlob;
    } catch (error) {
      console.error('PDF regeneration error:', error);
      setGenerationError(error instanceof Error ? error.message : 'PDF regeneration failed');
      return null;
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(0), 1000);
    }
  };

  const downloadPaper = async (paper: GeneratedPaper): Promise<void> => {
    try {
      const { blob, source } = await pdfStorageService.getPDF(paper);
      
      const filename = `${paper.courseCode}_${paper.examType}_${new Date(paper.examDate).toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;
      
      pdfStorageService.downloadPDFToDevice(blob, filename);
      
      console.log(`PDF downloaded from ${source}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'PDF_REGENERATION_REQUIRED') {
        // Trigger regeneration
        const blob = await regeneratePDF(paper);
        if (blob) {
          const filename = `${paper.courseCode}_${paper.examType}_${new Date(paper.examDate).toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;
          pdfStorageService.downloadPDFToDevice(blob, filename);
        }
      } else {
        console.error('Download error:', error);
        setGenerationError('Failed to download paper');
      }
    }
  };

  const deletePaper = async (paper: GeneratedPaper): Promise<boolean> => {
    try {
      await pdfStorageService.deletePaperCompletely(paper);
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      setGenerationError('Failed to delete paper');
      return false;
    }
  };

  return {
    generatePaper,
    regeneratePDF,
    downloadPaper,
    deletePaper,
    isGenerating,
    generationProgress,
    generationError,
    clearError: () => setGenerationError(null)
  };
}
