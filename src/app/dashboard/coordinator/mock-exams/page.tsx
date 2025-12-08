'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    FileText,
    BookOpen,
    Users,
    Zap,
    BarChart3,
    Loader2,
    Plus,
    Play,
    Pause,
    Trash2,
    Clock,
    Settings,
    Edit
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { examService, Exam, ExamSettings, Question } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/auth/auth-context';

interface Subject {
    id: string;
    name: string;
    code: string;
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
                <Button variant="default" className="w-full justify-start" asChild>
                    <Link href="/dashboard/coordinator/mock-exams">
                        <FileText className="mr-2 h-4 w-4" />
                        Mock Exams
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

const defaultSettings: ExamSettings = {
    randomizeQuestions: true,
    antiCheat: {
        preventTabSwitch: true,
        preventCopyPaste: true,
        fullScreenRequired: true,
        detectDevTools: true
    },
    allowedAttempts: 1,
    showResults: true
};

// Question generation configuration (for dynamic generation with RAG)
interface QuestionConfig {
    numQuestions: number;
    difficulty: 'easy' | 'medium' | 'hard';
    questionTypes: {
        mcq: number;
        short_answer: number;
        long_answer: number;
        true_false: number;
    };
}

const defaultQuestionConfig: QuestionConfig = {
    numQuestions: 10,
    difficulty: 'medium',
    questionTypes: {
        mcq: 3,
        short_answer: 3,
        long_answer: 2,
        true_false: 2
    }
};

export default function MockExamsPage() {
    const { user } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        subjectId: '',
        description: '',
        duration: 60,
        totalMarks: 100,
        status: 'draft' as Exam['status'],
        scheduledAt: '',
        settings: defaultSettings
    });

    // Question generation configuration
    const [questionConfig, setQuestionConfig] = useState<QuestionConfig>(defaultQuestionConfig);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load subjects
            const subjectsResult = await apiClient.getSubjects();
            if (subjectsResult.data) {
                setSubjects(subjectsResult.data);
            }

            // Load mock exams
            const examsResult = await examService.getAll();
            if (examsResult.success && examsResult.data) {
                // Filter to only show mock exams
                setExams(examsResult.data.filter(e => e.type === 'mock'));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExam = async () => {
        if (!formData.title || !formData.subjectId) {
            alert('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            const subject = subjects.find(s => s.id === formData.subjectId);

            const examData: Omit<Exam, 'id'> = {
                title: formData.title,
                subjectId: formData.subjectId,
                description: formData.description,
                type: 'mock',
                duration: formData.duration,
                totalMarks: formData.totalMarks,
                status: formData.status,
                scheduledAt: formData.scheduledAt || undefined,
                questions: [], // Questions generated dynamically with RAG when student starts
                settings: {
                    ...formData.settings,
                    questionConfig // Store generation config for dynamic question generation
                } as any,
                createdAt: new Date().toISOString(),
                createdBy: user?.id || 'coordinator'
            };

            const result = await examService.create(examData);

            if (result.success) {
                setDialogOpen(false);
                resetForm();
                loadData();
            } else {
                alert('Failed to create exam: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating exam:', error);
            alert('Failed to create exam');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (exam: Exam) => {
        const newStatus = exam.status === 'active' ? 'draft' : 'active';

        try {
            await examService.update(exam.id!, { status: newStatus });
            loadData();
        } catch (error) {
            console.error('Error updating exam status:', error);
        }
    };

    const handleDeleteExam = async (examId: string) => {
        if (!confirm('Are you sure you want to delete this exam?')) return;

        try {
            await examService.delete(examId);
            loadData();
        } catch (error) {
            console.error('Error deleting exam:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            subjectId: '',
            description: '',
            duration: 60,
            totalMarks: 100,
            status: 'draft',
            scheduledAt: '',
            settings: defaultSettings
        });
    };

    const getSubjectName = (subjectId: string) => {
        return subjects.find(s => s.id === subjectId)?.name || 'Unknown';
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
                            <h1 className="text-3xl font-bold text-gray-900">Mock Exams</h1>
                            <p className="mt-2 text-gray-600">
                                Create and manage mock exams for students
                            </p>
                        </div>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Mock Exam
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Create New Mock Exam</DialogTitle>
                                    <DialogDescription>
                                        Set up a new mock exam for students to practice
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Exam Title *</Label>
                                            <Input
                                                id="title"
                                                placeholder="e.g., Mid-Term Practice Test"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="subject">Subject *</Label>
                                            <Select
                                                value={formData.subjectId}
                                                onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select subject" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {subjects.map((subject) => (
                                                        <SelectItem key={subject.id} value={subject.id}>
                                                            {subject.name} ({subject.code})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Brief description of the exam..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="duration">Duration (minutes)</Label>
                                            <Input
                                                id="duration"
                                                type="number"
                                                value={formData.duration}
                                                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="totalMarks">Total Marks</Label>
                                            <Input
                                                id="totalMarks"
                                                type="number"
                                                value={formData.totalMarks}
                                                onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 100 })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="status">Initial Status</Label>
                                            <Select
                                                value={formData.status}
                                                onValueChange={(value: Exam['status']) => setFormData({ ...formData, status: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="draft">Draft</SelectItem>
                                                    <SelectItem value="active">Active (Visible to students)</SelectItem>
                                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="scheduledAt">Scheduled Time (optional)</Label>
                                        <Input
                                            id="scheduledAt"
                                            type="datetime-local"
                                            value={formData.scheduledAt}
                                            onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                        />
                                    </div>

                                    {/* Anti-Cheat Settings */}
                                    <div className="border rounded-lg p-4 space-y-4">
                                        <h3 className="font-semibold flex items-center">
                                            <Settings className="h-4 w-4 mr-2" />
                                            Anti-Cheat Settings
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="tabSwitch">Prevent Tab Switch</Label>
                                                <Switch
                                                    id="tabSwitch"
                                                    checked={formData.settings.antiCheat.preventTabSwitch}
                                                    onCheckedChange={(checked) => setFormData({
                                                        ...formData,
                                                        settings: {
                                                            ...formData.settings,
                                                            antiCheat: { ...formData.settings.antiCheat, preventTabSwitch: checked }
                                                        }
                                                    })}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="copyPaste">Prevent Copy/Paste</Label>
                                                <Switch
                                                    id="copyPaste"
                                                    checked={formData.settings.antiCheat.preventCopyPaste}
                                                    onCheckedChange={(checked) => setFormData({
                                                        ...formData,
                                                        settings: {
                                                            ...formData.settings,
                                                            antiCheat: { ...formData.settings.antiCheat, preventCopyPaste: checked }
                                                        }
                                                    })}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="fullscreen">Fullscreen Required</Label>
                                                <Switch
                                                    id="fullscreen"
                                                    checked={formData.settings.antiCheat.fullScreenRequired}
                                                    onCheckedChange={(checked) => setFormData({
                                                        ...formData,
                                                        settings: {
                                                            ...formData.settings,
                                                            antiCheat: { ...formData.settings.antiCheat, fullScreenRequired: checked }
                                                        }
                                                    })}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="devtools">Detect DevTools</Label>
                                                <Switch
                                                    id="devtools"
                                                    checked={formData.settings.antiCheat.detectDevTools}
                                                    onCheckedChange={(checked) => setFormData({
                                                        ...formData,
                                                        settings: {
                                                            ...formData.settings,
                                                            antiCheat: { ...formData.settings.antiCheat, detectDevTools: checked }
                                                        }
                                                    })}
                                                />
                                            </div>
                                        </div>

                                        <p className="text-sm text-orange-600">
                                            ⚠️ After 3 warnings, the exam will be automatically submitted
                                        </p>
                                    </div>

                                    {/* Question Generation Config */}
                                    <div className="border rounded-lg p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold flex items-center">
                                                <Zap className="h-4 w-4 mr-2 text-blue-600" />
                                                Question Generation (AI + RAG)
                                            </h3>
                                            <Badge variant="outline" className="text-blue-600">
                                                {questionConfig.numQuestions} questions
                                            </Badge>
                                        </div>

                                        <p className="text-sm text-gray-600">
                                            Questions will be automatically generated from course materials when students start the exam.
                                        </p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Total Questions</Label>
                                                <Input
                                                    type="number"
                                                    min={5}
                                                    max={30}
                                                    value={questionConfig.numQuestions}
                                                    onChange={(e) => setQuestionConfig({
                                                        ...questionConfig,
                                                        numQuestions: parseInt(e.target.value) || 10
                                                    })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Difficulty</Label>
                                                <Select
                                                    value={questionConfig.difficulty}
                                                    onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                                                        setQuestionConfig({ ...questionConfig, difficulty: value })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="easy">Easy</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="hard">Hard</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="text-center p-2 bg-blue-50 rounded">
                                                <p className="text-lg font-bold text-blue-600">{questionConfig.questionTypes.mcq}</p>
                                                <p className="text-xs text-gray-600">MCQ</p>
                                            </div>
                                            <div className="text-center p-2 bg-green-50 rounded">
                                                <p className="text-lg font-bold text-green-600">{questionConfig.questionTypes.short_answer}</p>
                                                <p className="text-xs text-gray-600">Short</p>
                                            </div>
                                            <div className="text-center p-2 bg-purple-50 rounded">
                                                <p className="text-lg font-bold text-purple-600">{questionConfig.questionTypes.long_answer}</p>
                                                <p className="text-xs text-gray-600">Long</p>
                                            </div>
                                            <div className="text-center p-2 bg-orange-50 rounded">
                                                <p className="text-lg font-bold text-orange-600">{questionConfig.questionTypes.true_false}</p>
                                                <p className="text-xs text-gray-600">T/F</p>
                                            </div>
                                        </div>

                                        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                            ✨ Each student gets a unique set of questions generated from the subject's RAG-indexed materials.
                                        </p>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateExam}
                                        disabled={saving}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Exam'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Exams List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>All Mock Exams</CardTitle>
                            <CardDescription>
                                Manage your mock exams and their availability to students
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {exams.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No mock exams yet</p>
                                    <p className="text-sm">Create your first mock exam to get started</p>
                                </div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Duration</TableHead>
                                                <TableHead>Total Marks</TableHead>
                                                <TableHead>Questions</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {exams.map((exam) => (
                                                <TableRow key={exam.id}>
                                                    <TableCell className="font-medium">{exam.title}</TableCell>
                                                    <TableCell>{getSubjectName(exam.subjectId)}</TableCell>
                                                    <TableCell>
                                                        <span className="flex items-center">
                                                            <Clock className="h-4 w-4 mr-1" />
                                                            {exam.duration} min
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{exam.totalMarks}</TableCell>
                                                    <TableCell>{exam.questions?.length || 0}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                exam.status === 'active'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : exam.status === 'scheduled'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-gray-100 text-gray-800'
                                                            }
                                                        >
                                                            {exam.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleToggleStatus(exam)}
                                                                title={exam.status === 'active' ? 'Deactivate' : 'Activate'}
                                                            >
                                                                {exam.status === 'active' ? (
                                                                    <Pause className="h-4 w-4" />
                                                                ) : (
                                                                    <Play className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeleteExam(exam.id!)}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
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
