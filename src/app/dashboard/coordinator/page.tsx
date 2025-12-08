'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
  Upload,
  Settings,
  BookOpen,
  Users,
  Zap,
  Eye,
  BarChart3,
  Loader2
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { subjectService, examService } from '@/lib/firebase/firestore';

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface RAGStatus {
  subject_id: string;
  rag_exists: boolean;
  stats?: {
    num_documents: number;
  };
}

function CoordinatorSidebar() {
  return (
    <div className="p-6">
      <nav className="space-y-2">
        <Button variant="default" className="w-full justify-start">
          <BarChart3 className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/subjects">
            <BookOpen className="mr-2 h-4 w-4" />
            Subjects & Materials
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/generate">
            <Zap className="mr-2 h-4 w-4" />
            Generate Papers
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/mock-exams">
            <FileText className="mr-2 h-4 w-4" />
            Mock Exams
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/lessons">
            <Settings className="mr-2 h-4 w-4" />
            Lessons & Units
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/faculty">
            <Users className="mr-2 h-4 w-4" />
            Faculty Assignment
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/results">
            <FileText className="mr-2 h-4 w-4" />
            View Results
          </Link>
        </Button>
      </nav>
    </div>
  );
}

export default function CoordinatorDashboard() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [ragStatuses, setRagStatuses] = useState<Record<string, RAGStatus>>({});
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRAGDocs, setTotalRAGDocs] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load subjects from backend
      const subjectsResult = await apiClient.getSubjects();
      if (subjectsResult.data) {
        setSubjects(subjectsResult.data);

        // Load RAG status for each subject
        const statuses: Record<string, RAGStatus> = {};
        let totalDocs = 0;
        for (const subject of subjectsResult.data) {
          const ragResult = await apiClient.getRAGStatus(subject.id);
          if (ragResult.data) {
            statuses[subject.id] = ragResult.data;
            if (ragResult.data.stats) {
              totalDocs += ragResult.data.stats.num_documents;
            }
          }
        }
        setRagStatuses(statuses);
        setTotalRAGDocs(totalDocs);
      }

      // Load exams from Firebase
      const examsResult = await examService.getAll();
      if (examsResult.success && examsResult.data) {
        setExams(examsResult.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const subjectsWithRAG = Object.values(ragStatuses).filter(s => s.rag_exists).length;

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['coordinator', 'hod']}>
        <DashboardLayout sidebar={<CoordinatorSidebar />}>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['coordinator', 'hod']}>
      <DashboardLayout sidebar={<CoordinatorSidebar />}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Manage subjects, upload materials, and generate question papers
              </p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/dashboard/coordinator/generate">
                <Zap className="mr-2 h-4 w-4" />
                Generate New Paper
              </Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subjects.length}</div>
                <p className="text-xs text-muted-foreground">
                  {subjectsWithRAG} with RAG data
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RAG Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRAGDocs}</div>
                <p className="text-xs text-muted-foreground">Indexed chunks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{exams.length}</div>
                <p className="text-xs text-muted-foreground">Created exams</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {exams.filter(e => e.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">Currently open</p>
              </CardContent>
            </Card>
          </div>

          {/* Subjects & RAG Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subjects & RAG Status</CardTitle>
                <CardDescription>
                  Manage subjects and their RAG data availability
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/dashboard/coordinator/subjects">
                  <Upload className="mr-2 h-4 w-4" />
                  Manage Subjects
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No subjects created yet</p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/coordinator/subjects">Add Your First Subject</Link>
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject Code</TableHead>
                        <TableHead>Subject Name</TableHead>
                        <TableHead>RAG Status</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((subject) => {
                        const ragStatus = ragStatuses[subject.id];
                        return (
                          <TableRow key={subject.id}>
                            <TableCell className="font-medium">{subject.code}</TableCell>
                            <TableCell>{subject.name}</TableCell>
                            <TableCell>
                              {ragStatus?.rag_exists ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  ✓ Available
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                  ⚠ Missing
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {ragStatus?.stats?.num_documents || 0} chunks
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard/coordinator/subjects">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Exams */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Exams</CardTitle>
                <CardDescription>
                  Latest exams created in the system
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/coordinator/generate">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No exams created yet</p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/coordinator/generate">Create First Exam</Link>
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Total Marks</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exams.slice(0, 5).map((exam) => (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">{exam.title}</TableCell>
                          <TableCell>{exam.subject}</TableCell>
                          <TableCell>{exam.totalMarks}</TableCell>
                          <TableCell>{exam.questions?.length || 0}</TableCell>
                          <TableCell>
                            <Badge>
                              {exam.status || 'draft'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}