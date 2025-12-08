'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { examService, submissionService, Exam, Submission } from '@/lib/firebase/firestore';
import { apiClient } from '@/lib/api';

interface ExamCard {
  id: string;
  title: string;
  subject: string;
  subjectName?: string;
  type: 'mock' | 'question_paper';
  duration: number;
  totalMarks: number;
  scheduledAt?: string;
  status: 'upcoming' | 'active' | 'completed' | 'draft' | 'scheduled';
}

interface Result {
  id: string;
  examTitle: string;
  subject: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function StudentDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [availableExams, setAvailableExams] = useState<ExamCard[]>([]);
  const [pastResults, setPastResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'student')) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (user) {
      loadStudentData();
    }
  }, [user]);

  const loadStudentData = async () => {
    if (!user) return;

    try {
      // Load subjects for name lookup
      const subjectsResult = await apiClient.getSubjects();
      let subjectMap: Record<string, string> = {};
      if (subjectsResult.data) {
        setSubjects(subjectsResult.data);
        subjectsResult.data.forEach((s: Subject) => {
          subjectMap[s.id] = s.name;
        });
      }

      // Load active exams from Firestore
      const examsResult = await examService.getActive();
      if (examsResult.success && examsResult.data) {
        const exams: ExamCard[] = examsResult.data
          .filter(e => e.type === 'mock') // Only show mock exams to students
          .map((exam: Exam) => ({
            id: exam.id!,
            title: exam.title,
            subject: exam.subjectId,
            subjectName: subjectMap[exam.subjectId] || exam.subjectId,
            type: exam.type,
            duration: exam.duration,
            totalMarks: exam.totalMarks,
            scheduledAt: exam.scheduledAt,
            status: exam.status
          }));
        setAvailableExams(exams);
      }

      // Load past submissions/results
      const submissionsResult = await submissionService.getByStudent(user.id);
      if (submissionsResult.success && submissionsResult.data) {
        const results: Result[] = await Promise.all(
          submissionsResult.data.map(async (submission: Submission) => {
            // Get exam details for each submission
            const examResult = await examService.getById(submission.examId);
            const exam = examResult.data;

            return {
              id: submission.id!,
              examTitle: exam?.title || 'Unknown Exam',
              subject: subjectMap[exam?.subjectId || ''] || exam?.subjectId || 'Unknown',
              score: submission.evaluation?.totalScore || 0,
              maxScore: submission.evaluation?.maxScore || exam?.totalMarks || 100,
              percentage: submission.evaluation?.percentage || 0,
              submittedAt: submission.submittedAt
            };
          })
        );
        setPastResults(results);
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStudentData();
  };

  const handleStartExam = (examId: string) => {
    router.push(`/dashboard/student/exam/${examId}`);
  };

  const handleViewResult = (resultId: string) => {
    router.push(`/dashboard/student/results/${resultId}`);
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalExams: pastResults.length,
    averageScore: pastResults.length > 0
      ? pastResults.reduce((acc, r) => acc + r.percentage, 0) / pastResults.length
      : 0,
    upcomingExams: availableExams.filter(e => e.status === 'scheduled').length,
    activeExams: availableExams.filter(e => e.status === 'active').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => router.push('/dashboard/student/profile')}>
                View Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Exams</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageScore.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.upcomingExams}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Now</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeExams}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Exams */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Available Exams
            </CardTitle>
            <CardDescription>Take your scheduled exams and mock tests</CardDescription>
          </CardHeader>
          <CardContent>
            {availableExams.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No exams available at the moment</p>
                <p className="text-sm">Check back later for new mock exams</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                        <Badge variant={exam.status === 'active' ? 'default' : 'outline'}>
                          {exam.status}
                        </Badge>
                        <Badge variant="outline">{exam.type === 'mock' ? 'Mock Test' : 'Exam'}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-1" />
                          {exam.subjectName || exam.subject}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {exam.duration} mins
                        </span>
                        <span>{exam.totalMarks} marks</span>
                        {exam.scheduledAt && (
                          <span>
                            Scheduled: {new Date(exam.scheduledAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleStartExam(exam.id)}
                      disabled={exam.status !== 'active'}
                      variant={exam.status === 'active' ? 'default' : 'outline'}
                    >
                      {exam.status === 'active' ? 'Start Exam' : 'View Details'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Past Results
            </CardTitle>
            <CardDescription>View your exam performance history</CardDescription>
          </CardHeader>
          <CardContent>
            {pastResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No results available yet</p>
                <p className="text-sm">Complete exams to see your results here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{result.examTitle}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-1" />
                          {result.subject}
                        </span>
                        <span>
                          Score: {result.score}/{result.maxScore}
                        </span>
                        <span>
                          Submitted: {new Date(result.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${result.percentage >= 80 ? 'text-green-600' :
                            result.percentage >= 60 ? 'text-blue-600' :
                              result.percentage >= 40 ? 'text-orange-600' :
                                'text-red-600'
                          }`}>
                          {result.percentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">Percentage</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewResult(result.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
