// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAQvdoPDmtR4ebp9ebQOvJGx7sWrfV3FAg",
    authDomain: "paperly-b08fb.firebaseapp.com",
    projectId: "paperly-b08fb",
    storageBucket: "paperly-b08fb.firebasestorage.app",
    messagingSenderId: "1035771786744",
    appId: "1:1035771786744:web:7e6d54287163c86752d20d",
    measurementId: "G-X4E9Q9PS9Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firebase services
export { 
    app, 
    analytics, 
    auth, 
    db, 
    storage,
    // Auth functions
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    // Firestore functions
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    // Storage functions
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
};
