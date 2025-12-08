'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    BookOpen,
    Award,
    Loader2,
    MessageSquare
} from 'lucide-react';
import { submissionService, examService } from '@/lib/firebase/firestore';
import { apiClient } from '@/lib/api';

interface QuestionResult {
    question_id: string;
    question_text: string;
    question_type: string;
    max_marks: number;
    awarded_marks: number;
    feedback: string;
    is_correct?: boolean;
}

interface ResultData {
    id: string;
    examId: string;
    examTitle: string;
    subjectName: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    timeSpent: number;
    submittedAt: string;
    evaluatedAt?: string;
    status: string;
    overallFeedback: string;
    questionResults: QuestionResult[];
    antiCheatViolations: number;
}

export default function ResultPage() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const resultId = params?.resultId as string;

    const [result, setResult] = useState<ResultData | null>(null);
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'student')) {
            router.push('/login');
        }
    }, [isAuthenticated, authLoading, user, router]);

    useEffect(() => {
        if (resultId && user) {
            loadResult();
        }
    }, [resultId, user]);

    const loadResult = async () => {
        try {
            // Fetch submission data
            const submissionResult = await submissionService.getById(resultId);

            if (!submissionResult.success || !submissionResult.data) {
                setError('Result not found');
                setLoading(false);
                return;
            }

            const submission = submissionResult.data;

            // Check if this belongs to the current user
            if (submission.studentId !== user?.id) {
                setError('You do not have permission to view this result');
                setLoading(false);
                return;
            }

            // Fetch exam details
            let examTitle = 'Unknown Exam';
            let subjectName = 'Unknown Subject';

            if (submission.examId) {
                const examResult = await examService.getById(submission.examId);
                if (examResult.success && examResult.data) {
                    examTitle = examResult.data.title;
                    subjectName = examResult.data.subjectId; // Could resolve to name via API
                }
            }

            const evaluation: any = submission.evaluation || {};
            const questionResults: QuestionResult[] = evaluation.questionScores || [];

            setResult({
                id: submission.id!,
                examId: submission.examId,
                examTitle,
                subjectName,
                totalScore: evaluation.totalScore || 0,
                maxScore: evaluation.maxScore || 100,
                percentage: evaluation.percentage || 0,
                timeSpent: submission.timeSpent || 0,
                submittedAt: submission.submittedAt,
                evaluatedAt: evaluation.evaluatedAt,
                status: submission.status,
                overallFeedback: evaluation.feedback || 'Evaluation pending...',
                questionResults,
                antiCheatViolations: submission.antiCheatLog?.length || 0
            });
        } catch (err) {
            console.error('Error loading result:', err);
            setError('Failed to load result');
        } finally {
            setLoading(false);
        }
    };

    const requestEvaluation = async () => {
        if (!result || !user) return;

        setEvaluating(true);
        try {
            // Fetch submission to get answers
            const submissionResult = await submissionService.getById(resultId);
            if (!submissionResult.success || !submissionResult.data) {
                throw new Error('Could not fetch submission');
            }

            const submission = submissionResult.data;

            // Call evaluation endpoint
            const evalResult = await apiClient.evaluateSubmission({
                submission_id: resultId,
                exam_id: submission.examId,
                student_id: user.id,
                answers: submission.answers?.map((a: any) => ({
                    question_id: a.questionId,
                    answer: String(a.answer),
                    time_spent: a.timeSpent || 0
                })) || []
            });

            if (evalResult.error) {
                throw new Error(evalResult.error);
            }

            // Reload results
            await loadResult();
        } catch (err: any) {
            console.error('Error requesting evaluation:', err);
            alert(`Failed to get analysis: ${err.message || 'Please try again.'}`);
        } finally {
            setEvaluating(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 60) return 'text-blue-600';
        if (percentage >= 40) return 'text-orange-600';
        return 'text-red-600';
    };

    const getScoreBg = (percentage: number) => {
        if (percentage >= 80) return 'bg-green-100';
        if (percentage >= 60) return 'bg-blue-100';
        if (percentage >= 40) return 'bg-orange-100';
        return 'bg-red-100';
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading results...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center text-red-600">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            Error
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={() => router.push('/dashboard/student')} className="w-full">
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!result) {
        return null;
    }

    const isPending = result.status === 'submitted' && !result.evaluatedAt;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={() => router.push('/dashboard/student')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                        <Badge variant={isPending ? 'outline' : 'default'}>
                            {isPending ? 'Evaluation Pending' : 'Evaluated'}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Score Overview */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{result.examTitle}</h1>
                            <p className="text-gray-600">{result.subjectName}</p>
                        </div>

                        {isPending ? (
                            <div className="text-center py-8">
                                {evaluating ? (
                                    <>
                                        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                                        <p className="text-lg font-medium text-gray-700">Generating Detailed Analysis...</p>
                                        <p className="text-gray-500">AI is evaluating your answers. This may take 30-60 seconds.</p>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                                        <p className="text-lg font-medium text-gray-700">Evaluation Not Yet Completed</p>
                                        <p className="text-gray-500 mb-4">Your submission hasn't been evaluated yet.</p>
                                        <div className="flex gap-2 justify-center">
                                            <Button onClick={requestEvaluation} className="bg-blue-600 hover:bg-blue-700">
                                                Get Detailed Analysis
                                            </Button>
                                            <Button onClick={loadResult} variant="outline">
                                                Refresh Status
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-center mb-6">
                                    <div className={`w-40 h-40 rounded-full ${getScoreBg(result.percentage)} flex items-center justify-center`}>
                                        <div className="text-center">
                                            <p className={`text-4xl font-bold ${getScoreColor(result.percentage)}`}>
                                                {result.percentage.toFixed(1)}%
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {result.totalScore}/{result.maxScore}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <Clock className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                                        <p className="text-sm text-gray-600">Time Spent</p>
                                        <p className="font-semibold">{formatTime(result.timeSpent)}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <BookOpen className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                                        <p className="text-sm text-gray-600">Questions</p>
                                        <p className="font-semibold">{result.questionResults.length}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                                        <p className="text-sm text-gray-600">Violations</p>
                                        <p className="font-semibold">{result.antiCheatViolations}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Overall Feedback */}
                {!isPending && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg">
                                <Award className="h-5 w-5 mr-2" />
                                Detailed Performance Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                {result.overallFeedback.split('\n').map((line, idx) => {
                                    // Style different sections
                                    if (line.startsWith('🏆') || line.startsWith('🌟') || line.startsWith('✅') ||
                                        line.startsWith('📊') || line.startsWith('📝') || line.startsWith('⚠️') || line.startsWith('❌')) {
                                        return (
                                            <p key={idx} className="text-lg font-bold text-gray-900">
                                                {line}
                                            </p>
                                        );
                                    }
                                    if (line.startsWith('📈') || line.startsWith('💪') || line.startsWith('📚') || line.startsWith('🎯')) {
                                        return (
                                            <p key={idx} className="font-semibold text-gray-800 mt-4 pt-2 border-t">
                                                {line}
                                            </p>
                                        );
                                    }
                                    if (line.startsWith('  •') || line.startsWith('  →') || line.startsWith('  1.') || line.startsWith('  2.') || line.startsWith('  3.')) {
                                        return (
                                            <p key={idx} className="text-gray-600 ml-4">
                                                {line}
                                            </p>
                                        );
                                    }
                                    if (line.trim() === '') return null;
                                    return (
                                        <p key={idx} className="text-gray-700">
                                            {line}
                                        </p>
                                    );
                                })}
                            </div>
                            {result.evaluatedAt && (
                                <p className="text-sm text-gray-500 mt-4 text-right">
                                    Evaluated on: {new Date(result.evaluatedAt).toLocaleString()}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Question-wise Results */}
                {!isPending && result.questionResults.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Question-wise Results</CardTitle>
                            <CardDescription>Detailed breakdown of your performance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {result.questionResults.map((q, index) => (
                                    <div key={q.question_id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-700">Q{index + 1}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {q.question_type.replace('_', ' ')}
                                                </Badge>
                                                {q.is_correct !== undefined && (
                                                    q.is_correct ? (
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-red-600" />
                                                    )
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-bold ${q.awarded_marks === q.max_marks ? 'text-green-600' : q.awarded_marks > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                                    {q.awarded_marks}
                                                </span>
                                                <span className="text-gray-400">/{q.max_marks}</span>
                                            </div>
                                        </div>

                                        <p className="text-gray-800 mb-2">{q.question_text}</p>

                                        <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                                            <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                                            <p className="text-sm text-gray-600">{q.feedback}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
