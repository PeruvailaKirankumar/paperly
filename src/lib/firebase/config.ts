// Firebase Configuration
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAQvdoPDmtR4ebp9ebQOvJGx7sWrfV3FAg",
  authDomain: "paperly-b08fb.firebaseapp.com",
  projectId: "paperly-b08fb",
  storageBucket: "paperly-b08fb.firebasestorage.app",
  messagingSenderId: "1035771786744",
  appId: "1:1035771786744:web:7e6d54287163c86752d20d",
  measurementId: "G-X4E9Q9PS9Z"
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize analytics only in browser
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}

export { analytics };
export default app;
