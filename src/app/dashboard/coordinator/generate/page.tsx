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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Zap,
  BookOpen,
  Settings,
  Download,
  Upload,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  FileText,
  Wand2,
  Eye,
  Calendar,
  Target,
  Loader2
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Copy, AlertTriangle } from 'lucide-react';
import { generatePaperPDF, generateRandomPassword, openPdfInNewTab, downloadPdf } from '@/lib/pdf-generator';

interface GeneratedPaper {
  id: string;
  title: string;
  subject: string;
  unit: string;
  totalMarks: number;
  totalQuestions: number;
  difficulty: string;
  bloomDistribution: Record<string, number>;
  generatedDate: string;
  status: 'completed' | 'in-progress' | 'failed';
  generationTime: string;
  generatedBy: string;
  questions?: any[];
  pdfPath?: string;
  password?: string;
}

function PasswordRevealModal({ password, onClose }: { password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center space-x-2 text-yellow-600 mb-4">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-bold">Important: Save Password</h3>
        </div>

        <p className="text-gray-600 mb-4">
          A password-protected PDF has been generated. This password will be shown <strong>ONLY ONCE</strong>.
          Please copy and save it immediately.
        </p>

        <div className="bg-gray-100 p-4 rounded-md flex items-center justify-between mb-6 border border-gray-200">
          <code className="text-lg font-mono font-bold text-gray-800">{password}</code>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <Button onClick={onClose} className="w-full">
          I have saved the password
        </Button>
      </div>
    </div>
  );
}

const PAPER_TEMPLATES = [
  { id: 'mid-term', name: 'Mid-Term Exam', description: '50 marks, 1.5 hours, mixed difficulty', marks: 50, questions: 10, difficulty: 'medium' },
  { id: 'final', name: 'Final Exam', description: '100 marks, 3 hours, comprehensive', marks: 100, questions: 20, difficulty: 'hard' },
  { id: 'quiz', name: 'Quick Quiz', description: '20 marks, 30 minutes, easy level', marks: 20, questions: 10, difficulty: 'easy' },
  { id: 'assignment', name: 'Assignment', description: '30 marks, take-home, analytical', marks: 30, questions: 5, difficulty: 'medium' },
];

function TemplatesModal({ onClose, onSelectTemplate }: { onClose: () => void; onSelectTemplate: (template: typeof PAPER_TEMPLATES[0]) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Paper Templates</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <p className="text-gray-600 mb-4">
          Select a template to pre-fill the paper configuration.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PAPER_TEMPLATES.map((template) => (
            <Card key={template.id} className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => { onSelectTemplate(template); onClose(); }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4 text-sm text-gray-600">
                  <span>{template.marks} marks</span>
                  <span>{template.questions} questions</span>
                  <Badge variant="outline" className="capitalize">{template.difficulty}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// Helpers used across this module (shared by the wizard and the history table)
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    case 'in-progress':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getDifficultyBadge = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Easy</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
    case 'hard':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Hard</Badge>;
    default:
      return <Badge variant="outline">{difficulty}</Badge>;
  }
};

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
      lessons: Array<{
        id: string;
        name: string;
        description?: string;
        order: number;
        learning_objectives?: string[];
      }>;
    }>;
  };
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
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/context">
            <Upload className="mr-2 h-4 w-4" />
            RAG Context
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/question-bank">
            <BookOpen className="mr-2 h-4 w-4" />
            Question Bank
          </Link>
        </Button>
        <Button variant="default" className="w-full justify-start">
          <Zap className="mr-2 h-4 w-4" />
          Generate Papers
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

interface PaperGenerationWizardProps {
  onPaperGenerated: (paper: GeneratedPaper) => void;
  courseStructure: CourseStructure;
  ragStatusMap: Record<string, boolean>;
}

function PaperGenerationWizard({
  onPaperGenerated,
  courseStructure,
  ragStatusMap
}: PaperGenerationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [lastGeneratedPassword, setLastGeneratedPassword] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    subjectId: '',
    units: [] as string[],
    totalMarks: 100,
    totalQuestions: 8,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    bloomDistribution: {
      remember: 20,
      understand: 30,
      apply: 30,
      analyze: 20,
      evaluate: 0,
      create: 0
    },
    questionTypes: {
      mcq: { enabled: false, count: 5, marks: 1 },
      veryShortAnswer: { enabled: true, count: 5, marks: 2 },
      shortAnswer: { enabled: true, count: 4, marks: 5 },
      longAnswer: { enabled: true, count: 2, marks: 10 }
    },
    instructions: '',
    useContext: true
  });

  const steps = [
    { id: 1, title: 'Basic Info', description: 'Paper details and subject' },
    { id: 2, title: 'Configuration', description: 'Marks and question distribution' },
    { id: 3, title: 'Bloom\'s Taxonomy', description: 'Cognitive level distribution' },
    { id: 4, title: 'Review & Generate', description: 'Final review and generation' }
  ];

  const handleGeneratePaper = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Check if RAG data exists if use_context is true
      if (formData.useContext && formData.subjectId) {
        const ragStatus = await apiClient.getRAGStatus(formData.subjectId);
        if (ragStatus.data && !ragStatus.data.rag_exists) {
          setGenerationError('RAG data not found for this subject. Please process materials first in Subjects & Materials page.');
          setIsGenerating(false);
          return;
        }
      }

      // Convert question types to array and build format
      const selectedQuestionTypes: string[] = [];
      const questionFormat: Record<string, { count: number; marks: number }> = {};

      Object.entries(formData.questionTypes).forEach(([type, config]) => {
        if (config.enabled && config.count > 0) {
          const apiType = type.replace(/([A-Z])/g, '_$1').toLowerCase();
          selectedQuestionTypes.push(apiType);
          questionFormat[apiType] = { count: config.count, marks: config.marks };
        }
      });

      if (selectedQuestionTypes.length === 0) {
        setGenerationError('Please select at least one question type with count > 0');
        setIsGenerating(false);
        return;
      }

      // Calculate total questions from format
      const totalQuestionsFromFormat = Object.values(questionFormat).reduce((sum, cfg) => sum + cfg.count, 0);

      const request = {
        topic: formData.title || `${formData.subject} - ${formData.units.join(', ')}`,
        subject: formData.subject,
        subject_id: formData.subjectId || undefined,
        difficulty: formData.difficulty,
        num_questions: totalQuestionsFromFormat,
        question_types: selectedQuestionTypes,
        question_format: questionFormat,
        use_context: formData.useContext
      };

      const result = await apiClient.generateQuestions(request);

      if (result.error) {
        setGenerationError(result.error);
      } else if (result.data) {
        const newPaper: GeneratedPaper = {
          id: result.data.id || Date.now().toString(),
          title: formData.title || `${formData.subject} Question Paper`,
          subject: formData.subject,
          unit: formData.units.join(', ') || 'All Units',
          totalMarks: result.data.total_marks || formData.totalMarks,
          totalQuestions: result.data.questions?.length || formData.totalQuestions,
          difficulty: formData.difficulty,
          bloomDistribution: formData.bloomDistribution,
          generatedDate: new Date().toISOString().split('T')[0],
          status: 'completed',
          generationTime: 'Just now',
          generatedBy: 'AI Assistant',
          questions: result.data.questions,
          pdfPath: result.data.pdf_path,
          password: result.data.password
        };

        if (result.data.password) {
          setShowPasswordModal(true);
          setLastGeneratedPassword(result.data.password);
        }

        onPaperGenerated(newPaper);

        // Reset form
        setCurrentStep(1);
        setFormData({
          title: '',
          subject: '',
          subjectId: '',
          units: [],
          totalMarks: 100,
          totalQuestions: 8,
          difficulty: 'medium',
          bloomDistribution: {
            remember: 20,
            understand: 30,
            apply: 30,
            analyze: 20,
            evaluate: 0,
            create: 0
          },
          questionTypes: {
            mcq: { enabled: false, count: 5, marks: 1 },
            veryShortAnswer: { enabled: true, count: 5, marks: 2 },
            shortAnswer: { enabled: true, count: 4, marks: 5 },
            longAnswer: { enabled: true, count: 2, marks: 10 }
          },
          instructions: '',
          useContext: true
        });
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // using module-level helpers: getStatusBadge, getDifficultyBadge

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Paper Title</Label>
              <Input
                id="title"
                placeholder="e.g., Mid-Term Exam - Data Structures"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => {
                  const selectedSubj = Object.values(courseStructure).find(s => s.name === value);
                  setFormData({
                    ...formData,
                    subject: value,
                    subjectId: selectedSubj?.id || '',
                    units: []
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(courseStructure).map((subject) => (
                    <SelectItem key={subject.id} value={subject.name}>
                      {subject.code} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.subject && ragStatusMap[formData.subjectId] === false && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    No RAG data found for this subject. Questions will be generated without context.{' '}
                    <a href="/dashboard/coordinator/subjects" className="underline font-medium">
                      Process materials
                    </a>
                  </p>
                </div>
              </div>
            )}
            {formData.subject && (
              <div>
                <Label>Units to Include</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                  {Object.values(courseStructure)
                    .find((subject) => subject.name === formData.subject)
                    ?.units.map((unit) => (
                      <div key={unit.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={unit.id}
                          checked={formData.units.includes(unit.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, units: [...formData.units, unit.name] });
                            } else {
                              setFormData({
                                ...formData,
                                units: formData.units.filter((u) => u !== unit.name)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={unit.id}>
                          Unit {unit.order}: {unit.name}
                        </Label>
                      </div>
                    ))}
                  {Object.values(courseStructure)
                    .find((subject) => subject.name === formData.subject)
                    ?.units.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        <p className="text-sm">No units available for this subject.</p>
                        <p className="text-xs mt-1">
                          Add units in the Lessons & Units management page.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalMarks">Total Marks</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="totalQuestions">Total Questions</Label>
                <Input
                  id="totalQuestions"
                  type="number"
                  value={formData.totalQuestions}
                  onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="difficulty">Overall Difficulty</Label>
              <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value as 'easy' | 'medium' | 'hard' })}>
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
            <div>
              <Label>Question Types & Configuration</Label>
              <div className="mt-3 space-y-4">
                {Object.entries(formData.questionTypes).map(([type, config]) => {
                  const displayName = type.replace(/([A-Z])/g, ' $1').trim();
                  return (
                    <div key={type} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={config.enabled}
                            onCheckedChange={(isChecked) =>
                              setFormData({
                                ...formData,
                                questionTypes: {
                                  ...formData.questionTypes,
                                  [type]: { ...config, enabled: !!isChecked }
                                }
                              })
                            }
                          />
                          <Label htmlFor={type} className="capitalize font-medium">
                            {displayName}
                          </Label>
                        </div>
                        {config.enabled && (
                          <Badge variant="outline">
                            {config.count} × {config.marks} = {config.count * config.marks} marks
                          </Badge>
                        )}
                      </div>
                      {config.enabled && (
                        <div className="grid grid-cols-2 gap-4 pl-6">
                          <div>
                            <Label className="text-sm text-gray-600">Number of Questions</Label>
                            <Input
                              type="number"
                              min="0"
                              value={config.count}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  questionTypes: {
                                    ...formData.questionTypes,
                                    [type]: { ...config, count: parseInt(e.target.value) || 0 }
                                  }
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-gray-600">Marks per Question</Label>
                            <Input
                              type="number"
                              min="1"
                              value={config.marks}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  questionTypes: {
                                    ...formData.questionTypes,
                                    [type]: { ...config, marks: parseInt(e.target.value) || 1 }
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Questions:</span>
                  <span>{Object.values(formData.questionTypes).reduce((sum, cfg) => sum + (cfg.enabled ? cfg.count : 0), 0)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="font-medium">Total Marks:</span>
                  <span>{Object.values(formData.questionTypes).reduce((sum, cfg) => sum + (cfg.enabled ? cfg.count * cfg.marks : 0), 0)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>Bloom's Taxonomy Distribution (%)</Label>
              <div className="mt-4 space-y-4">
                {Object.entries(formData.bloomDistribution).map(([level, percentage]) => (
                  <div key={level} className="flex items-center space-x-4">
                    <Label className="w-24 capitalize">{level}</Label>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={percentage}
                        onChange={(e) => setFormData({
                          ...formData,
                          bloomDistribution: {
                            ...formData.bloomDistribution,
                            [level]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-20"
                      />
                    </div>
                    <div className="flex-1">
                      <Progress value={percentage} className="w-full" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Total: {Object.values(formData.bloomDistribution).reduce((sum, val) => sum + val, 0)}%
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-4">Paper Configuration Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Title:</strong> {formData.title}</div>
                <div><strong>Subject:</strong> {formData.subject}</div>
                <div><strong>Total Marks:</strong> {formData.totalMarks}</div>
                <div><strong>Total Questions:</strong> {formData.totalQuestions}</div>
                <div><strong>Difficulty:</strong> {formData.difficulty}</div>
                <div><strong>Units:</strong> {formData.units.join(', ')}</div>
              </div>
            </div>
            <div>
              <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="Any specific instructions for the AI generator..."
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useContext"
                checked={formData.useContext}
                onCheckedChange={(checked) => setFormData({ ...formData, useContext: !!checked })}
              />
              <Label htmlFor="useContext">Use uploaded context documents for generation</Label>
            </div>
            {generationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">{generationError}</span>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {showPasswordModal && (
        <PasswordRevealModal
          password={lastGeneratedPassword}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wand2 className="mr-2 h-5 w-5" />
            AI Paper Generator
          </CardTitle>
          <CardDescription>
            Generate question papers using AI with your custom requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {currentStep > step.id ? <CheckCircle className="h-5 w-5" /> : step.id}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mx-4 h-px bg-gray-300 w-12"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {renderStep()}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            <div className="flex space-x-2">
              {currentStep < 4 ? (
                <Button onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}>
                  Next
                </Button>
              ) : (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleGeneratePaper}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Generate Paper
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function GeneratePapersPage() {
  const [activeTab, setActiveTab] = useState('generate');
  const [generatedPapers, setGeneratedPapers] = useState<GeneratedPaper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [courseStructure, setCourseStructure] = useState<CourseStructure>({});
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [ragStatusMap, setRagStatusMap] = useState<Record<string, boolean>>({});
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showPdfPasswordModal, setShowPdfPasswordModal] = useState(false);
  const [currentPdfPassword, setCurrentPdfPassword] = useState<string>('');
  const [pendingPdfAction, setPendingPdfAction] = useState<{ paper: GeneratedPaper; action: 'view' | 'download' } | null>(null);

  const handlePaperGenerated = (paper: GeneratedPaper) => {
    setGeneratedPapers(prev => [paper, ...prev]);
  };

  const fetchCourseStructure = async () => {
    try {
      const result = await apiClient.getFullCourseStructure();
      if (result.data) {
        setCourseStructure(result.data);
        const subjectList = Object.values(result.data).map(subject => ({
          id: subject.id,
          name: subject.name,
          code: subject.code
        }));
        setSubjects(subjectList);

        // Check RAG status for all subjects
        const statusMap: Record<string, boolean> = {};
        for (const subject of subjectList) {
          const ragStatus = await apiClient.getRAGStatus(subject.id);
          statusMap[subject.id] = ragStatus.data?.rag_exists || false;
        }
        setRagStatusMap(statusMap);
      }
    } catch (error) {
      console.error('Failed to fetch course structure:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const result = await apiClient.getGeneratedPapers();
      if (result.data?.papers) {
        const papers: GeneratedPaper[] = result.data.papers.map((p: any) => ({
          id: p.id,
          title: p.title || 'Untitled',
          subject: p.subject || 'N/A',
          unit: 'All Units',
          totalMarks: p.total_marks || 0,
          totalQuestions: p.questions?.length || 0,
          difficulty: p.difficulty || 'medium',
          bloomDistribution: {},
          generatedDate: p.generated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          status: 'completed' as const,
          generationTime: 'Previously',
          generatedBy: 'AI Assistant',
          questions: p.questions,
          pdfPath: p.pdf_path
        }));
        setGeneratedPapers(papers);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handleSelectTemplate = (template: typeof PAPER_TEMPLATES[0]) => {
    // Template selection would pre-fill a form - for now log it
    console.log('Selected template:', template);
    // Could navigate to generate tab with pre-filled values
  };

  const handleViewPaper = async (paper: GeneratedPaper) => {
    try {
      const result = await apiClient.downloadPaperPdf(paper.id);

      if ('error' in result) {
        console.error('Failed to download PDF:', result.error);
        return;
      }

      const { blob, password } = result;

      // Show password modal on first access
      if (password) {
        setCurrentPdfPassword(password);
        setShowPdfPasswordModal(true);
      }

      // Open PDF in new tab
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing paper:', error);
    }
  };

  const handleDownloadPaper = async (paper: GeneratedPaper) => {
    try {
      const result = await apiClient.downloadPaperPdf(paper.id);

      if ('error' in result) {
        console.error('Failed to download PDF:', result.error);
        return;
      }

      const { blob, password, filename } = result;

      // Show password modal on first access
      if (password) {
        setCurrentPdfPassword(password);
        setShowPdfPasswordModal(true);
      }

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading paper:', error);
    }
  };

  const handlePasswordModalClose = () => {
    setShowPdfPasswordModal(false);
    setCurrentPdfPassword('');
    setPendingPdfAction(null);
  };

  useEffect(() => {
    fetchCourseStructure();
    fetchHistory();
  }, []);

  const totalGenerated = generatedPapers.length;
  const completedPapers = generatedPapers.filter(p => p.status === 'completed').length;
  const avgGenerationTime = completedPapers > 0 ? '45s' : 'N/A';
  const totalQuestions = generatedPapers.reduce((sum, p) => sum + p.totalQuestions, 0);

  return (
    <ProtectedRoute allowedRoles={['coordinator']}>
      {showPdfPasswordModal && (
        <PasswordRevealModal
          password={currentPdfPassword}
          onClose={handlePasswordModalClose}
        />
      )}
      {showTemplatesModal && (
        <TemplatesModal
          onClose={() => setShowTemplatesModal(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      )}
      <DashboardLayout sidebar={<CoordinatorSidebar />}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Generate Papers</h1>
              <p className="mt-2 text-gray-600">
                Create question papers using AI-powered generation with your custom requirements
              </p>
            </div>
            <Button onClick={() => setShowTemplatesModal(true)}>
              <FileText className="mr-2 h-4 w-4" />
              View Templates
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Papers Generated</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalGenerated}</div>
                <p className="text-xs text-muted-foreground">
                  Total created
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedPapers}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Generation Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgGenerationTime}</div>
                <p className="text-xs text-muted-foreground">
                  Per paper
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalQuestions}</div>
                <p className="text-xs text-muted-foreground">
                  Generated
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('generate')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'generate'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Generate New Paper
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Generation History
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'generate' && (
            <PaperGenerationWizard
              onPaperGenerated={handlePaperGenerated}
              courseStructure={courseStructure}
              ragStatusMap={ragStatusMap}
            />
          )}

          {activeTab === 'history' && (
            <Card>
              <CardHeader>
                <CardTitle>Generation History</CardTitle>
                <CardDescription>
                  View all previously generated papers and their details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedPapers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            No papers generated yet. Create your first paper using the generator!
                          </TableCell>
                        </TableRow>
                      ) : (
                        generatedPapers.map((paper) => (
                          <TableRow key={paper.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{paper.title}</div>
                                <div className="text-sm text-gray-500">{paper.unit}</div>
                              </div>
                            </TableCell>
                            <TableCell>{paper.subject}</TableCell>
                            <TableCell>{paper.totalMarks}</TableCell>
                            <TableCell>{paper.totalQuestions}</TableCell>
                            <TableCell>{getDifficultyBadge(paper.difficulty)}</TableCell>
                            <TableCell>
                              <div>
                                <div className="text-sm">{paper.generatedDate}</div>
                                <div className="text-xs text-gray-500">{paper.generationTime}</div>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(paper.status)}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleViewPaper(paper)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDownloadPaper(paper)}>
                                  <Download className="h-4 w-4" />
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
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}