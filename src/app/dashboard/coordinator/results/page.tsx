'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Award
} from 'lucide-react';
import { examService, submissionService, type Exam, type Submission } from '@/lib/firebase/firestore';

interface ExamStats {
  examId: string;
  examTitle: string;
  subject: string;
  totalStudents: number;
  submittedCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passPercentage: number;
  antiCheatViolations: number;
}

interface StudentResult {
  studentId: string;
  studentName: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  timeTaken: number;
  violations: number;
  status: string;
}

export default function ResultsDashboard() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coordinator' && user?.role !== 'hod')) {
      router.push('/login');
      return;
    }

    loadExams();
  }, [isAuthenticated, user]);

  const loadExams = async () => {
    try {
      const result = await examService.getAll();
      if (result.success && result.data) {
        // Filter only completed exams
        const completedExams = result.data.filter(e => e.status === 'completed');
        setExams(completedExams);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExamResults = async (exam: Exam) => {
    try {
      setSelectedExam(exam);
      const result = await submissionService.getByExam(exam.id!);
      
      if (result.success && result.data) {
        setSubmissions(result.data);
        calculateStats(exam, result.data);
      }
    } catch (error) {
      console.error('Error loading results:', error);
    }
  };

  const calculateStats = (exam: Exam, submissions: Submission[]) => {
    const scores = submissions
      .filter(s => s.score !== undefined)
      .map(s => s.score!);

    const totalViolations = submissions.reduce(
      (sum, s) => sum + (s.antiCheatLog?.length || 0),
      0
    );

    const passCount = scores.filter(s => (s / exam.totalMarks) * 100 >= 40).length;

    const stats: ExamStats = {
      examId: exam.id!,
      examTitle: exam.title,
      subject: exam.subjectId, // TODO: Get subject name
      totalStudents: submissions.length,
      submittedCount: submissions.filter(s => s.status === 'evaluated').length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      passPercentage: submissions.length > 0 ? (passCount / submissions.length) * 100 : 0,
      antiCheatViolations: totalViolations
    };

    setStats(stats);
  };

  const generateReport = async () => {
    if (!selectedExam || !stats) return;

    try {
      // Generate PDF report
      const reportData = {
        exam: selectedExam,
        stats: stats,
        submissions: submissions
      };

      // TODO: Call backend API to generate PDF report
      console.log('Generating report:', reportData);
      
      alert('Report generation started. You will receive an email when ready.');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  const exportToExcel = () => {
    if (!submissions) return;

    // Prepare CSV data
    const headers = ['Student ID', 'Name', 'Score', 'Max Score', 'Percentage', 'Submitted At', 'Time Taken (mins)', 'Violations', 'Status'];
    const rows = submissions.map(s => [
      s.studentId,
      'Student Name', // TODO: Fetch from user data
      s.score || 0,
      selectedExam?.totalMarks || 0,
      s.evaluation?.percentage?.toFixed(2) || '0',
      new Date(s.submittedAt).toLocaleString(),
      Math.floor(s.timeSpent / 60),
      s.antiCheatLog?.length || 0,
      s.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExam?.title}_results.csv`;
    a.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Results & Reports</h1>
              <p className="text-gray-600 mt-1">View exam results and generate reports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Exams List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Completed Exams</CardTitle>
              <CardDescription>Select an exam to view results</CardDescription>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No completed exams</p>
              ) : (
                <div className="space-y-2">
                  {exams.map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => loadExamResults(exam)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedExam?.id === exam.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 text-sm">{exam.title}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(exam.createdAt).toLocaleDateString()}
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {exam.type === 'mock' ? 'Mock Test' : 'Exam'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedExam ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select an exam to view results</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats Cards */}
                {stats && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Total Students</p>
                              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Average Score</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {stats.averageScore.toFixed(1)}%
                              </p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Pass Rate</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {stats.passPercentage.toFixed(1)}%
                              </p>
                            </div>
                            <Award className="h-8 w-8 text-purple-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Violations</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {stats.antiCheatViolations}
                              </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Actions */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Export & Reports</CardTitle>
                            <CardDescription>Download results and generate reports</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={exportToExcel} variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Export Excel
                            </Button>
                            <Button onClick={generateReport}>
                              <FileText className="h-4 w-4 mr-2" />
                              Generate Report
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </>
                )}

                {/* Submissions Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Student Submissions</CardTitle>
                    <CardDescription>Detailed results for all students</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {submissions.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No submissions yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                Student ID
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                Score
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                Percentage
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                Time Taken
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                Violations
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {submissions.map((submission) => {
                              const percentage = submission.evaluation?.percentage || 0;
                              const grade = percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'F';
                              
                              return (
                                <tr key={submission.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {submission.studentId.substring(0, 8)}...
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {submission.score || 0}/{selectedExam?.totalMarks || 0}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-semibold ${
                                        percentage >= 80 ? 'text-green-600' :
                                        percentage >= 60 ? 'text-blue-600' :
                                        percentage >= 40 ? 'text-orange-600' :
                                        'text-red-600'
                                      }`}>
                                        {percentage.toFixed(1)}%
                                      </span>
                                      <Badge variant="outline">{grade}</Badge>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {formatTime(submission.timeSpent)}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <Badge variant={
                                      (submission.antiCheatLog?.length || 0) > 0 ? 'destructive' : 'outline'
                                    }>
                                      {submission.antiCheatLog?.length || 0}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <Badge variant={
                                      submission.status === 'evaluated' ? 'default' :
                                      submission.status === 'evaluating' ? 'outline' :
                                      'outline'
                                    }>
                                      {submission.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => router.push(`/dashboard/coordinator/results/${submission.id}`)}
                                    >
                                      View Details
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
