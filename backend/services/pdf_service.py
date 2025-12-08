import os
import secrets
import string
from typing import Tuple, List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch
from pypdf import PdfReader, PdfWriter
from config import settings
from models import QuestionPaper, Question

class PDFService:
    def __init__(self):
        self.output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_papers")
        os.makedirs(self.output_dir, exist_ok=True)

    def _generate_password(self, length: int = 12) -> str:
        """Generate a secure random password."""
        alphabet = string.ascii_letters + string.digits + string.punctuation
        return ''.join(secrets.choice(alphabet) for i in range(length))

    def _create_layout(self, paper: QuestionPaper, filepath: str):
        """Create the PDF layout."""
        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )

        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1  # Center
        )
        story.append(Paragraph(paper.title, title_style))
        story.append(Spacer(1, 12))

        # Metadata Table
        meta_data = [
            [f"Subject: {paper.subject or 'N/A'}", f"Difficulty: {paper.difficulty.value.title()}"],
            [f"Total Marks: {paper.total_marks}", f"Date: {paper.generated_at.split('T')[0] if paper.generated_at else 'N/A'}"]
        ]
        meta_table = Table(meta_data, colWidths=[3*inch, 3*inch])
        meta_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 24))

        # Instructions
        if paper.instructions:
            story.append(Paragraph("Instructions:", styles['Heading3']))
            story.append(Paragraph(paper.instructions, styles['Normal']))
            story.append(Spacer(1, 20))

        # Questions
        story.append(Paragraph("Questions", styles['Heading2']))
        story.append(Spacer(1, 12))

        for q in paper.questions:
            # Question Text
            q_text = f"Q{q.question_number}. {q.question_text}   ({q.marks} Marks)"
            story.append(Paragraph(q_text, styles['Normal']))
            story.append(Spacer(1, 6))

            # Sample Answer (Optional - maybe redundant for student copy but useful for coordinator)
            # if q.sample_answer:
            #     ans_text = f"Answer Key: {q.sample_answer}"
            #     story.append(Paragraph(ans_text, styles['Italic']))
            
            story.append(Spacer(1, 12))

        doc.build(story)

    def _encrypt_pdf(self, input_path: str, password: str) -> str:
        """Encrypt the PDF file."""
        reader = PdfReader(input_path)
        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        writer.encrypt(password)

        # Overwrite the original file
        with open(input_path, "wb") as f:
            writer.write(f)
        
        return input_path

    def generate_paper_pdf(self, paper: QuestionPaper) -> Tuple[str, str]:
        """
        Generate a password protected PDF for the question paper.
        Returns (filepath, password)
        """
        filename = f"paper_{secrets.token_hex(8)}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        # 1. Create PDF
        self._create_layout(paper, filepath)
        
        # 2. Generate Password
        password = self._generate_password()
        
        # 3. Encrypt PDF
        self._encrypt_pdf(filepath, password)
        
        return filepath, password

    def generate_pdf_bytes(self, paper_data: dict, password: str) -> bytes:
        """
        Generate an encrypted PDF and return as bytes.
        Used for API response (no file saved permanently).
        """
        import tempfile
        import io
        
        # Create temp file for PDF generation
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            # Build a minimal QuestionPaper-like structure for layout
            from models import Question, DifficultyLevel
            
            questions = []
            for q in paper_data.get('questions', []):
                questions.append(Question(
                    question_number=q.get('question_number', 1),
                    question_text=q.get('question_text', ''),
                    question_type=q.get('question_type', 'short_answer'),
                    difficulty=DifficultyLevel(q.get('difficulty', 'medium')),
                    marks=q.get('marks', 5),
                    sample_answer=q.get('sample_answer'),
                    context_source=q.get('context_source')
                ))
            
            paper = QuestionPaper(
                title=paper_data.get('title', 'Question Paper'),
                subject=paper_data.get('subject'),
                difficulty=DifficultyLevel(paper_data.get('difficulty', 'medium')),
                total_marks=paper_data.get('total_marks', 100),
                questions=questions,
                instructions=paper_data.get('instructions', 'Answer all questions carefully.'),
                generated_at=paper_data.get('generated_at')
            )
            
            # Create PDF
            self._create_layout(paper, tmp_path)
            
            # Encrypt
            self._encrypt_pdf(tmp_path, password)
            
            # Read bytes
            with open(tmp_path, 'rb') as f:
                pdf_bytes = f.read()
            
            return pdf_bytes
        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
