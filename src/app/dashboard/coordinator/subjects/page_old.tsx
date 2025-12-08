'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  BookOpen,
  Plus,
  Upload,
  FileText,
  Trash2,
  Edit,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { storageService } from '@/lib/firebase/storage';
import { subjectService, materialService, ragService } from '@/lib/firebase/firestore';
import apiClient from '@/lib/api';

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

interface Material {
  id: string;
  subjectId: string;
  fileName: string;
  downloadURL: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  ragProcessed?: boolean;
}

interface RAGStatus {
  exists: boolean;
  numDocuments?: number;
  hasVectorStore?: boolean;
  path?: string;
}

export default function AdminSubjectsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingRAG, setProcessingRAG] = useState(false);
  const [ragProgress, setRagProgress] = useState<string>('');

  // Modal states
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showUploadMaterial, setShowUploadMaterial] = useState(false);

  // Form states
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coordinator' && user?.role !== 'hod')) {
      router.push('/login');
      return;
    }

    loadSubjects();
  }, [isAuthenticated, user]);

  const loadSubjects = async () => {
    try {
      const result = await subjectService.getAll();
      if (result.success && result.data) {
        setSubjects(result.data);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async (subjectId: string) => {
    try {
      const result = await materialService.getBySubject(subjectId);
      if (result.success && result.data) {
        setMaterials(result.data);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await subjectService.create({
        ...subjectForm,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (result.success) {
        setShowAddSubject(false);
        setSubjectForm({ name: '', code: '', description: '' });
        await loadSubjects();
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

  const handleUploadMaterials = async () => {
    if (!selectedSubject || selectedFiles.length === 0) return;

    setUploading(true);

    try {
      for (const file of selectedFiles) {
        // Upload to Firebase Storage
        const uploadResult = await storageService.uploadMaterial(file, selectedSubject.id);

        if (uploadResult.success && uploadResult.url && uploadResult.path) {
          // Save metadata to Firestore
          await materialService.create({
            subjectId: selectedSubject.id,
            fileName: file.name,
            storagePath: uploadResult.path,
            downloadURL: uploadResult.url,
            fileSize: file.size,
            fileType: file.type,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user!.id,
            ragProcessed: false
          });
        }
      }

      setShowUploadMaterial(false);
      setSelectedFiles([]);
      await loadMaterials(selectedSubject.id);
      alert('Materials uploaded successfully!');
    } catch (error) {
      console.error('Error uploading materials:', error);
      alert('Failed to upload materials');
    } finally {
      setUploading(false);
    }
  };

  const handleProcessRAG = async () => {
    if (!selectedSubject) return;

    setProcessingRAG(true);

    try {
      // Get all materials for this subject
      const unprocessedMaterials = materials.filter(m => !m.ragProcessed);

      if (unprocessedMaterials.length === 0) {
        alert('All materials have already been processed');
        return;
      }

      // Upload documents to backend for RAG processing
      for (const material of unprocessedMaterials) {
        // Fetch the file from Firebase Storage
        const response = await fetch(material.downloadURL);
        const blob = await response.blob();
        const file = new File([blob], material.fileName, { type: material.fileType });

        // Upload to backend API
        const uploadResult = await apiClient.uploadDocument(file);

        if (uploadResult.status === 200) {
          // Mark as processed in Firestore
          await materialService.update(material.id!, {
            ragProcessed: true
          });
        }
      }

      // Save RAG data reference to Firestore
      await ragService.create({
        subjectId: selectedSubject.id,
        materialIds: materials.map(m => m.id!),
        embeddings: {}, // Backend handles actual embeddings
        chunks: [],
        createdAt: new Date().toISOString(),
        createdBy: user!.id,
        version: '1.0'
      });

      await loadMaterials(selectedSubject.id);
      alert('RAG processing completed successfully!');
    } catch (error) {
      console.error('Error processing RAG:', error);
      alert('Failed to process RAG data');
    } finally {
      setProcessingRAG(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      // Delete from storage
      await storageService.deleteFile(storagePath);
      
      // Delete from Firestore
      await materialService.delete(materialId);
      
      if (selectedSubject) {
        await loadMaterials(selectedSubject.id);
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Failed to delete material');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
              <h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
              <p className="text-gray-600 mt-1">Manage subjects and upload study materials</p>
            </div>
            <Button onClick={() => setShowAddSubject(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subjects List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
              <CardDescription>Select a subject to manage materials</CardDescription>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No subjects available</p>
              ) : (
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => {
                        setSelectedSubject(subject);
                        loadMaterials(subject.id);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedSubject?.id === subject.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{subject.name}</div>
                      <div className="text-sm text-gray-600">{subject.code}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Materials Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedSubject ? selectedSubject.name : 'Select a Subject'}
                  </CardTitle>
                  <CardDescription>
                    {selectedSubject
                      ? 'Upload and manage study materials'
                      : 'Choose a subject to view materials'}
                  </CardDescription>
                </div>
                {selectedSubject && (
                  <div className="flex gap-2">
                    <Button onClick={() => setShowUploadMaterial(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <Button
                      onClick={handleProcessRAG}
                      disabled={processingRAG || materials.length === 0}
                      variant="outline"
                    >
                      {processingRAG ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Process RAG
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedSubject ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a subject to view materials</p>
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No materials uploaded yet</p>
                  <Button onClick={() => setShowUploadMaterial(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First Material
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">
                              {material.fileName}
                            </p>
                            {material.ragProcessed && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                RAG Processed
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(material.fileSize)} • Uploaded{' '}
                            {new Date(material.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(material.downloadURL, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMaterial(material.id!, material.storagePath)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add New Subject</CardTitle>
              <CardDescription>Create a new subject for your curriculum</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Subject Name</label>
                  <Input
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    placeholder="e.g., Data Structures"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject Code</label>
                  <Input
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    placeholder="e.g., CS301"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <Textarea
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                    placeholder="Brief description of the subject"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowAddSubject(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Subject</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Material Modal */}
      {showUploadMaterial && selectedSubject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Upload Materials</CardTitle>
              <CardDescription>Upload study materials for {selectedSubject.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Files</label>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Supported: PDF, DOC, DOCX, PPT, PPTX, TXT
                </p>
              </div>
              {selectedFiles.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">Selected Files:</p>
                  <ul className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {file.name} ({formatFileSize(file.size)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowUploadMaterial(false);
                    setSelectedFiles([]);
                  }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadMaterials}
                  disabled={uploading || selectedFiles.length === 0}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
