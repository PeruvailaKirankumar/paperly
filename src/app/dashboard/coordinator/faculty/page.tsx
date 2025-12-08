'use client';

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Mail,
  Search,
  UserPlus,
  BookOpen,
  Settings,
  Upload,
  BarChart3,
  Zap,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin
} from 'lucide-react';

// Mock faculty data
const mockFaculty = [
  {
    id: '1',
    name: 'Deva Chandan',
    email: 'deva.chandan@klu.ac.in',
    phone: '+1 234-567-8901',
    department: 'Computer Science',
    designation: 'Professor',
    experience: '15 years',
    specialization: ['Data Structures', 'Algorithms', 'Database Systems'],
    assignedSubjects: ['Data Structures', 'Database Systems'],
    coursesHandling: 3,
    papersGenerated: 12,
    status: 'active',
    joinDate: '2024-01-15',
    office: 'CS-201',
    availability: 'available'
  },
  {
    id: '2',
    name: 'Kiran P',
    email: 'kiran.p@klu.ac.in',
    phone: '+1 234-567-8902',
    department: 'Computer Science',
    designation: 'Associate Professor',
    experience: '12 years',
    specialization: ['Web Development', 'Software Engineering', 'Mobile Apps'],
    assignedSubjects: ['Web Development'],
    coursesHandling: 2,
    papersGenerated: 8,
    status: 'active',
    joinDate: '2024-02-01',
    office: 'CS-205',
    availability: 'busy'
  }
];

// Mock subjects data
const mockSubjects = [
  { id: '1', name: 'Data Structures', code: 'CS201', credits: 4, semester: 3 },
  { id: '2', name: 'Database Systems', code: 'CS301', credits: 4, semester: 5 },
  { id: '3', name: 'Web Development', code: 'CS401', credits: 3, semester: 7 },
  { id: '4', name: 'Machine Learning', code: 'CS501', credits: 4, semester: 8 },
  { id: '5', name: 'Data Science', code: 'CS502', credits: 3, semester: 8 },
  { id: '6', name: 'Networks', code: 'CS302', credits: 4, semester: 5 },
  { id: '7', name: 'Cybersecurity', code: 'CS602', credits: 3, semester: 9 },
  { id: '8', name: 'Operating Systems', code: 'CS303', credits: 4, semester: 5 }
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
        <Button variant="default" className="w-full justify-start">
          <Users className="mr-2 h-4 w-4" />
          Faculty Assignment
        </Button>
      </nav>
    </div>
  );
}

function AddFacultyDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Faculty
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Faculty Member</DialogTitle>
          <DialogDescription>
            Add a new faculty member to the system
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Dr. John Doe" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john.doe@university.edu" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+1 234-567-8900" />
            </div>
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="associate">Associate Professor</SelectItem>
                  <SelectItem value="assistant">Assistant Professor</SelectItem>
                  <SelectItem value="lecturer">Lecturer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="experience">Experience</Label>
              <Input id="experience" placeholder="e.g., 5 years" />
            </div>
            <div>
              <Label htmlFor="office">Office</Label>
              <Input id="office" placeholder="e.g., CS-201" />
            </div>
          </div>

          <div>
            <Label>Specialization Areas</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['Data Structures', 'Algorithms', 'Database Systems', 'Web Development', 'Machine Learning', 'Networks'].map((spec) => (
                <div key={spec} className="flex items-center space-x-2">
                  <Checkbox id={spec} />
                  <Label htmlFor={spec} className="text-sm">{spec}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Subject Assignment</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {mockSubjects.slice(0, 6).map((subject) => (
                <div key={subject.id} className="flex items-center space-x-2">
                  <Checkbox id={subject.id} />
                  <Label htmlFor={subject.id} className="text-sm">{subject.name}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Add Faculty</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignSubjectsDialog({ faculty }: { faculty: any }) {
  const [open, setOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState(faculty.assignedSubjects);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Subjects to {faculty.name}</DialogTitle>
          <DialogDescription>
            Select subjects to assign to this faculty member
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            {mockSubjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={subject.id}
                    checked={selectedSubjects.includes(subject.name)}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        setSelectedSubjects([...selectedSubjects, subject.name]);
                      } else {
                        setSelectedSubjects(selectedSubjects.filter((s: string) => s !== subject.name));
                      }
                    }}
                  />
                  <div>
                    <Label htmlFor={subject.id} className="font-medium">{subject.name}</Label>
                    <div className="text-sm text-gray-500">
                      {subject.code} • {subject.credits} credits • Semester {subject.semester}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">
                  Sem {subject.semester}
                </Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Update Assignment</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FacultyAssignmentPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>;
      case 'on-leave':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">On Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Available</Badge>;
      case 'busy':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Busy</Badge>;
      case 'on-leave':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">On Leave</Badge>;
      default:
        return <Badge variant="outline">{availability}</Badge>;
    }
  };

  const filteredFaculty = mockFaculty.filter(faculty => {
    const matchesSearch = faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faculty.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faculty.specialization.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || faculty.status === statusFilter;
    const matchesDesignation = designationFilter === 'all' || faculty.designation.toLowerCase().includes(designationFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesDesignation;
  });

  const totalFaculty = mockFaculty.length;
  const activeFaculty = mockFaculty.filter(f => f.status === 'active').length;
  const totalSubjects = mockSubjects.length;
  const assignedSubjects = mockSubjects.filter(s =>
    mockFaculty.some(f => f.assignedSubjects.includes(s.name))
  ).length;

  return (
    <ProtectedRoute allowedRoles={['coordinator']}>
      <DashboardLayout sidebar={<CoordinatorSidebar />}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Faculty Assignment</h1>
              <p className="mt-2 text-gray-600">
                Manage faculty members and their subject assignments
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import Faculty
              </Button>
              <AddFacultyDialog />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalFaculty}</div>
                <p className="text-xs text-muted-foreground">
                  Registered members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Faculty</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeFaculty}</div>
                <p className="text-xs text-muted-foreground">
                  Currently active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSubjects}</div>
                <p className="text-xs text-muted-foreground">
                  Available courses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned Subjects</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignedSubjects}</div>
                <p className="text-xs text-muted-foreground">
                  Currently assigned
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Faculty Management */}
          <Card>
            <CardHeader>
              <CardTitle>Faculty Members</CardTitle>
              <CardDescription>
                Manage faculty members and their subject assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search faculty by name, email, or specialization..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={designationFilter} onValueChange={setDesignationFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Designations</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="associate">Associate Professor</SelectItem>
                    <SelectItem value="assistant">Assistant Professor</SelectItem>
                    <SelectItem value="lecturer">Lecturer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Faculty Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faculty Details</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Assigned Subjects</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFaculty.map((faculty) => (
                      <TableRow key={faculty.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{faculty.name}</div>
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {faculty.office}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {faculty.email}
                            </div>
                            <div className="text-sm flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {faculty.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{faculty.designation}</div>
                            <div className="text-sm text-gray-500">{faculty.experience}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {faculty.specialization.slice(0, 2).map((spec, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {faculty.specialization.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{faculty.specialization.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {faculty.assignedSubjects.length > 0 ? (
                              <div className="space-y-1">
                                {faculty.assignedSubjects.map((subject, index) => (
                                  <div key={index} className="text-sm">
                                    {subject}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No assignments</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{faculty.coursesHandling}</div>
                            <div className="text-sm text-gray-500">courses</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(faculty.status)}
                            {getAvailabilityBadge(faculty.availability)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <AssignSubjectsDialog faculty={faculty} />
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