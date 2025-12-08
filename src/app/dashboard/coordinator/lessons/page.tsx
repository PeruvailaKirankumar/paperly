'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Settings,
  Upload,
  Zap,
  Users,
  Database
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

interface Unit {
  id: string;
  subject_id: string;
  name: string;
  description?: string;
  order: number;
  created_at: string;
  updated_at: string;
}

interface Lesson {
  id: string;
  unit_id: string;
  name: string;
  description?: string;
  order: number;
  learning_objectives?: string[];
  created_at: string;
  updated_at: string;
}

interface CourseStructure {
  [subjectId: string]: {
    id: string;
    name: string;
    code: string;
    description?: string;
    units: Array<{
      id: string;
      name: string;
      description?: string;
      order: number;
      lessons: Lesson[];
    }>;
  };
}

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
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href="/dashboard/coordinator/context">
            <Upload className="mr-2 h-4 w-4" />
            RAG Context
          </a>
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

function CreateSubjectDialog({ onSubjectCreated }: { onSubjectCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.createSubject(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setFormData({ name: '', code: '', description: '' });
        setOpen(false);
        onSubjectCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Subject</DialogTitle>
          <DialogDescription>
            Add a new subject to organize your course structure
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject-name">Subject Name</Label>
            <Input
              id="subject-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Data Structures"
              required
            />
          </div>
          <div>
            <Label htmlFor="subject-code">Subject Code</Label>
            <Input
              id="subject-code"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              placeholder="e.g., CS201"
              required
            />
          </div>
          <div>
            <Label htmlFor="subject-description">Description</Label>
            <Textarea
              id="subject-description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of the subject"
              rows={3}
            />
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Subject'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateUnitDialog({ subjectId, onUnitCreated }: { subjectId: string; onUnitCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.createUnit({
        subject_id: subjectId,
        ...formData
      });
      if (result.error) {
        setError(result.error);
      } else {
        setFormData({ name: '', description: '', order: 1 });
        setOpen(false);
        onUnitCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Unit</DialogTitle>
          <DialogDescription>
            Add a new unit to this subject
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="unit-name">Unit Name</Label>
            <Input
              id="unit-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Linear Data Structures"
              required
            />
          </div>
          <div>
            <Label htmlFor="unit-order">Order</Label>
            <Input
              id="unit-order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 1})}
              min="1"
              required
            />
          </div>
          <div>
            <Label htmlFor="unit-description">Description</Label>
            <Textarea
              id="unit-description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of the unit"
              rows={3}
            />
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Unit'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateLessonDialog({ unitId, onLessonCreated }: { unitId: string; onLessonCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order: 1,
    learning_objectives: ['']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const objectives = formData.learning_objectives.filter(obj => obj.trim() !== '');
      const result = await apiClient.createLesson({
        unit_id: unitId,
        name: formData.name,
        description: formData.description,
        order: formData.order,
        learning_objectives: objectives.length > 0 ? objectives : undefined
      });
      if (result.error) {
        setError(result.error);
      } else {
        setFormData({ name: '', description: '', order: 1, learning_objectives: [''] });
        setOpen(false);
        onLessonCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addObjective = () => {
    setFormData({...formData, learning_objectives: [...formData.learning_objectives, '']});
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...formData.learning_objectives];
    newObjectives[index] = value;
    setFormData({...formData, learning_objectives: newObjectives});
  };

  const removeObjective = (index: number) => {
    if (formData.learning_objectives.length > 1) {
      const newObjectives = formData.learning_objectives.filter((_, i) => i !== index);
      setFormData({...formData, learning_objectives: newObjectives});
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Lesson
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Lesson</DialogTitle>
          <DialogDescription>
            Add a new lesson to this unit
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="lesson-name">Lesson Name</Label>
            <Input
              id="lesson-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Introduction to Arrays"
              required
            />
          </div>
          <div>
            <Label htmlFor="lesson-order">Order</Label>
            <Input
              id="lesson-order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 1})}
              min="1"
              required
            />
          </div>
          <div>
            <Label htmlFor="lesson-description">Description</Label>
            <Textarea
              id="lesson-description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of the lesson"
              rows={3}
            />
          </div>
          <div>
            <Label>Learning Objectives</Label>
            <div className="space-y-2 mt-2">
              {formData.learning_objectives.map((objective, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={objective}
                    onChange={(e) => updateObjective(index, e.target.value)}
                    placeholder="Enter learning objective"
                  />
                  {formData.learning_objectives.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeObjective(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addObjective}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Objective
              </Button>
            </div>
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Lesson'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LessonsManagementPage() {
  const [courseStructure, setCourseStructure] = useState<CourseStructure>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [aiOrganizing, setAiOrganizing] = useState<string | null>(null);
  const [ragDocuments, setRagDocuments] = useState<{[subjectId: string]: any}>({});

  const fetchCourseStructure = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.getFullCourseStructure();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setCourseStructure(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch course structure');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseStructure();
  }, []);

  const fetchRAGDocuments = async (subjectId: string) => {
    try {
      const result = await apiClient.getRAGDocuments(subjectId);
      if (result.data) {
        setRagDocuments(prev => ({
          ...prev,
          [subjectId]: result.data
        }));
      }
    } catch (err) {
      console.error('Error fetching RAG documents:', err);
    }
  };

  const handleAutoOrganize = async (subjectId: string) => {
    if (!confirm('Use AI to automatically organize materials into units and lessons? This may take a moment.')) {
      return;
    }

    setAiOrganizing(subjectId);
    setError(null);

    try {
      const result = await apiClient.organizeMaterialsAI(subjectId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        // Create units and lessons based on AI organization
        const organization = result.data.organization;
        
        for (const unitData of organization.units) {
          // Create unit
          const unitResult = await apiClient.createUnit({
            subject_id: subjectId,
            name: unitData.name,
            description: unitData.description,
            order: unitData.order
          });

          if (unitResult.data) {
            const unitId = unitResult.data.id;

            // Create lessons for this unit
            for (const lessonData of unitData.lessons) {
              await apiClient.createLesson({
                unit_id: unitId,
                name: lessonData.name,
                description: lessonData.description,
                order: lessonData.order,
                learning_objectives: lessonData.learning_objectives
              });
            }
          }
        }

        // Refresh course structure
        await fetchCourseStructure();
        alert('Materials organized successfully! Review and adjust as needed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to organize materials');
    } finally {
      setAiOrganizing(null);
    }
  };

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (confirm('Are you sure you want to delete this subject and all its units and lessons?')) {
      try {
        const result = await apiClient.deleteSubject(subjectId);
        if (result.error) {
          setError(result.error);
        } else {
          fetchCourseStructure();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete subject');
      }
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (confirm('Are you sure you want to delete this unit and all its lessons?')) {
      try {
        const result = await apiClient.deleteUnit(unitId);
        if (result.error) {
          setError(result.error);
        } else {
          fetchCourseStructure();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete unit');
      }
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (confirm('Are you sure you want to delete this lesson?')) {
      try {
        const result = await apiClient.deleteLesson(lessonId);
        if (result.error) {
          setError(result.error);
        } else {
          fetchCourseStructure();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete lesson');
      }
    }
  };

  const totalSubjects = Object.keys(courseStructure).length;
  const totalUnits = Object.values(courseStructure).reduce((sum, subject) => sum + subject.units.length, 0);
  const totalLessons = Object.values(courseStructure).reduce((sum, subject) =>
    sum + subject.units.reduce((unitSum, unit) => unitSum + unit.lessons.length, 0), 0
  );

  return (
    <ProtectedRoute allowedRoles={['coordinator']}>
      <DashboardLayout sidebar={<CoordinatorSidebar />}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lessons & Units Management</h1>
              <p className="mt-2 text-gray-600">
                Organize your course structure with subjects, units, and lessons
              </p>
            </div>
            <CreateSubjectDialog onSubjectCreated={fetchCourseStructure} />
          </div>

          {/* Error Alert */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">{error}</span>
                  <Button variant="outline" size="sm" onClick={fetchCourseStructure} className="ml-auto">
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSubjects}</div>
                <p className="text-xs text-muted-foreground">
                  Course subjects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUnits}</div>
                <p className="text-xs text-muted-foreground">
                  Subject units
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLessons}</div>
                <p className="text-xs text-muted-foreground">
                  Individual lessons
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Course Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Course Structure</CardTitle>
              <CardDescription>
                Hierarchical view of your subjects, units, and lessons
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-gray-500">Loading course structure...</span>
                </div>
              ) : totalSubjects === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects yet</h3>
                  <p className="text-gray-500 mb-4">Create your first subject to get started</p>
                  <CreateSubjectDialog onSubjectCreated={fetchCourseStructure} />
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.values(courseStructure).map((subject) => (
                    <div key={subject.id} className="border rounded-lg">
                      {/* Subject Header */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleSubject(subject.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div>
                            {expandedSubjects.has(subject.id) ?
                              <ChevronDown className="h-5 w-5" /> :
                              <ChevronRight className="h-5 w-5" />
                            }
                          </div>
                          <div>
                            <Badge variant="outline" className="mb-1">
                              {subject.code}
                            </Badge>
                            <h3 className="font-semibold">{subject.name}</h3>
                            {subject.description && (
                              <p className="text-sm text-gray-600">{subject.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {subject.units.length} units, {subject.units.reduce((sum, unit) => sum + unit.lessons.length, 0)} lessons
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchRAGDocuments(subject.id);
                            }}
                          >
                            <Database className="h-4 w-4 mr-1" />
                            View Materials
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutoOrganize(subject.id);
                            }}
                            disabled={aiOrganizing === subject.id}
                          >
                            {aiOrganizing === subject.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Organizing...
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-1" />
                                AI Organize
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubject(subject.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Units */}
                      {expandedSubjects.has(subject.id) && (
                        <div className="border-t">
                          {/* Show RAG Documents if loaded */}
                          {ragDocuments[subject.id] && (
                            <div className="p-4 bg-blue-50 border-b">
                              <h4 className="font-semibold text-sm mb-2 flex items-center">
                                <Database className="h-4 w-4 mr-1" />
                                RAG Materials ({ragDocuments[subject.id].total_documents} documents)
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                {ragDocuments[subject.id].documents.map((doc: any) => (
                                  <div key={doc.document_id} className="bg-white p-2 rounded border text-xs">
                                    <div className="font-medium">{doc.filename}</div>
                                    <div className="text-gray-500">{doc.chunk_count} chunks</div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-gray-600 mt-2">
                                💡 Use "AI Organize" to automatically sort these materials into units and lessons
                              </p>
                            </div>
                          )}

                          {subject.units.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              <p className="mb-3">No units yet. Add your first unit to get started.</p>
                              <CreateUnitDialog
                                subjectId={subject.id}
                                onUnitCreated={fetchCourseStructure}
                              />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {subject.units.map((unit) => (
                                <div key={unit.id} className="border-l-4 border-blue-200">
                                  {/* Unit Header */}
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                                    onClick={() => toggleUnit(unit.id)}
                                  >
                                    <div className="flex items-center space-x-3 ml-4">
                                      <div>
                                        {expandedUnits.has(unit.id) ?
                                          <ChevronDown className="h-4 w-4" /> :
                                          <ChevronRight className="h-4 w-4" />
                                        }
                                      </div>
                                      <div>
                                        <h4 className="font-medium">Unit {unit.order}: {unit.name}</h4>
                                        {unit.description && (
                                          <p className="text-sm text-gray-600">{unit.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-500">
                                        {unit.lessons.length} lessons
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteUnit(unit.id);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Lessons */}
                                  {expandedUnits.has(unit.id) && (
                                    <div className="border-t bg-gray-50">
                                      {unit.lessons.length === 0 ? (
                                        <div className="p-3 text-center text-gray-500 ml-8">
                                          <p className="mb-2">No lessons yet.</p>
                                          <CreateLessonDialog
                                            unitId={unit.id}
                                            onLessonCreated={fetchCourseStructure}
                                          />
                                        </div>
                                      ) : (
                                        <div className="space-y-1 p-2">
                                          {unit.lessons.map((lesson) => (
                                            <div key={lesson.id} className="flex items-center justify-between p-3 bg-white rounded border ml-8">
                                              <div className="flex-1">
                                                <h5 className="font-medium text-sm">
                                                  Lesson {lesson.order}: {lesson.name}
                                                </h5>
                                                {lesson.description && (
                                                  <p className="text-xs text-gray-600 mt-1">{lesson.description}</p>
                                                )}
                                                {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
                                                  <div className="mt-2">
                                                    <Badge variant="secondary" className="text-xs">
                                                      {lesson.learning_objectives.length} objectives
                                                    </Badge>
                                                  </div>
                                                )}
                                              </div>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700"
                                                onClick={() => handleDeleteLesson(lesson.id)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ))}
                                          <div className="p-2">
                                            <CreateLessonDialog
                                              unitId={unit.id}
                                              onLessonCreated={fetchCourseStructure}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                              <div className="p-3 border-t">
                                <CreateUnitDialog
                                  subjectId={subject.id}
                                  onUnitCreated={fetchCourseStructure}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}