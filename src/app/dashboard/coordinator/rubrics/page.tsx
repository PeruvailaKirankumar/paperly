'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  BarChart3,
  Upload,
  BookOpen,
  Zap,
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { rubricService, subjectService, Rubric, Subject } from '@/lib/firebase/firestore';

const mockRubrics = [
  {
    id: 'rub_001',
    subject: 'Data Structures',
    totalMarks: 100,
    duration: '3 hours',
    status: 'active',
    lastUsed: '2025-12-01',
    bloomDistribution: {
      remember: 20,
      understand: 30,
      apply: 30,
      analyze: 10,
      evaluate: 10,
      create: 0
    },
    difficultyDistribution: {
      easy: 30,
      medium: 50,
      hard: 20
    },
    sectionFormat: [
      { name: 'Section A', marks: 20, questionCount: 10, instructions: 'Answer all questions. Each carries 2 marks.' },
      { name: 'Section B', marks: 50, questionCount: 5, instructions: 'Answer any 5 questions. Each carries 10 marks.' },
      { name: 'Section C', marks: 30, questionCount: 2, instructions: 'Answer any 2 questions. Each carries 15 marks.' }
    ]
  },
  {
    id: 'rub_002',
    subject: 'Database Systems',
    totalMarks: 100,
    duration: '3 hours',
    status: 'active',
    lastUsed: '2025-11-20',
    bloomDistribution: {
      remember: 30,
      understand: 40,
      apply: 20,
      analyze: 10,
      evaluate: 0,
      create: 0
    },
    difficultyDistribution: {
      easy: 40,
      medium: 40,
      hard: 20
    },
    sectionFormat: [
      { name: 'Part A', marks: 40, questionCount: 20, instructions: 'MCQs' },
      { name: 'Part B', marks: 60, questionCount: 6, instructions: 'Descriptive' }
    ]
  }
];

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
        <Button variant="default" className="w-full justify-start">
          <Settings className="mr-2 h-4 w-4" />
          Rubrics Management
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
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard/coordinator/generate">
            <Zap className="mr-2 h-4 w-4" />
            Generate Papers
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

function CreateRubricDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create New Rubric
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Rubric</DialogTitle>
          <DialogDescription>
            Define marking scheme and question distribution for a subject
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ds">Data Structures</SelectItem>
                  <SelectItem value="db">Database Systems</SelectItem>
                  <SelectItem value="algo">Algorithms</SelectItem>
                  <SelectItem value="web">Web Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="totalMarks">Total Marks</Label>
              <Input id="totalMarks" type="number" placeholder="100" />
            </div>
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input id="duration" placeholder="3 hours" />
            </div>
            <div>
              <Label htmlFor="examType">Exam Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="midterm">Mid-term</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bloom's Taxonomy Distribution */}
          <div>
            <Label className="text-base font-medium">Bloom's Taxonomy Distribution (%)</Label>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <Label htmlFor="remember" className="text-sm">Remember</Label>
                <Input id="remember" type="number" placeholder="20" />
              </div>
              <div>
                <Label htmlFor="understand" className="text-sm">Understand</Label>
                <Input id="understand" type="number" placeholder="25" />
              </div>
              <div>
                <Label htmlFor="apply" className="text-sm">Apply</Label>
                <Input id="apply" type="number" placeholder="25" />
              </div>
              <div>
                <Label htmlFor="analyze" className="text-sm">Analyze</Label>
                <Input id="analyze" type="number" placeholder="15" />
              </div>
              <div>
                <Label htmlFor="evaluate" className="text-sm">Evaluate</Label>
                <Input id="evaluate" type="number" placeholder="10" />
              </div>
              <div>
                <Label htmlFor="create" className="text-sm">Create</Label>
                <Input id="create" type="number" placeholder="5" />
              </div>
            </div>
          </div>

          {/* Difficulty Distribution */}
          <div>
            <Label className="text-base font-medium">Difficulty Distribution (%)</Label>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <Label htmlFor="easy" className="text-sm">Easy</Label>
                <Input id="easy" type="number" placeholder="30" />
              </div>
              <div>
                <Label htmlFor="medium" className="text-sm">Medium</Label>
                <Input id="medium" type="number" placeholder="50" />
              </div>
              <div>
                <Label htmlFor="hard" className="text-sm">Hard</Label>
                <Input id="hard" type="number" placeholder="20" />
              </div>
            </div>
          </div>

          {/* Section Format */}
          <div>
            <Label className="text-base font-medium">Section Format</Label>
            <div className="space-y-3 mt-3">
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="Section Name" />
                <Input placeholder="Marks" type="number" />
                <Input placeholder="Questions" type="number" />
                <Input placeholder="Instructions" />
              </div>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Create Rubric</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RubricsPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
      case 'archived':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['coordinator']}>
      <DashboardLayout sidebar={<CoordinatorSidebar />}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rubrics Management</h1>
              <p className="mt-2 text-gray-600">
                Create and manage marking schemes for your subjects
              </p>
            </div>
            <CreateRubricDialog />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rubrics</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockRubrics.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active rubrics
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subjects Covered</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Set(mockRubrics.map(r => r.subject)).size}</div>
                <p className="text-xs text-muted-foreground">
                  Different subjects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Total Marks</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(mockRubrics.reduce((sum, r) => sum + r.totalMarks, 0) / mockRubrics.length)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average marks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recently Used</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockRubrics.filter(r => new Date(r.lastUsed) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  This week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rubrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Rubrics Overview</CardTitle>
              <CardDescription>
                Manage your subject rubrics and marking schemes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Sections</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockRubrics.map((rubric) => (
                      <TableRow key={rubric.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rubric.subject}</div>
                            <div className="text-sm text-gray-500">ID: {rubric.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{rubric.totalMarks}</TableCell>
                        <TableCell>{rubric.duration}</TableCell>
                        <TableCell>{rubric.sectionFormat.length} sections</TableCell>
                        <TableCell>{rubric.lastUsed}</TableCell>
                        <TableCell>{getStatusBadge(rubric.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Rubric Details Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sample Rubric Details - {mockRubrics[0].subject}</CardTitle>
                <CardDescription>Preview of rubric configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Bloom's Taxonomy Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(mockRubrics[0].bloomDistribution).map(([level, percentage]) => (
                        <div key={level} className="flex justify-between text-sm">
                          <span className="capitalize">{level}</span>
                          <span>{percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Difficulty Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(mockRubrics[0].difficultyDistribution).map(([level, percentage]) => (
                        <div key={level} className="flex justify-between text-sm">
                          <span className="capitalize">{level}</span>
                          <span>{percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Section Format - {mockRubrics[0].subject}</CardTitle>
                <CardDescription>Question paper structure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRubrics[0].sectionFormat.map((section, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium">{section.name}</h5>
                        <Badge variant="outline">{section.marks} marks</Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>{section.questionCount} questions</div>
                        <div className="mt-1">{section.instructions}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}