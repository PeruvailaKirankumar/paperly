'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  Upload,
  BarChart3,
  Settings,
  Zap,
  Users
} from 'lucide-react';

// Mock questions data
const mockQuestions = [
  {
    id: '1',
    text: 'Explain the concept of linked lists and compare it with arrays. Discuss the advantages and disadvantages of each data structure.',
    subject: 'Data Structures',
    unit: 'Linear Data Structures',
    topic: 'Linked Lists',
    marks: 10,
    bloomLevel: 'understand',
    difficulty: 'medium',
    keywords: ['linked list', 'array', 'comparison', 'advantages'],
    createdBy: 'Prof. Sarah Johnson',
    createdDate: '2024-03-15',
    lastUsed: '2024-03-18',
    usageCount: 3,
    status: 'approved'
  },
  {
    id: '2',
    text: 'Write an algorithm to implement binary search. Analyze its time complexity.',
    subject: 'Data Structures',
    unit: 'Searching Algorithms',
    topic: 'Binary Search',
    marks: 8,
    bloomLevel: 'apply',
    difficulty: 'medium',
    keywords: ['binary search', 'algorithm', 'time complexity'],
    createdBy: 'Dr. John Wilson',
    createdDate: '2024-03-12',
    lastUsed: '2024-03-15',
    usageCount: 5,
    status: 'approved'
  },
  {
    id: '3',
    text: 'What is the difference between stack and queue? Implement both using arrays.',
    subject: 'Data Structures',
    unit: 'Linear Data Structures',
    topic: 'Stack and Queue',
    marks: 12,
    bloomLevel: 'apply',
    difficulty: 'easy',
    keywords: ['stack', 'queue', 'implementation', 'arrays'],
    createdBy: 'Prof. Deva Chandan',
    createdDate: '2024-03-10',
    lastUsed: '2024-03-12',
    usageCount: 7,
    status: 'approved'
  },
  {
    id: '4',
    text: 'Design and implement a hash table with collision resolution using chaining.',
    subject: 'Data Structures',
    unit: 'Hashing',
    topic: 'Hash Tables',
    marks: 15,
    bloomLevel: 'create',
    difficulty: 'hard',
    keywords: ['hash table', 'collision resolution', 'chaining'],
    createdBy: 'Dr. Kiran P',
    createdDate: '2024-03-08',
    lastUsed: '2024-03-10',
    usageCount: 2,
    status: 'pending'
  }
];

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
        <Button variant="default" className="w-full justify-start">
          <BookOpen className="mr-2 h-4 w-4" />
          Question Bank
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href="/dashboard/coordinator/generate">
            <Zap className="mr-2 h-4 w-4" />
            Generate Papers
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

function AddQuestionDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Question</DialogTitle>
          <DialogDescription>
            Create a new question for the question bank
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
              <Label htmlFor="unit">Unit</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear Data Structures</SelectItem>
                  <SelectItem value="trees">Trees</SelectItem>
                  <SelectItem value="graphs">Graphs</SelectItem>
                  <SelectItem value="sorting">Sorting Algorithms</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="topic">Topic</Label>
              <Input id="topic" placeholder="e.g., Linked Lists" />
            </div>
            <div>
              <Label htmlFor="marks">Marks</Label>
              <Input id="marks" type="number" placeholder="10" />
            </div>
            <div>
              <Label htmlFor="bloomLevel">Bloom's Level</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remember">Remember</SelectItem>
                  <SelectItem value="understand">Understand</SelectItem>
                  <SelectItem value="apply">Apply</SelectItem>
                  <SelectItem value="analyze">Analyze</SelectItem>
                  <SelectItem value="evaluate">Evaluate</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="questionText">Question Text</Label>
            <Textarea
              id="questionText"
              placeholder="Enter the question text here..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input id="keywords" placeholder="keyword1, keyword2, keyword3" />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Add Question</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function QuestionBankPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [bloomFilter, setBloomFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
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

  const getBloomBadge = (level: string) => {
    const colors = {
      remember: 'bg-blue-100 text-blue-800',
      understand: 'bg-purple-100 text-purple-800',
      apply: 'bg-green-100 text-green-800',
      analyze: 'bg-orange-100 text-orange-800',
      evaluate: 'bg-pink-100 text-pink-800',
      create: 'bg-red-100 text-red-800'
    };
    const color = colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    return <Badge className={`${color} hover:${color} capitalize`}>{level}</Badge>;
  };

  const filteredQuestions = mockQuestions.filter(question => {
    const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = subjectFilter === 'all' || question.subject === subjectFilter;
    const matchesDifficulty = difficultyFilter === 'all' || question.difficulty === difficultyFilter;
    const matchesBloom = bloomFilter === 'all' || question.bloomLevel === bloomFilter;

    return matchesSearch && matchesSubject && matchesDifficulty && matchesBloom;
  });

  const totalQuestions = mockQuestions.length;
  const approvedQuestions = mockQuestions.filter(q => q.status === 'approved').length;
  const totalMarks = mockQuestions.reduce((sum, q) => sum + q.marks, 0);
  const avgUsage = mockQuestions.reduce((sum, q) => sum + q.usageCount, 0) / mockQuestions.length;

  return (
    <ProtectedRoute allowedRoles={['coordinator']}>
      <DashboardLayout sidebar={<CoordinatorSidebar />}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
              <p className="mt-2 text-gray-600">
                Manage your question repository for automated paper generation
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import Questions
              </Button>
              <AddQuestionDialog />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalQuestions}</div>
                <p className="text-xs text-muted-foreground">
                  In question bank
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approvedQuestions}</div>
                <p className="text-xs text-muted-foreground">
                  Ready to use
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Marks</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMarks}</div>
                <p className="text-xs text-muted-foreground">
                  Combined value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Usage</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgUsage.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  Times per question
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Question Bank Management */}
          <Card>
            <CardHeader>
              <CardTitle>Question Repository</CardTitle>
              <CardDescription>
                Browse, filter, and manage your question collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search questions by text, topic, or keywords..."
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
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bloomFilter} onValueChange={setBloomFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Bloom's" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="remember">Remember</SelectItem>
                    <SelectItem value="understand">Understand</SelectItem>
                    <SelectItem value="apply">Apply</SelectItem>
                    <SelectItem value="analyze">Analyze</SelectItem>
                    <SelectItem value="evaluate">Evaluate</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Questions Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Question</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Bloom's</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium line-clamp-2 max-w-sm">
                              {question.text}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {question.subject} • {question.unit}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{question.topic}</TableCell>
                        <TableCell>{question.marks}</TableCell>
                        <TableCell>{getDifficultyBadge(question.difficulty)}</TableCell>
                        <TableCell>{getBloomBadge(question.bloomLevel)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{question.usageCount}</div>
                            <div className="text-sm text-gray-500">
                              Last: {question.lastUsed}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(question.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}