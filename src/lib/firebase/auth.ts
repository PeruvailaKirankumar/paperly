// Firebase Authentication Service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User, UserRole } from '@/types/auth';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export const authService = {
  // Sign in
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // Validate KLU email domain
      if (!email.toLowerCase().endsWith('@klu.ac.in')) {
        return { 
          success: false, 
          error: 'Please use your KLU email address (@klu.ac.in)' 
        };
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: userData.name,
          role: userData.role as UserRole,
          department: userData.department,
          subjects: userData.subjects
        };
        
        return { success: true, user };
      } else {
        return { success: false, error: 'User data not found' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Sign up
  async signUp(
    email: string, 
    password: string, 
    userData: Omit<User, 'id' | 'email'>
  ): Promise<AuthResult> {
    try {
      // Validate KLU email domain
      if (!email.toLowerCase().endsWith('@klu.ac.in')) {
        return { 
          success: false, 
          error: 'Please use your KLU email address (@klu.ac.in)' 
        };
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update profile
      await updateProfile(firebaseUser, {
        displayName: userData.name
      });
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email,
        name: userData.name,
        role: userData.role,
        department: userData.department,
        subjects: userData.subjects || [],
        createdAt: new Date().toISOString()
      });
      
      const user: User = {
        id: firebaseUser.uid,
        email,
        ...userData
      };
      
      return { success: true, user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  // Get user data from Firestore
  async getUserData(uid: string): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          success: true,
          data: {
            id: uid,
            email: data.email,
            name: data.name,
            role: data.role as UserRole,
            department: data.department,
            subjects: data.subjects
          }
        };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Send password reset email
  async sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: (error as Error).message };
    }
  }
};
