# Paperly - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Prerequisites
- Node.js 18+ and npm/yarn/bun
- Python 3.11+
- Git

### Installation

```bash
# Clone or navigate to project
cd Paperly

# Run setup script (Linux/Mac)
chmod +x setup.sh
./setup.sh

# OR manually:
npm install
cd backend && pip install -r requirements.txt && cd ..
```

### Start Development

**Terminal 1 - Backend:**
```bash
cd backend
python start.py
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Visit: `http://localhost:3000`

## 👥 Test Accounts

**Important:** All accounts must use @klu.ac.in email domain.

### Student
- **Email:** student@klu.ac.in
- **Password:** student123
- **Access:** Take exams, view results

### Faculty
- **Email:** faculty@klu.ac.in
- **Password:** faculty123
- **Access:** View materials, submit feedback

### Coordinator
- **Email:** coordinator@klu.ac.in  
- **Password:** coord123
- **Access:** Manage subjects, generate exams, view results

### HOD
- **Email:** hod@klu.ac.in
- **Password:** hod123
- **Access:** Full administrative access

## 🎯 Key Pages

### Student Portal
- **Dashboard:** `/dashboard/student`
- **Take Exam:** `/dashboard/student/exam/[id]`

### Admin Portal
- **Subjects:** `/dashboard/coordinator/subjects`
- **Generate Exam:** `/dashboard/coordinator/generate`
- **Results:** `/dashboard/coordinator/results`

## 📋 Feature Overview

### ✅ Implemented (10/12 tasks)
1. ✅ Student dashboard with exam list
2. ✅ Exam taking with anti-cheat (tab detection, copy/paste prevention, fullscreen)
3. ✅ Subject management with material uploads
4. ✅ RAG data processing
5. ✅ AI-powered question generation (Mock & Question Papers)
6. ✅ Results dashboard with statistics
7. ✅ Excel export
8. ✅ Firebase integration (Auth, Firestore, Storage)

### 🔄 Pending (2/12 tasks)
1. ⏳ AI evaluation service integration
2. ⏳ Email notifications (password delivery)

## 🔐 Security Features

- Firebase Authentication
- Role-based access control
- Anti-cheat monitoring:
  - Tab switch detection
  - Copy/paste prevention  
  - Fullscreen enforcement
  - DevTools detection
  - Violation logging

## 📊 Data Flow

```
1. Upload Materials → Firebase Storage
2. Process RAG → Backend API → Firestore
3. Generate Questions → Backend AI → Preview
4. Create Exam → Firestore
5. Student Takes Exam → Anti-cheat monitoring
6. Submit → AI Evaluation → Results
7. View Reports → Export Data
```

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend:** FastAPI, Python 3.11
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage
- **Auth:** Firebase Authentication
- **AI:** Custom RAG + Question Generation

## 📁 Key Files

```
src/
├── lib/firebase/          # Firebase services
│   ├── config.ts          # Firebase init
│   ├── auth.ts            # Auth service
│   ├── firestore.ts       # Database ops
│   └── storage.ts         # File uploads
├── app/dashboard/
│   ├── student/           # Student pages
│   └── coordinator/       # Admin pages
└── types/auth.ts          # Type definitions

backend/
├── services/
│   ├── rag_service.py     # RAG processing
│   └── question_generation.py
└── main.py                # FastAPI server
```

## 🐛 Troubleshooting

### Firebase Errors
```bash
# Install Firebase if missing
npm install firebase
```

### Backend Not Starting
```bash
cd backend
pip install -r requirements.txt
python start.py
```

### Port Already in Use
```bash
# Frontend (default 3000)
npm run dev -- -p 3001

# Backend (default 8000)
cd backend
uvicorn main:app --port 8001
```

## 📝 Development Workflow

1. **Add Subject** (Coordinator)
   - Navigate to `/dashboard/coordinator/subjects`
   - Click "Add Subject"
   - Fill details and save

2. **Upload Materials**
   - Select subject
   - Click "Upload"
   - Choose files (PDF, DOC, PPT)
   - Click "Process RAG" to generate embeddings

3. **Generate Exam**
   - Go to `/dashboard/coordinator/generate`
   - Select subject, configure parameters
   - Click "Generate Questions"
   - Review and create exam

4. **Take Exam** (Student)
   - Login as student
   - View available exams
   - Click "Start Exam"
   - Complete and submit

5. **View Results** (Coordinator)
   - Go to `/dashboard/coordinator/results`
   - Select exam
   - View statistics
   - Export data

## 🎨 Customization

### Adding New Question Types

**1. Update Firestore Type:**
```typescript
// src/lib/firebase/firestore.ts
type: 'mcq' | 'short_answer' | 'long_answer' | 'true_false' | 'your_new_type'
```

**2. Update Exam Interface:**
```typescript
// src/app/dashboard/student/exam/[examId]/page.tsx
{currentQ.type === 'your_new_type' && (
  // Your custom question renderer
)}
```

### Modifying Anti-Cheat Rules
```typescript
// src/app/dashboard/student/exam/[examId]/page.tsx
// Change violation threshold
if (warnings >= 4) { // Default: 5
  handleSubmit();
}
```

## 📚 Documentation

- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Full technical details
- [Features Checklist](./FEATURES_CHECKLIST.md) - Progress tracking
- [Backend README](./backend/README.md) - API documentation

## 🤝 Contributing

1. Check [FEATURES_CHECKLIST.md](./FEATURES_CHECKLIST.md) for pending tasks
2. Create feature branch
3. Implement with tests
4. Submit PR with description

## 📞 Support

- Check documentation first
- Review implementation guide
- Check Firebase console for data
- Verify backend logs

## 🎉 Success Indicators

You know it's working when:
- ✅ Frontend loads at localhost:3000
- ✅ Backend responds at localhost:8000/health
- ✅ Can login as test user
- ✅ Can upload materials
- ✅ Questions generate successfully
- ✅ Exams can be taken with anti-cheat active
- ✅ Results appear in dashboard

## 🔮 Next Steps

1. Integrate AI evaluation service
2. Setup email notifications (SendGrid/Mailgun)
3. Implement PDF generation with passwords
4. Add real-time exam monitoring
5. Deploy to production (Vercel + Cloud Run)

---

**Version:** 1.0.0  
**Last Updated:** December 7, 2025  
**Status:** Core features complete, ready for testing

Need help? Check IMPLEMENTATION_GUIDE.md for detailed information.
