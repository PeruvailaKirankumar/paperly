'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    User,
    Mail,
    GraduationCap,
    BookOpen,
    ArrowLeft,
    LogOut
} from 'lucide-react';

export default function StudentProfile() {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || user?.role !== 'student')) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, user, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" onClick={() => router.push('/dashboard/student')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </div>
                        <Button variant="outline" onClick={handleLogout} className="text-red-600">
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-10 w-10 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">{user?.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline">Student</Badge>
                                    <span>{user?.department || 'Computer Science'}</span>
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Profile Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500">Email</p>
                                        <p className="font-medium">{user?.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <GraduationCap className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500">Student ID</p>
                                        <p className="font-medium">{user?.studentId || user?.id?.substring(0, 10)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500">Department</p>
                                        <p className="font-medium">{user?.department || 'Computer Science'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500">Enrolled Subjects</p>
                                        <p className="font-medium">
                                            {user?.enrolledSubjects?.length || 0} subjects
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enrolled Subjects */}
                        {user?.enrolledSubjects && user.enrolledSubjects.length > 0 && (
                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-3">Enrolled Subjects</h3>
                                <div className="flex flex-wrap gap-2">
                                    {user.enrolledSubjects.map((subject: string, index: number) => (
                                        <Badge key={index} variant="secondary">{subject}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
