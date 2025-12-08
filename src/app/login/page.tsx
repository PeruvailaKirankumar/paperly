'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, FileText, ShieldCheck, AlertCircle, GraduationCap, Chrome } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  // Validate @klu.ac.in domain
  const validateEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('@klu.ac.in');
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const success = await loginWithGoogle(role);
      if (success) {
        const dashboardRoutes = {
          hod: '/dashboard/hod',
          coordinator: '/dashboard/coordinator',
          faculty: '/dashboard/faculty',
          student: '/dashboard/student'
        };
        router.push(dashboardRoutes[role]);
      } else {
        setError('Google sign-in was cancelled or failed.');
      }
    } catch (err: any) {
      if (err.message?.includes('@klu.ac.in')) {
        setError('Please use your KLU email address (@klu.ac.in)');
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate KLU email domain
    if (!validateEmail(email)) {
      setError('Please use your KLU email address (@klu.ac.in)');
      setLoading(false);
      return;
    }

    try {
      const success = await login(email, password, role);
      if (success) {
        // Redirect based on role
        const dashboardRoutes = {
          hod: '/dashboard/hod',
          coordinator: '/dashboard/coordinator',
          faculty: '/dashboard/faculty',
          student: '/dashboard/student'
        };
        router.push(dashboardRoutes[role]);
      } else {
        setError('Invalid credentials. Please check your email, password, and role.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
    
    setLoading(false);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(`${type}-copied`);
    setTimeout(() => setCopied(''), 2000);
  };

  const fillCredentials = (email: string, password: string, roleValue: UserRole) => {
    setEmail(email);
    setPassword(password);
    setRole(roleValue);
  };

  const demoCredentials = [
    { role: 'Student', email: 'student@klu.ac.in', password: 'student123', roleValue: 'student' as UserRole, color: 'bg-purple-50 border-purple-200' },
    { role: 'Faculty', email: 'faculty@klu.ac.in', password: 'faculty123', roleValue: 'faculty' as UserRole, color: 'bg-green-50 border-green-200' },
    { role: 'Course Coordinator', email: 'coordinator@klu.ac.in', password: 'coord123', roleValue: 'coordinator' as UserRole, color: 'bg-blue-50 border-blue-200' },
    { role: 'HoD', email: 'hod@klu.ac.in', password: 'hod123', roleValue: 'hod' as UserRole, color: 'bg-red-50 border-red-200' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back to Home */}
        <div className="flex items-center justify-center">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-2">
              <GraduationCap className="h-10 w-10 text-blue-600 mr-2" />
              <div>
                <CardTitle className="text-2xl font-bold">
                  Paperly
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">KL University</p>
              </div>
            </div>
            <CardDescription>
              Exam Management & Question Paper Generation
            </CardDescription>
            <div className="flex items-center justify-center gap-2 pt-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-xs text-gray-600">Secure Login with @klu.ac.in</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="coordinator">Course Coordinator</SelectItem>
                    <SelectItem value="hod">Head of Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">KLU Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@klu.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={email && !validateEmail(email) ? 'border-red-500' : ''}
                />
                {email && !validateEmail(email) && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>Must be a @klu.ac.in email address</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded border border-red-200">{error}</div>
              )}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              {role === 'student' && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                  >
                    {googleLoading ? (
                      'Signing in with Google...'
                    ) : (
                      <>
                        <Chrome className="h-5 w-5 mr-2" />
                        Sign in with Google
                      </>
                    )}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              🚀 Test Accounts
            </CardTitle>
            <CardDescription>
              Faculty/HOD/Coordinator: Use email/password. Students: Sign in with KLU Google account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoCredentials.map((cred, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${cred.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="font-medium">{cred.role}</Badge>
                  <Button 
                    size="sm" 
                    onClick={() => fillCredentials(cred.email, cred.password, cred.roleValue)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Use
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Email:</span>
                    <div className="flex items-center space-x-2">
                      <code className="bg-white px-2 py-1 rounded border font-mono text-xs">
                        {cred.email}
                      </code>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(cred.email, `email-${index}`)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Password:</span>
                    <div className="flex items-center space-x-2">
                      <code className="bg-white px-2 py-1 rounded border font-mono text-xs">
                        {cred.password}
                      </code>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(cred.password, `pass-${index}`)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                {copied === `email-${index}-copied` && (
                  <div className="text-xs text-green-600 mt-1">Email copied!</div>
                )}
                {copied === `pass-${index}-copied` && (
                  <div className="text-xs text-green-600 mt-1">Password copied!</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}