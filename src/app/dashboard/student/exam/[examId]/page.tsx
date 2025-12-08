'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  Maximize,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Sparkles
} from 'lucide-react';
import { examService, submissionService, Exam } from '@/lib/firebase/firestore';
import { apiClient } from '@/lib/api';

interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'short_answer' | 'long_answer' | 'true_false';
  marks: number;
  options?: string[];
  correctAnswer?: string | number;
}

interface ExamData {
  id: string;
  title: string;
  subject: string;
  duration: number;
  totalMarks: number;
  questions: Question[];
  settings: {
    randomizeQuestions: boolean;
    antiCheat: {
      preventTabSwitch: boolean;
      preventCopyPaste: boolean;
      fullScreenRequired: boolean;
      detectDevTools: boolean;
    };
  };
}

interface AntiCheatEvent {
  type: 'tab_switch' | 'copy' | 'paste' | 'devtools' | 'fullscreen_exit';
  timestamp: string;
  details?: string;
}

export default function ExamPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const examId = params?.examId as string;

  // Exam state
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [existingSubmissionId, setExistingSubmissionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Answer state
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<string, number>>({});
  const questionStartTime = useRef<number>(Date.now());

  // Anti-cheat state
  const [antiCheatLog, setAntiCheatLog] = useState<AntiCheatEvent[]>([]);
  const [warnings, setWarnings] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Load exam data
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'student') {
      router.push('/login');
      return;
    }

    loadExamData();
  }, [examId, isAuthenticated, user]);

  const loadExamData = async () => {
    try {
      // Check if student has already taken this exam
      if (user?.id) {
        const submissionsResult = await submissionService.getByStudent(user.id);
        if (submissionsResult.success && submissionsResult.data) {
          const existingSubmission = submissionsResult.data.find(
            s => s.examId === examId
          );
          if (existingSubmission) {
            setAlreadyTaken(true);
            setExistingSubmissionId(existingSubmission.id || null);
            setLoading(false);
            return;
          }
        }
      }

      // Load from Firebase
      const result = await examService.getById(examId);

      if (result.success && result.data) {
        const examData = result.data;
        const loadedExam: ExamData = {
          id: examData.id!,
          title: examData.title,
          subject: examData.subjectId,
          duration: examData.duration,
          totalMarks: examData.totalMarks,
          questions: examData.questions.map((q, idx) => ({
            id: q.id || `q${idx + 1}`,
            text: q.text,
            type: q.type,
            marks: q.marks,
            options: q.options,
            correctAnswer: q.correctAnswer
          })),
          settings: examData.settings || {
            randomizeQuestions: true,
            antiCheat: {
              preventTabSwitch: true,
              preventCopyPaste: true,
              fullScreenRequired: true,
              detectDevTools: true
            }
          }
        };

        setExam(loadedExam);
        setTimeRemaining(loadedExam.duration * 60); // Convert to seconds
      } else {
        console.error('Exam not found');
      }
    } catch (error) {
      console.error('Error loading exam:', error);
    } finally {
      setLoading(false);
    }
  };

  // Anti-cheat: Tab switch detection
  useEffect(() => {
    if (!started || !exam?.settings.antiCheat.preventTabSwitch) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logAntiCheatEvent('tab_switch', 'User switched tabs or minimized window');
        addWarning('Tab switching detected! Please stay on this page.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [started, exam]);

  // Anti-cheat: Copy/Paste prevention
  useEffect(() => {
    if (!started || !exam?.settings.antiCheat.preventCopyPaste) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logAntiCheatEvent('copy', 'User attempted to copy content');
      addWarning('Copying is disabled during the exam!');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logAntiCheatEvent('paste', 'User attempted to paste content');
      addWarning('Pasting is disabled during the exam!');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [started, exam]);

  // Anti-cheat: DevTools detection
  useEffect(() => {
    if (!started || !exam?.settings.antiCheat.detectDevTools) return;

    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        logAntiCheatEvent('devtools', 'Developer tools might be open');
        addWarning('Please close developer tools!');
      }
    };

    const interval = setInterval(detectDevTools, 5000);
    return () => clearInterval(interval);
  }, [started, exam]);

  // Anti-cheat: Fullscreen monitoring
  useEffect(() => {
    if (!started || !exam?.settings.antiCheat.fullScreenRequired) return;

    const handleFullScreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullScreen(isFS);

      if (!isFS && started) {
        logAntiCheatEvent('fullscreen_exit', 'User exited fullscreen mode');
        addWarning('Please return to fullscreen mode!');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [started, exam]);

  // Timer
  useEffect(() => {
    if (!started || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeRemaining]);

  // Track time spent on each question
  useEffect(() => {
    if (!started || !exam) return;

    const currentQ = exam.questions[currentQuestion];
    questionStartTime.current = Date.now();

    return () => {
      const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
      setTimeSpentPerQuestion((prev) => ({
        ...prev,
        [currentQ.id]: (prev[currentQ.id] || 0) + timeSpent
      }));
    };
  }, [currentQuestion, started, exam]);

  const logAntiCheatEvent = (type: AntiCheatEvent['type'], details?: string) => {
    const event: AntiCheatEvent = {
      type,
      timestamp: new Date().toISOString(),
      details
    };
    setAntiCheatLog((prev) => [...prev, event]);
  };

  const addWarning = (message: string) => {
    const newWarningCount = warnings + 1;
    setWarnings(newWarningCount);
    setWarningMessage(message);
    setShowWarningModal(true);

    // Auto-close after 3 seconds
    setTimeout(() => setShowWarningModal(false), 3000);

    // Auto-submit after 3 warnings (immediately on 3rd warning)
    if (newWarningCount >= 3) {
      alert('⚠️ EXAM TERMINATED\n\nYou have exceeded the maximum allowed violations (3).\nYour exam has been automatically submitted.');
      handleSubmit();
      // Exit fullscreen and redirect
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
    }
  };

  const handleStartExam = async () => {
    if (!exam) return;

    // Request fullscreen first if required
    if (exam.settings.antiCheat.fullScreenRequired) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullScreen(true);
      } catch (error) {
        alert('Fullscreen mode is required to take this exam.');
        return;
      }
    }

    // Start generating questions
    setGenerating(true);
    setGenerationProgress('Preparing your personalized exam...');

    try {
      // Generate questions using RAG
      setGenerationProgress('Analyzing course materials...');

      // Get question config from exam settings (if coordinator configured it)
      const questionConfig = (exam.settings as any)?.questionConfig || {
        numQuestions: 10,
        difficulty: 'medium',
        questionTypes: {
          mcq: 3,
          short_answer: 3,
          long_answer: 2,
          true_false: 2
        }
      };

      const response = await apiClient.generateQuestions({
        subject_id: exam.subject,
        subject: exam.title,
        difficulty: questionConfig.difficulty || 'medium',
        num_questions: questionConfig.numQuestions || 10,
        question_types: ['mcq', 'short_answer', 'long_answer', 'true_false'],
        use_context: true // Use RAG context
      });

      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to generate questions');
      }

      setGenerationProgress('Building your question paper...');

      // Transform generated questions to exam format
      const generatedQuestions: Question[] = response.data.questions.map((q: any, idx: number) => ({
        id: `q${idx + 1}`,
        text: q.question_text || q.question,
        type: mapQuestionType(q.question_type || q.type),
        marks: q.marks || 5,
        options: q.options || undefined,
        correctAnswer: q.correct_answer || q.correctAnswer
      }));

      // Update exam with generated questions
      const updatedExam: ExamData = {
        ...exam,
        questions: generatedQuestions,
        totalMarks: generatedQuestions.reduce((sum, q) => sum + q.marks, 0)
      };

      setExam(updatedExam);
      setGenerationProgress('Starting exam...');

      // Small delay to show the final message
      await new Promise(resolve => setTimeout(resolve, 500));

      setGenerating(false);
      setStarted(true);
    } catch (error: any) {
      console.error('Error generating questions:', error);
      setGenerating(false);

      // Exit fullscreen if generation failed
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }

      alert(`Failed to generate exam questions: ${error.message || 'Please try again.'}`);
    }
  };

  // Helper to map question types
  const mapQuestionType = (type: string): 'mcq' | 'short_answer' | 'long_answer' | 'true_false' => {
    const typeMap: Record<string, 'mcq' | 'short_answer' | 'long_answer' | 'true_false'> = {
      'mcq': 'mcq',
      'multiple_choice': 'mcq',
      'short_answer': 'short_answer',
      'very_short_answer': 'short_answer',
      'long_answer': 'long_answer',
      'essay': 'long_answer',
      'true_false': 'true_false',
      'boolean': 'true_false'
    };
    return typeMap[type.toLowerCase()] || 'short_answer';
  };

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (submitted) return;

    try {
      setSubmitted(true);

      // Exit fullscreen
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      // Prepare submission data including the generated question paper
      // Note: Firebase doesn't accept undefined values, use null instead
      const submissionData = {
        examId: exam!.id,
        studentId: user!.id,
        // Store the generated questions for this student
        generatedQuestions: exam!.questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type,
          marks: q.marks,
          options: q.options || null,
          correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : null
        })),
        // Store answers with per-question timing
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer: answer !== undefined ? answer : '',
          timeSpent: timeSpentPerQuestion[questionId] || 0
        })),
        // Per-question timing summary
        questionTimings: timeSpentPerQuestion || {},
        submittedAt: new Date().toISOString(),
        status: 'submitted' as const,
        antiCheatLog: antiCheatLog || [],
        timeSpent: (exam!.duration * 60) - timeRemaining
      };

      // Submit to Firebase
      const result = await submissionService.create(submissionData);

      if (result.success && result.id) {
        console.log('Exam submitted successfully:', result.id);
        const submissionId = result.id;

        // Trigger AI evaluation and wait for it
        try {
          console.log('Starting AI evaluation...');
          const evalResult = await apiClient.evaluateSubmission({
            submission_id: submissionId,
            exam_id: exam!.id,
            student_id: user!.id,
            answers: Object.entries(answers).map(([questionId, answer]) => ({
              question_id: questionId,
              answer: String(answer),
              time_spent: timeSpentPerQuestion[questionId] || 0
            }))
          });

          if (evalResult.data) {
            console.log('AI evaluation completed:', evalResult.data.percentage + '%');
          } else {
            console.warn('AI evaluation returned no data:', evalResult.error);
          }
        } catch (evalError) {
          console.error('AI evaluation failed:', evalError);
          // Continue anyway - results page will show pending status
        }

        // Redirect to results page
        router.push(`/dashboard/student/results/${submissionId}`);
      } else {
        console.error('Failed to submit exam:', result.error);
        // Still redirect to dashboard
        router.push('/dashboard/student?error=submit_failed');
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
      setSubmitted(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = exam ? ((currentQuestion + 1) / exam.questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Exam Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">The exam you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push('/dashboard/student')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already taken view
  if (alreadyTaken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Exam Already Taken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              You have already attempted this exam. Each exam can only be taken once.
            </p>
            <div className="space-y-2">
              {existingSubmissionId && (
                <Button
                  onClick={() => router.push(`/dashboard/student/results/${existingSubmissionId}`)}
                  className="w-full"
                >
                  View Your Results
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/student')}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Exam Submitted Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Your answers have been submitted for evaluation. Results will be available soon.
            </p>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p>• Questions Answered: {answeredCount}/{exam.questions.length}</p>
              <p>• Anti-cheat Violations: {antiCheatLog.length}</p>
              <p>• Time Taken: {formatTime((exam.duration * 60) - timeRemaining)}</p>
            </div>
            <Button onClick={() => router.push('/dashboard/student')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show generating screen while AI generates personalized questions
  if (generating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="max-w-lg w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 relative">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-blue-600 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
            </div>
            <CardTitle className="text-2xl">Generating Your Exam</CardTitle>
            <CardDescription className="text-base mt-2">
              Please wait while we prepare your personalized questions
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">{generationProgress}</span>
              </div>

              <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-medium mb-2">What's happening:</p>
                <ul className="text-left space-y-1">
                  <li>📚 Analyzing course materials with AI</li>
                  <li>🎯 Generating questions tailored to the syllabus</li>
                  <li>⚖️ Ensuring balanced difficulty distribution</li>
                  <li>✨ Creating your unique question paper</li>
                </ul>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                This typically takes 10-20 seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{exam.title}</CardTitle>
            <CardDescription>{exam.subject}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-lg font-semibold">{exam.duration} minutes</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Marks</p>
                <p className="text-lg font-semibold">{exam.totalMarks}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-lg font-semibold">{exam.questions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="text-lg font-semibold capitalize">{exam.questions[0]?.type.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Important Instructions
              </h3>
              <ul className="space-y-1 text-sm text-yellow-800">
                <li>• Read each question carefully before answering</li>
                <li>• All questions are mandatory</li>
                {exam.settings.antiCheat.fullScreenRequired && (
                  <li>• Fullscreen mode is required throughout the exam</li>
                )}
                {exam.settings.antiCheat.preventTabSwitch && (
                  <li>• Do not switch tabs or windows during the exam</li>
                )}
                {exam.settings.antiCheat.preventCopyPaste && (
                  <li>• Copy/paste functionality is disabled</li>
                )}
                <li>• The exam will auto-submit when time expires</li>
                <li>• Multiple violations will result in auto-submission</li>
              </ul>
            </div>

            <Button onClick={handleStartExam} className="w-full" size="lg">
              Start Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Blocking Modal for Fullscreen Violation
  if (started && exam.settings.antiCheat.fullScreenRequired && !isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
        <Card className="max-w-md w-full animate-in zoom-in-95 duration-200 border-red-500 border-2">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <Maximize className="h-6 w-6 mr-2" />
              Fullscreen Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-red-50 text-red-900 rounded-lg">
              <p className="font-medium">
                You have exited fullscreen mode.
              </p>
              <p className="text-sm mt-1">
                To maintain exam integrity, you must be in fullscreen mode to view questions and submit answers.
              </p>
            </div>

            <Button
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen();
                  setIsFullScreen(true);
                } catch (err) {
                  console.error("Failed to enter fullscreen:", err);
                  alert("Could not enter fullscreen. Please try getting into fullscreen manually (F11) or click again.");
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              Return to Fullscreen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = exam.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-semibold">{warningMessage}</p>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Warnings: {warnings}/3
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-sm text-gray-600">{exam.subject}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={warnings > 0 ? 'destructive' : 'outline'}>
                Warnings: {warnings}
              </Badge>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className={`text-lg font-mono font-semibold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {exam.questions.length}
            </span>
            <span className="text-sm text-gray-600">
              {answeredCount} answered
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Badge className="mb-3" variant="outline">
                  {currentQ.type.replace('_', ' ').toUpperCase()} - {currentQ.marks} marks
                </Badge>
                <CardTitle className="text-lg">{currentQ.text}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* MCQ */}
            {currentQ.type === 'mcq' && currentQ.options && (
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${answers[currentQ.id] === index
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name={currentQ.id}
                      value={index}
                      checked={answers[currentQ.id] === index}
                      onChange={(e) => handleAnswerChange(currentQ.id, parseInt(e.target.value))}
                      className="mr-3"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* True/False */}
            {currentQ.type === 'true_false' && (
              <div className="space-y-3">
                {['True', 'False'].map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${answers[currentQ.id] === index
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name={currentQ.id}
                      value={index}
                      checked={answers[currentQ.id] === index}
                      onChange={(e) => handleAnswerChange(currentQ.id, parseInt(e.target.value))}
                      className="mr-3"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Short Answer */}
            {currentQ.type === 'short_answer' && (
              <Input
                placeholder="Enter your answer here..."
                value={(answers[currentQ.id] as string) || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                className="text-lg"
              />
            )}

            {/* Long Answer */}
            {currentQ.type === 'long_answer' && (
              <Textarea
                placeholder="Write your detailed answer here..."
                value={(answers[currentQ.id] as string) || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                rows={10}
                className="text-base"
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {currentQuestion === exam.questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Submit Exam
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestion((prev) => Math.min(exam.questions.length - 1, prev + 1))}
                  >
                    Next Question
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Navigator */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 gap-2">
              {exam.questions.map((q, index) => (
                <Button
                  key={q.id}
                  variant={currentQuestion === index ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentQuestion(index)}
                  className={`relative ${answers[q.id] !== undefined ? 'border-green-500' : ''
                    }`}
                >
                  {index + 1}
                  {answers[q.id] !== undefined && (
                    <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 text-green-600" />
                  )}
                </Button>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-500 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                <span>Not Answered</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
