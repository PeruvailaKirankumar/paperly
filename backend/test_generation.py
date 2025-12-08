#!/usr/bin/env python3

import asyncio
import json
from services.question_generation import QuestionGenerationService
from models import DifficultyLevel

async def test_question_generation():
    print("🧪 Testing Question Generation Service...")

    service = QuestionGenerationService()

    # Test 1: Simple generation without context
    print("\n📝 Test 1: Simple generation (5 questions about Python)")
    try:
        paper = service.generate_questions(
            topic="Python programming basics",
            difficulty=DifficultyLevel.MEDIUM,
            num_questions=5,
            question_types=["short_answer", "very_short_answer"],
            context_documents=[],
            custom_prompt="""Generate a question paper for: Python programming basics
Subject: Python programming basics
Difficulty level: medium
Question format: 5 short_answer questions (5 marks each)
IMPORTANT INSTRUCTIONS:
1. Generate EXACTLY 5 questions
2. Return ONLY a valid JSON array - no other text
3. Use question types: short_answer, very_short_answer
4. Each question must include all required fields

Expected JSON format:
[
  {
    "question_number": 1,
    "question_text": "Clear, well-formed question text",
    "question_type": "very_short_answer",
    "difficulty": "medium",
    "marks": 2,
    "sample_answer": "Brief answer or key points"
  }
]
CRITICAL: Generate exactly 5 questions in valid JSON format."""
        )

        print(f"✅ Generated {len(paper.questions)} questions")
        print(f"📋 Title: {paper.title}")
        print(f"📊 Total Marks: {paper.total_marks}")
        print(f"📅 Generated At: {paper.generated_at}")

        for i, q in enumerate(paper.questions, 1):
            print(f"\n❓ Question {i}:")
            print(f"   Text: {q.question_text}")
            print(f"   Type: {q.question_type}")
            print(f"   Marks: {q.marks}")
            print(f"   Difficulty: {q.difficulty}")

    except Exception as e:
        print(f"❌ Test 1 failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_question_generation())