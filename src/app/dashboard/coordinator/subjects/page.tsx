'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BookOpen,
  Plus,
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  RefreshCw,
  Database,
  BarChart3,
  Settings,
  Users,
  Zap
} from 'lucide-react';
import { apiClient } from '@/lib/api';

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
  rag_path: string | null;
  stats: {
    num_documents: number;
    has_vector_store: boolean;
  } | null;
}

function CoordinatorSidebar() {
  return (
    <div className="p-6">
      <nav className="space-y-2">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/rubrics">
            <Settings className="mr-2 h-4 w-4" />
            Rubrics Management
          </Link>
        </Button>
        <Button variant="default" className="w-full justify-start">
          <BookOpen className="mr-2 h-4 w-4" />
          Subjects & Materials
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/question-bank">
            <FileText className="mr-2 h-4 w-4" />
            Question Bank
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/generate">
            <Zap className="mr-2 h-4 w-4" />
            Generate Papers
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/lessons">
            <FileText className="mr-2 h-4 w-4" />
            Lessons & Units
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/faculty">
            <Users className="mr-2 h-4 w-4" />
            Faculty Assignment
          </Link>
        </Button>
      </nav>
    </div>
  );
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
  // Form states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', description: '' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      checkRAGStatus(selectedSubject.id);
    }
  }, [selectedSubject]);

  const loadSubjects = async () => {
    try {
      const result = await apiClient.getSubjects();
      if (result.data) {
        setSubjects(result.data);
        if (result.data.length > 0 && !selectedSubject) {
          setSelectedSubject(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkRAGStatus = async (subjectId: string) => {
    try {
      const result = await apiClient.getRAGStatus(subjectId);
      if (result.data) {
        setRagStatus(result.data);
      }
    } catch (error) {
      console.error('Error checking RAG status:', error);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await apiClient.createSubject(subjectForm);
      if (result.data) {
        await loadSubjects();
        setShowAddDialog(false);
        setSubjectForm({ name: '', code: '', description: '' });
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Failed to add subject');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleProcessRAG = async () => {
    if (!selectedSubject || selectedFiles.length === 0) {
      alert('Please select files to process');
      return;
    }

    setProcessing(true);
    setUploadProgress('Uploading files...');

    try {
      // Process RAG data
      setUploadProgress('Processing documents and creating embeddings...');
      const result = await apiClient.processRAGForSubject(selectedSubject.id, selectedFiles);
      
      if (result.data) {
        setUploadProgress(`✓ Processed ${result.data.files_processed.length} files (${result.data.num_chunks} chunks)`);
        
        // Refresh RAG status
        await checkRAGStatus(selectedSubject.id);
        setSelectedFiles([]);
        
        setTimeout(() => {
          setUploadProgress('');
          alert('RAG data processed successfully!');
        }, 2000);
      } else {
        setUploadProgress('');
        alert(result.error || 'Failed to process RAG data');
      }
    } catch (error) {
      console.error('Error processing RAG:', error);
      setUploadProgress('');
      alert('Failed to process RAG data');
    } finally {
      setProcessing(false);
    }
  };

  const handleRegenerateRAG = async () => {
    if (!selectedSubject) return;
    
    if (!confirm('Are you sure you want to regenerate RAG data? This will delete existing data.')) {
      return;
    }

    setProcessing(true);
    setUploadProgress('Deleting existing RAG data...');

    try {
      // Delete existing RAG data
      await apiClient.deleteRAGData(selectedSubject.id);
      
      setUploadProgress('Please upload new materials to regenerate RAG data');
      await checkRAGStatus(selectedSubject.id);
      
      setTimeout(() => {
        setUploadProgress('');
      }, 3000);
    } catch (error) {
      console.error('Error deleting RAG data:', error);
      setUploadProgress('');
      alert('Failed to delete RAG data');
    } finally {
      setProcessing(false);
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900">Subjects & Materials</h1>
              <p className="mt-2 text-gray-600">
                Manage subjects and upload materials for RAG-based question generation
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subjects List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Subjects</CardTitle>
                <CardDescription>Select a subject to manage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subjects.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No subjects yet. Add one to get started.
                    </p>
                  ) : (
                    subjects.map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => setSelectedSubject(subject)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedSubject?.id === subject.id
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="font-medium">{subject.name}</div>
                        <div className="text-sm text-gray-500">{subject.code}</div>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* RAG Management */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  RAG Data Management
                </CardTitle>
                <CardDescription>
                  {selectedSubject
                    ? `Upload materials for ${selectedSubject.name}`
                    : 'Select a subject to manage RAG data'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedSubject ? (
                  <div className="text-center py-12 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a subject to manage materials and RAG data</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* RAG Status */}
                    {ragStatus && (
                      <div className={`p-4 rounded-lg border ${
                        ragStatus.rag_exists
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {ragStatus.rag_exists ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="font-medium text-green-900">RAG Data Available</p>
                                  <p className="text-sm text-green-700">
                                    {ragStatus.stats?.num_documents || 0} documents indexed
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                                <div>
                                  <p className="font-medium text-yellow-900">No RAG Data</p>
                                  <p className="text-sm text-yellow-700">
                                    Upload materials to generate RAG data
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                          {ragStatus.rag_exists && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRegenerateRAG}
                              disabled={processing}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Regenerate
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Upload Section */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="files">Upload Materials (PDF, PPTX)</Label>
                        <Input
                          id="files"
                          type="file"
                          multiple
                          accept=".pdf,.pptx"
                          onChange={handleFileSelect}
                          className="mt-1"
                          disabled={processing}
                        />
                      </div>

                      {selectedFiles.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-2">Selected Files:</p>
                          <ul className="text-sm space-y-1">
                            {selectedFiles.map((file, index) => (
                              <li key={index} className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span>{file.name}</span>
                                <span className="text-gray-500">
                                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {uploadProgress && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {processing && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                            <p className="text-sm text-blue-900">{uploadProgress}</p>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleProcessRAG}
                        disabled={processing || selectedFiles.length === 0}
                        className="w-full"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Process RAG Data ({selectedFiles.length} files)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Subject Dialog */}
          {showAddDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Add New Subject</CardTitle>
                  <CardDescription>Create a new subject for material management</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddSubject} className="space-y-4">
                    <div>
                      <Label htmlFor="code">Subject Code</Label>
                      <Input
                        id="code"
                        value={subjectForm.code}
                        onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                        placeholder="e.g., CS301"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Subject Name</Label>
                      <Input
                        id="name"
                        value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        placeholder="e.g., Data Structures"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={subjectForm.description}
                        onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                        placeholder="Brief description..."
                        rows={3}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button type="submit" className="flex-1">Add Subject</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddDialog(false);
                          setSubjectForm({ name: '', code: '', description: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
