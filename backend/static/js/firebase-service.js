// Firebase Service Module - Handles all Firebase operations

import { 
    auth, db, storage,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
    collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit,
    ref, uploadBytes, getDownloadURL, deleteObject
} from './firebase-config.js';

// ==================== Authentication Services ====================

export const authService = {
    // Sign in user
    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Sign up user
    async signUp(email, password, userData) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Save additional user data to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                role: userData.role || 'student',
                name: userData.name,
                createdAt: new Date().toISOString(),
                ...userData
            });
            
            return { success: true, user: user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Sign out user
    async signOutUser() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get current user
    getCurrentUser() {
        return auth.currentUser;
    },

    // Listen to auth state changes
    onAuthStateChange(callback) {
        return onAuthStateChanged(auth, callback);
    },

    // Get user data from Firestore
    async getUserData(uid) {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { success: true, data: docSnap.data() };
            } else {
                return { success: false, error: 'User not found' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// ==================== Subject Services ====================

export const subjectService = {
    // Create a new subject
    async createSubject(subjectData) {
        try {
            const docRef = await addDoc(collection(db, 'subjects'), {
                ...subjectData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get all subjects
    async getAllSubjects() {
        try {
            const querySnapshot = await getDocs(collection(db, 'subjects'));
            const subjects = [];
            querySnapshot.forEach((doc) => {
                subjects.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: subjects };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get subject by ID
    async getSubject(subjectId) {
        try {
            const docRef = doc(db, 'subjects', subjectId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
            } else {
                return { success: false, error: 'Subject not found' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Update subject
    async updateSubject(subjectId, subjectData) {
        try {
            const docRef = doc(db, 'subjects', subjectId);
            await updateDoc(docRef, {
                ...subjectData,
                updatedAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Delete subject
    async deleteSubject(subjectId) {
        try {
            await deleteDoc(doc(db, 'subjects', subjectId));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// ==================== Material Services ====================

export const materialService = {
    // Upload material file to Storage
    async uploadMaterial(file, subjectId, metadata = {}) {
        try {
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const storageRef = ref(storage, `materials/${subjectId}/${fileName}`);
            
            await uploadBytes(storageRef, file, { contentType: file.type });
            const downloadURL = await getDownloadURL(storageRef);
            
            // Save material metadata to Firestore
            const materialData = {
                subjectId: subjectId,
                fileName: file.name,
                storagePath: `materials/${subjectId}/${fileName}`,
                downloadURL: downloadURL,
                fileSize: file.size,
                fileType: file.type,
                uploadedAt: new Date().toISOString(),
                uploadedBy: auth.currentUser?.uid,
                ...metadata
            };
            
            const docRef = await addDoc(collection(db, 'materials'), materialData);
            
            return { success: true, id: docRef.id, url: downloadURL };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get materials for a subject
    async getMaterialsBySubject(subjectId) {
        try {
            const q = query(collection(db, 'materials'), where('subjectId', '==', subjectId));
            const querySnapshot = await getDocs(q);
            const materials = [];
            querySnapshot.forEach((doc) => {
                materials.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: materials };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Delete material
    async deleteMaterial(materialId, storagePath) {
        try {
            // Delete from Storage
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef);
            
            // Delete from Firestore
            await deleteDoc(doc(db, 'materials', materialId));
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Save RAG data to Firestore
    async saveRAGData(subjectId, ragData) {
        try {
            const docRef = await addDoc(collection(db, 'rag_data'), {
                subjectId: subjectId,
                ragData: ragData,
                createdAt: new Date().toISOString(),
                createdBy: auth.currentUser?.uid
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// ==================== Exam Services ====================

export const examService = {
    // Create exam
    async createExam(examData) {
        try {
            const docRef = await addDoc(collection(db, 'exams'), {
                ...examData,
                createdAt: new Date().toISOString(),
                createdBy: auth.currentUser?.uid,
                status: 'scheduled'
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get all exams
    async getAllExams() {
        try {
            const querySnapshot = await getDocs(collection(db, 'exams'));
            const exams = [];
            querySnapshot.forEach((doc) => {
                exams.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: exams };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get exams by subject
    async getExamsBySubject(subjectId) {
        try {
            const q = query(collection(db, 'exams'), where('subjectId', '==', subjectId));
            const querySnapshot = await getDocs(q);
            const exams = [];
            querySnapshot.forEach((doc) => {
                exams.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: exams };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get available exams for student
    async getAvailableExams(studentId) {
        try {
            const q = query(collection(db, 'exams'), where('status', '==', 'active'));
            const querySnapshot = await getDocs(q);
            const exams = [];
            querySnapshot.forEach((doc) => {
                exams.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: exams };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Submit exam answers
    async submitExam(examId, studentId, answers, metadata) {
        try {
            const docRef = await addDoc(collection(db, 'submissions'), {
                examId: examId,
                studentId: studentId,
                answers: answers,
                submittedAt: new Date().toISOString(),
                status: 'submitted',
                antiCheatLog: metadata.antiCheatLog || [],
                timeSpent: metadata.timeSpent || 0
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get student submissions
    async getStudentSubmissions(studentId) {
        try {
            const q = query(collection(db, 'submissions'), where('studentId', '==', studentId));
            const querySnapshot = await getDocs(q);
            const submissions = [];
            querySnapshot.forEach((doc) => {
                submissions.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: submissions };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get exam results
    async getExamResults(examId) {
        try {
            const q = query(collection(db, 'submissions'), where('examId', '==', examId));
            const querySnapshot = await getDocs(q);
            const results = [];
            querySnapshot.forEach((doc) => {
                results.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: results };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Update submission with evaluation
    async updateSubmissionEvaluation(submissionId, evaluation) {
        try {
            const docRef = doc(db, 'submissions', submissionId);
            await updateDoc(docRef, {
                evaluation: evaluation,
                score: evaluation.totalScore,
                evaluatedAt: new Date().toISOString(),
                status: 'evaluated'
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// ==================== Question Bank Services ====================

export const questionBankService = {
    // Save generated questions
    async saveQuestions(subjectId, questions, metadata) {
        try {
            const docRef = await addDoc(collection(db, 'question_banks'), {
                subjectId: subjectId,
                questions: questions,
                metadata: metadata,
                createdAt: new Date().toISOString(),
                createdBy: auth.currentUser?.uid
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Get questions by subject
    async getQuestionsBySubject(subjectId) {
        try {
            const q = query(collection(db, 'question_banks'), where('subjectId', '==', subjectId));
            const querySnapshot = await getDocs(q);
            const questionBanks = [];
            querySnapshot.forEach((doc) => {
                questionBanks.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: questionBanks };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// ==================== Utility Functions ====================

export const utils = {
    // Format timestamp
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    },

    // Get user role
    async getUserRole(uid) {
        const result = await authService.getUserData(uid);
        if (result.success) {
            return result.data.role;
        }
        return null;
    }
};
