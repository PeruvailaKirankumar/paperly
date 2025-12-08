from anthropic import Anthropic
from typing import List, Dict, Any, Optional
from langchain_core.documents import Document
from config import settings
from models import DifficultyLevel, Question, QuestionPaper
import json
import re
from datetime import datetime


class QuestionGenerationService:
    """Service for generating question papers using LLM."""
    
    def __init__(self):
        self.client = Anthropic(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url
        )
        self.model = settings.llm_model
        self.max_tokens = settings.max_tokens
    
    def _build_prompt(
        self,
        topic: Optional[str],
        difficulty: DifficultyLevel,
        num_questions: int,
        question_types: Optional[List[str]],
        context_documents: List[Document]
    ) -> str:
        """Build the prompt for question generation."""
        
        # Difficulty descriptions
        difficulty_guide = {
            DifficultyLevel.EASY: "Easy (Basic understanding, recall, and simple application)",
            DifficultyLevel.MEDIUM: "Medium (Analysis, application, and comprehension)",
            DifficultyLevel.HARD: "Hard (Synthesis, evaluation, and complex problem-solving)"
        }
        
        # Build context from documents
        context_text = ""
        if context_documents:
            context_text = "Context from study materials:\n\n"
            for i, doc in enumerate(context_documents[:10], 1):  # Limit to top 10
                context_text += f"--- Context {i} ---\n{doc.page_content}\n\n"
        
        # Build question types specification
        types_text = ""
        if question_types:
            types_text = f"\nQuestion types to include: {', '.join(question_types)}"
        else:
            types_text = "\nQuestion types: Mix of MCQ, short answer, and long answer questions"
        
        # Topic specification
        topic_text = f"Topic: {topic}\n" if topic else ""
        
        prompt = f"""You are an expert educational content creator tasked with generating a comprehensive question paper.

{topic_text}Difficulty Level: {difficulty_guide[difficulty]}
Number of Questions: {num_questions}{types_text}

{context_text}

Instructions:
1. Generate exactly {num_questions} high-quality questions based on the provided context
2. Ensure questions match the {difficulty.value} difficulty level
3. Each question should test different aspects of the material
4. Include a variety of question types unless specified otherwise
5. Provide appropriate marks for each question based on difficulty and type
6. Include sample answers or answer keys where appropriate
7. Ensure questions are clear, unambiguous, and educationally sound

For each question, provide the following in JSON format:
- question_number: Sequential number
- question_text: The actual question
- question_type: One of [mcq, short_answer, long_answer, numerical, true_false]
- difficulty: {difficulty.value}
- marks: Appropriate marks (1-10)
- sample_answer: Brief answer or key points
- context_source: Brief reference to which context was used (if applicable)

Return ONLY a JSON array of questions, no additional text. Format:
[
  {{
    "question_number": 1,
    "question_text": "...",
    "question_type": "mcq",
    "difficulty": "{difficulty.value}",
    "marks": 2,
    "sample_answer": "...",
    "context_source": "Context 1"
  }},
  ...
]"""
        
        return prompt
    
    def generate_questions(
        self,
        topic: Optional[str],
        difficulty: DifficultyLevel,
        num_questions: int,
        question_types: Optional[List[str]],
        context_documents: List[Document],
        custom_prompt: Optional[str] = None
    ) -> QuestionPaper:
        """
        Generate a question paper using the LLM.
        
        Args:
            topic: Optional topic to focus on
            difficulty: Difficulty level
            num_questions: Number of questions to generate
            question_types: Types of questions to generate
            context_documents: Relevant context from RAG
            
        Returns:
            QuestionPaper object
        """
        prompt = custom_prompt or self._build_prompt(
            topic, difficulty, num_questions, question_types, context_documents
        )
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=0.7,  # Slightly higher for creativity
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Extract response text
            response_text = response.content[0].text if response.content else "[]"
            
            # Parse JSON response
            questions_data = self._extract_json(response_text)
            
            # Convert to Question objects
            questions = []
            total_marks = 0
            
            for q_data in questions_data:
                question = Question(
                    question_number=q_data.get("question_number", len(questions) + 1),
                    question_text=q_data.get("question_text", ""),
                    question_type=q_data.get("question_type", "short_answer"),
                    difficulty=DifficultyLevel(q_data.get("difficulty", difficulty.value)),
                    marks=q_data.get("marks", 5),
                    options=q_data.get("options"),  # For MCQ/true_false
                    correct_answer=q_data.get("correct_answer"),  # For MCQ/true_false
                    sample_answer=q_data.get("sample_answer"),
                    context_source=q_data.get("context_source")
                )
                questions.append(question)
                total_marks += question.marks
            
            # Create question paper
            paper = QuestionPaper(
                title=f"{topic or 'General'} - {difficulty.value.title()} Level Question Paper",
                subject=topic,
                difficulty=difficulty,
                total_marks=total_marks,
                questions=questions,
                instructions="Read all questions carefully. Write your answers clearly and concisely.",
                generated_at=datetime.now().isoformat()
            )
            
            return paper
            
        except Exception as e:
            print(f"Error generating questions: {str(e)}")
            raise
    
    def _extract_json(self, text: str) -> List[Dict[str, Any]]:
        """Extract JSON array from text response."""
        print(f"AI Response (first 1000 chars): {text[:1000]}")

        # Try to find JSON object with multiple patterns, markdown format first
        patterns = [
            r'```json\s*(\[[\s\S]*?\])\s*```',  # Markdown JSON block
            r'```\s*(\[[\s\S]*?\])\s*```',       # Generic code block
            r'Questions:\s*(\[[\s\S]*?\])',        # "Questions:" prefix
            r'\[.*?{.*?question.*?}.*?\]',        # Any array with question objects
            r'\[[\s\S]*\]',                       # Any array (fallback)
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                json_text = match.group(1) if match.groups() else match.group(0)
                try:
                    parsed_json = json.loads(json_text)
                    print(f"✅ Successfully parsed JSON with pattern: {pattern}")
                    return parsed_json
                except json.JSONDecodeError as e:
                    print(f"❌ JSON decode error with pattern {pattern}: {e}")
                    print(f"JSON text was: {json_text[:200]}...")
                    continue

        # If no JSON found, try to create dummy questions based on text
        print("No valid JSON found, creating fallback questions...")
        return self._create_fallback_questions(text)

    def _create_fallback_questions(self, text: str) -> List[Dict[str, Any]]:
        """Create fallback questions when JSON extraction fails."""
        questions = []

        # Split text by lines and look for question-like content
        lines = [line.strip() for line in text.split('\n') if line.strip()]

        # Look for numbered questions or question patterns
        question_patterns = [
            r'^\d+\.\s*(.+)$',  # "1. Question text"
            r'^Q\d*\.\s*(.+)$',  # "Q1. Question text"
            r'^\?\s*(.+)$',  # "? Question text"
            r'^(.*)\?\s*$',  # "Question text?"
        ]

        for i, line in enumerate(lines[:10], 1):  # Max 10 fallback questions
            if len(line) > 10:  # Skip very short lines
                # Try to match question patterns
                matched = False
                for pattern in question_patterns:
                    match = re.match(pattern, line)
                    if match:
                        question_text = match.group(1) if match.groups() else line
                        questions.append({
                            "question_number": i,
                            "question_text": question_text,
                            "question_type": "short_answer",
                            "difficulty": "medium",
                            "marks": 5,
                            "sample_answer": "Answer will be provided during evaluation.",
                            "context_source": "Generated from AI response"
                        })
                        matched = True
                        break

                if not matched and any(keyword in line.lower() for keyword in ['what', 'how', 'why', 'explain', 'describe', 'compare', 'analyze']):
                    questions.append({
                        "question_number": i,
                        "question_text": line,
                        "question_type": "short_answer",
                        "difficulty": "medium",
                        "marks": 5,
                        "sample_answer": "Answer will be provided during evaluation.",
                        "context_source": "Generated from AI response"
                    })

        # If still no questions, create a generic one
        if not questions:
            questions.append({
                "question_number": 1,
                "question_text": "Explain the key concepts discussed in the provided material.",
                "question_type": "short_answer",
                "difficulty": "medium",
                "marks": 5,
                "sample_answer": "Answer should cover the main topics and concepts.",
                "context_source": "Generated as fallback"
            })

        print(f"Created {len(questions)} fallback questions")
        return questions
    
    def regenerate_question(
        self,
        original_question: Question,
        context_documents: List[Document],
        feedback: str = ""
    ) -> Question:
        """Regenerate a single question based on feedback."""
        prompt = f"""Regenerate the following question with improvements:

Original Question:
{original_question.question_text}

Type: {original_question.question_type}
Difficulty: {original_question.difficulty.value}
Marks: {original_question.marks}

{f"Feedback: {feedback}" if feedback else ""}

Context:
{context_documents[0].page_content if context_documents else ""}

Generate an improved version of this question maintaining the same type and difficulty.
Return as JSON:
{{
  "question_text": "...",
  "sample_answer": "..."
}}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = response.content[0].text if response.content else "{}"
            data = self._extract_json(response_text)
            
            if data and isinstance(data, list) and len(data) > 0:
                data = data[0]
            elif not isinstance(data, dict):
                data = {}
            
            # Update question
            original_question.question_text = data.get("question_text", original_question.question_text)
            original_question.sample_answer = data.get("sample_answer", original_question.sample_answer)
            
            return original_question
            
        except Exception as e:
            print(f"Error regenerating question: {str(e)}")
            return original_question
