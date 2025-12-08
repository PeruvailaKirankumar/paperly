# Paperly - Feature Checklist

## Last Updated: 7 December 2025

---

## Student Features

### 1. Exam Management
- [x] View available exam sets (preconfigured by admin)
- [x] Take exams online
- [x] View exam instructions before starting
- [x] Submit exam answers
- [x] View past results and scores

### 2. Anti-Cheat Measures
- [x] Tab switch detection (warns/logs when student leaves exam tab)
- [x] Copy/paste prevention during exam
- [x] Right-click context menu disabled
- [x] Full-screen mode enforcement
- [x] Browser DevTools detection
- [x] Time tracking per question
- [x] Randomized question order
- [x] Automatic submission on time expiry

### 3. AI-Based Evaluation
- [ ] Automatic MCQ grading
- [ ] AI evaluation for short answer questions
- [ ] AI evaluation for descriptive answers
- [ ] Similarity checking for plagiarism detection
- [ ] Detailed feedback generation

---

## Admin/Faculty Features

### 1. Centralized Dashboard
- [ ] Login/Authentication system
- [ ] Overview of all subjects
- [ ] Quick stats (total students, exams, subjects)
- [ ] Recent activity feed

### 2. Subject Management
- [x] Create new subjects
- [x] Edit existing subjects
- [x] Delete subjects
- [ ] Assign faculty to subjects
- [x] View subject details

### 3. Material Management
- [x] Upload study materials (PDF, DOC, PPT, etc.)
- [x] Organize materials by topics/modules
- [x] Generate RAG data from uploaded materials
- [x] Save RAG data to Firestore
- [x] View/download uploaded materials
- [x] Delete materials

### 4. Mock Test Generation
- [x] Trigger mock test generation for a subject
- [x] Configure test parameters (duration, marks, question types)
- [x] Generate MCQs automatically
- [x] Generate short answer questions
- [x] Generate long answer questions
- [x] Preview generated questions
- [x] Edit generated questions
- [x] Publish mock test

### 5. Question Paper Generation
- [x] Create question paper with custom parameters
- [x] Select question types and difficulty
- [x] Generate PDF of question paper
- [x] Password protect the PDF
- [x] Download password-protected PDF
- [ ] Email password to faculty
- [x] Store password securely in database

### 6. Exam Management
- [x] Schedule exams (date, time, duration)
- [x] Assign exams to student groups/classes
- [x] Configure exam settings (anti-cheat, randomization)
- [ ] Monitor live exam sessions
- [ ] View student progress during exam
- [ ] Manually end/extend exams

### 7. Results & Reports
- [x] View exam results by exam
- [x] View results by student
- [x] View results by subject
- [x] Generate detailed reports (PDF/Excel)
- [x] Statistical analysis (average, median, distribution)
- [ ] Performance trends over time
- [x] Export results data

---

## Technical Features

### 1. Firebase Integration
- [x] Firebase configuration setup
- [x] Firestore database schema
- [x] Firebase Authentication setup
- [x] Firebase Storage for files
- [ ] Firebase Cloud Functions (optional)

### 2. Backend API Integration
- [ ] Connect to Python FastAPI backend
- [ ] RAG service integration
- [ ] Question generation service
- [ ] AI evaluation service
- [ ] Document processing service

### 3. Security
- [ ] User authentication & authorization
- [ ] Role-based access control (Student/Faculty/Admin)
- [ ] Secure API endpoints
- [ ] Data encryption
- [ ] Password hashing
- [ ] Session management

### 4. Email System
- [ ] Email service configuration
- [ ] Password delivery emails
- [ ] Exam notification emails
- [ ] Result notification emails

---

## Implementation Progress Tracker

### Milestone 1: Basic Structure (Tasks 1-5) ✅ COMPLETED
- [x] Feature checklist created
- [x] Firebase configuration
- [x] Student dashboard HTML
- [x] Student exam interface
- [x] Admin dashboard HTML

### Milestone 2: Core Functionality (Tasks 6-10) ✅ COMPLETED
- [x] Subject management
- [x] Mock test generator
- [x] Question paper generator
- [x] Results dashboard
- [x] Firebase backend services

### Milestone 3: Integration & Polish (Tasks 11-12) 🔄 IN PROGRESS
- [ ] AI evaluation integration
- [ ] Email notification system

---

## Notes
- All HTML files will use structured HTML without build tools
- Firebase JS SDK will be loaded via CDN (version 12.6.0)
- Anti-cheat features will be JavaScript-based
- PDF generation will use backend service
- Checklist will be updated every 5 changes
