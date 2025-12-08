export type UserRole = 'hod' | 'coordinator' | 'faculty' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  subjects?: string[];
  studentId?: string; // For students
  enrolledSubjects?: string[]; // For students
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  loginWithGoogle: (role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
}