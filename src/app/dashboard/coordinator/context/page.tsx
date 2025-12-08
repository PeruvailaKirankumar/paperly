'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Download,
  FolderOpen,
  Plus,
  Search,
  Filter,
  BarChart3,
  Settings,
  BookOpen,
  Zap,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface ContextFile {
  document_id: string;
  filename: string;
  file_type: string;
  num_chunks: number;
  uploadDate?: string;
  size?: string;
  uploadedBy?: string;
  status?: 'processed' | 'processing' | 'failed';
  subject?: string;
  type?: string;
}

interface SystemStats {
  num_uploaded_documents: number;
  num_indexed_chunks: number;
  has_vector_store: boolean;
  supported_formats: string[];
}

const fileTypeConfig = {
  syllabus: { color: 'bg-blue-100 text-blue-800', label: 'Syllabus' },
  reference: { color: 'bg-green-100 text-green-800', label: 'Reference' },
  outcomes: { color: 'bg-purple-100 text-purple-800', label: 'Outcomes' },
  textbook: { color: 'bg-orange-100 text-orange-800', label: 'Textbook' },
  manual: { color: 'bg-cyan-100 text-cyan-800', label: 'Manual' },
  notes: { color: 'bg-yellow-100 text-yellow-800', label: 'Notes' }
};

function CoordinatorSidebar() {
  return (
    <div className="p-6">
      <nav className="space-y-2">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href="/dashboard/coordinator">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </a>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href="/dashboard/coordinator/rubrics">
            <Settings className="mr-2 h-4 w-4" />
            Rubrics Management
          </a>
        </Button>
        <Button variant="default" className="w-full justify-start">
          <Upload className="mr-2 h-4 w-4" />
          RAG Context
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href="/dashboard/coordinator/question-bank">
            <BookOpen className="mr-2 h-4 w-4" />
            Question Bank
          </a>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href="/dashboard/coordinator/generate">
            <Zap className="mr-2 h-4 w-4" />
            Generate Papers
          </a>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href="/dashboard/coordinator/lessons">
            <FileText className="mr-2 h-4 w-4" />
            Lessons & Units
          </a>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href="/dashboard/coordinator/faculty">
            <Users className="mr-2 h-4 w-4" />
            Faculty Assignment
          </a>
        </Button>
      </nav>
    </div>
  );
}

function UploadContextDialog({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [courseStructure, setCourseStructure] = useState<any>({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  useEffect(() => {
    const fetchCourseStructure = async () => {
      try {
        const result = await apiClient.getFullCourseStructure();
        if (result.data) {
          setCourseStructure(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch course structure:', error);
      }
    };
    fetchCourseStructure();
  }, []);

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      // The FileUpload component already handles individual uploads
      // We just need to trigger a refresh when complete
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Upload Context Files
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload RAG Context Files</DialogTitle>
          <DialogDescription>
            Upload syllabus, reference materials, and course documents to enhance question generation
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select value={selectedSubject} onValueChange={(value) => setSelectedSubject(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(courseStructure).map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.name}>
                      {subject.code} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unit">Unit (Optional)</Label>
              <Select value={selectedUnit} onValueChange={(value) => setSelectedUnit(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {selectedSubject && Object.values(courseStructure)
                    .find((subject: any) => subject.name === selectedSubject)
                    ?.units.map((unit: any) => (
                      <SelectItem key={unit.id} value={unit.name}>
                        Unit {unit.order}: {unit.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="fileType">File Type</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="syllabus">Syllabus</SelectItem>
                <SelectItem value="reference">Reference Material</SelectItem>
                <SelectItem value="outcomes">Course Outcomes</SelectItem>
                <SelectItem value="textbook">Textbook</SelectItem>
                <SelectItem value="manual">Lab Manual</SelectItem>
                <SelectItem value="notes">Lecture Notes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedSubject && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {selectedSubject}
                {selectedUnit && ` → ${selectedUnit}`}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Files will be associated with this course structure for better question generation context.
              </p>
            </div>
          )}

          <FileUpload
            onUpload={handleFileUpload}
            onUploadComplete={onUploadComplete}
            acceptedFileTypes=".pdf,.doc,.docx,.ppt,.pptx,.txt"
            maxFileSize={50}
            multiple={true}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Done'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RAGContextPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [documents, setDocuments] = useState<ContextFile[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch documents
      const documentsResult = await apiClient.getDocuments();
      if (documentsResult.error) {
        setError(documentsResult.error);
      } else if (documentsResult.data) {
        const processedDocs = documentsResult.data.map(doc => ({
          ...doc,
          uploadDate: new Date().toISOString().split('T')[0], // Default to today
          size: `${(Math.random() * 10 + 1).toFixed(1)} MB`, // Mock size for now
          uploadedBy: 'Current User', // Mock user for now
          status: 'processed' as const,
          subject: 'General', // Default subject
          type: 'reference' // Default type
        }));
        setDocuments(processedDocs);
      }

      // Fetch system stats
      const statsResult = await apiClient.getStats();
      if (statsResult.error) {
        console.error('Stats error:', statsResult.error);
      } else if (statsResult.data) {
        setSystemStats(statsResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const result = await apiClient.deleteDocument(documentId);
      if (result.error) {
        setError(result.error);
      } else {
        // Refresh the documents list
        fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleClearAllDocuments = async () => {
    if (confirm('Are you sure you want to delete all documents? This action cannot be undone.')) {
      try {
        const result = await apiClient.clearAllDocuments();
        if (result.error) {
          setError(result.error);
        } else {
          // Refresh the documents list
          fetchData();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to clear documents');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Processed</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const config = fileTypeConfig[type as keyof typeof fileTypeConfig] || fileTypeConfig.reference;
    return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>;
  };

  const filteredFiles = documents.filter(file => {
    const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (file.subject && file.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = subjectFilter === 'all' || file.subject === subjectFilter;
    const matchesType = typeFilter === 'all' || file.type === typeFilter;

    return matchesSearch && matchesSubject && matchesType;
  });

  const totalVectors = documents.reduce((sum, file) => sum + file.num_chunks, 0);
  const processedFiles = documents.filter(file => file.status === 'processed').length;
  const totalSize = documents.reduce((sum, file) => {
    const sizeInMB = file.size ? parseFloat(file.size.replace(' MB', '')) : 0;
    return sum + sizeInMB;
  }, 0);

  return (
    <ProtectedRoute allowedRoles={['coordinator']}>
      <DashboardLayout sidebar={<CoordinatorSidebar />}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">RAG Context Management</h1>
              <p className="mt-2 text-gray-600">
                Upload and manage context files for AI-powered question generation
              </p>
            </div>
            <UploadContextDialog onUploadComplete={fetchData} />
          </div>

          {/* Error Alert */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">{error}</span>
                  <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto">
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Files</CardTitle>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : documents.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Context documents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processed Files</CardTitle>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : processedFiles}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready for RAG
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vector Count</CardTitle>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : totalVectors.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Embedding vectors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Size</CardTitle>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : totalSize.toFixed(1)} MB
                </div>
                <p className="text-xs text-muted-foreground">
                  Storage used
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Context Files Management */}
          <Card>
            <CardHeader>
              <CardTitle>Context Files</CardTitle>
              <CardDescription>
                Manage uploaded context files for RAG-powered question generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search files by name or subject..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="Data Structures">Data Structures</SelectItem>
                    <SelectItem value="Database Systems">Database Systems</SelectItem>
                    <SelectItem value="Algorithms">Algorithms</SelectItem>
                    <SelectItem value="Web Development">Web Development</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="syllabus">Syllabus</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                    <SelectItem value="outcomes">Outcomes</SelectItem>
                    <SelectItem value="textbook">Textbook</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Files Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Vectors</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-gray-500">Loading documents...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No documents found. Upload your first context files to get started!
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFiles.map((file) => (
                        <TableRow key={file.document_id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{file.filename}</div>
                              <div className="text-sm text-gray-500">
                                {file.uploadedBy ? `by ${file.uploadedBy}` : ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{file.subject || 'General'}</TableCell>
                          <TableCell>{getTypeBadge(file.type || 'reference')}</TableCell>
                          <TableCell>{file.uploadDate || 'N/A'}</TableCell>
                          <TableCell>{file.size || 'N/A'}</TableCell>
                          <TableCell>
                            {file.num_chunks > 0 ? file.num_chunks.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(file.status || 'processed')}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" disabled>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" disabled>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteDocument(file.document_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={handleClearAllDocuments}
              disabled={isLoading || documents.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Documents
            </Button>
          </div>

          {/* Processing Status and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing Status</CardTitle>
                <CardDescription>Current status of uploaded files</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['processed', 'processing', 'failed'].map(status => {
                    const count = documents.filter(file => file.status === status).length;
                    const percentage = documents.length > 0 ? (count / documents.length) * 100 : 0;

                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            status === 'processed' ? 'bg-green-500' :
                            status === 'processing' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-sm font-medium capitalize">{status}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-500">{count} files</span>
                          <span className="text-sm font-medium">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {documents.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No documents uploaded yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File Types Distribution</CardTitle>
                <CardDescription>Breakdown by document type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    documents.reduce((acc, file) => {
                      const type = file.type || 'reference';
                      acc[type] = (acc[type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => {
                    const percentage = documents.length > 0 ? (count / documents.length) * 100 : 0;
                    const config = fileTypeConfig[type as keyof typeof fileTypeConfig] || fileTypeConfig.reference;

                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className={`${config.color} hover:${config.color} text-xs`}>
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-500">{count} files</span>
                          <span className="text-sm font-medium">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {documents.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No documents uploaded yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}