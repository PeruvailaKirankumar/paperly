'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthState } from '@/types/auth';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';

// Mock users for faculty, HOD, and coordinator (no Firebase auth required)
const MOCK_USERS = [
  {
    id: 'hod-001',
    email: 'hod@klu.ac.in',
    name: 'Dr. John Smith',
    role: 'hod' as UserRole,
    department: 'Computer Science',
    password: 'hod123'
  },
  {
    id: 'coord-001',
    email: 'coordinator@klu.ac.in',
    name: 'Prof. Deva Chandan',
    role: 'coordinator' as UserRole,
    department: 'Computer Science',
    subjects: ['Data Structures', 'Algorithms', 'Database Systems'],
    password: 'coord123'
  },
];

const AuthContext = createContext<AuthState | undefined>(undefined);
const googleProvider = new GoogleAuthProvider();

// Configure Google provider to only allow @klu.ac.in domain
googleProvider.setCustomParameters({
  hd: 'klu.ac.in' // Hosted domain parameter
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored mock user (faculty/hod/coordinator)
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      } catch (error) {
        localStorage.removeItem('mockUser');
      }
    }

    // Listen to Firebase auth state changes (for students only)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Validate email domain
        if (!firebaseUser.email?.endsWith('@klu.ac.in')) {
          await firebaseSignOut(auth);
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Get user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const appUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: userData.name || firebaseUser.displayName || 'User',
              role: 'student' as UserRole,
              department: userData.department,
              studentId: userData.studentId,
              enrolledSubjects: userData.enrolledSubjects
            };
            setUser(appUser);
            setIsAuthenticated(true);
          } else {
            // User document doesn't exist, might be new user
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      // Validate KLU email domain
      if (!email.toLowerCase().endsWith('@klu.ac.in')) {
        throw new Error('Please use your KLU email address (@klu.ac.in)');
      }

      // For faculty, hod, coordinator - use mock authentication
      if (role !== 'student') {
        const mockUser = MOCK_USERS.find(
          u => u.email === email && u.password === password && u.role === role
        );

        if (mockUser) {
          const { password: _, ...userWithoutPassword } = mockUser;
          setUser(userWithoutPassword);
          setIsAuthenticated(true);
          localStorage.setItem('mockUser', JSON.stringify(userWithoutPassword));
          return true;
        }
        return false;
      }

      // For students - this would use Firebase Auth, but we'll keep it simple
      // Students should use Google Sign-In instead
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginWithGoogle = async (role: UserRole): Promise<boolean> => {
    try {
      // Google Sign-In only for students
      if (role !== 'student') {
        throw new Error('Google Sign-In is only available for students');
      }

      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Validate email domain
      if (!firebaseUser.email?.endsWith('@klu.ac.in')) {
        await firebaseSignOut(auth);
        throw new Error('Please use your KLU email address (@klu.ac.in)');
      }

      // Check if user document exists
      let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      let userData;

      if (!userDoc.exists()) {
        // Create new user document in Firestore
        userData = {
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          role: 'student',
          department: 'Computer Science',
          createdAt: new Date().toISOString(),
          enrolledSubjects: [],
          studentId: firebaseUser.uid.substring(0, 10)
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      } else {
        userData = userDoc.data();
      }

      // Set the user state directly to avoid race condition with onAuthStateChanged
      const appUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name: userData.name || firebaseUser.displayName || 'User',
        role: 'student' as UserRole,
        department: userData.department,
        studentId: userData.studentId,
        enrolledSubjects: userData.enrolledSubjects
      };
      setUser(appUser);
      setIsAuthenticated(true);

      return true;
    } catch (error: any) {
      console.error('Google login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        return false;
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear mock user
      localStorage.removeItem('mockUser');

      // Sign out from Firebase (for students)
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }

      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}