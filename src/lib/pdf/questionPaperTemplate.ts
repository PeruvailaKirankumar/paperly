import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GeneratedPaper, Question } from '@/lib/firebase/firestore';

interface PDFGenerationOptions {
  includeAnswerKey?: boolean;
  watermark?: string;
}

export class QuestionPaperPDF {
  private doc: jsPDF;
  private currentY: number = 0;
  private pageWidth: number;
  private pageHeight: number;
  private margins = { top: 20, bottom: 20, left: 20, right: 20 };

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.currentY = this.margins.top;
  }

  private addNewPageIfNeeded(requiredSpace: number = 30) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margins.bottom) {
      this.doc.addPage();
      this.currentY = this.margins.top;
    }
  }

  private drawBox(x: number, y: number, width: number, height: number) {
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.5);
    this.doc.rect(x, y, width, height);
  }

  private centerText(text: string, y: number, fontSize: number, fontStyle: string = 'normal') {
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', fontStyle);
    const textWidth = this.doc.getTextWidth(text);
    const x = (this.pageWidth - textWidth) / 2;
    this.doc.text(text, x, y);
  }

  private addHeader(paper: GeneratedPaper) {
    // University Logo/Name Header
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(1);
    this.doc.line(this.margins.left, this.currentY, this.pageWidth - this.margins.right, this.currentY);
    this.currentY += 5;

    // University Name
    this.centerText('KALASALINGAM ACADEMY OF RESEARCH AND EDUCATION', this.currentY, 16, 'bold');
    this.currentY += 7;
    this.centerText('(Deemed to be University under Section 3 of the UGC Act, 1956)', this.currentY, 10, 'normal');
    this.currentY += 6;
    this.centerText('Krishnankoil - 626 126, Tamil Nadu, India', this.currentY, 10, 'normal');
    this.currentY += 5;

    this.doc.line(this.margins.left, this.currentY, this.pageWidth - this.margins.right, this.currentY);
    this.currentY += 8;

    // Exam Title
    this.centerText(paper.examTitle.toUpperCase(), this.currentY, 14, 'bold');
    this.currentY += 10;

    // Exam Details Box
    const boxWidth = this.pageWidth - 2 * this.margins.left;
    const boxHeight = 45;
    this.drawBox(this.margins.left, this.currentY, boxWidth, boxHeight);

    // Details in two columns
    this.doc.setFontSize(10);
    const leftColX = this.margins.left + 5;
    const rightColX = this.pageWidth / 2 + 5;
    let detailY = this.currentY + 8;

    // Left Column
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Course Code:', leftColX, detailY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(paper.courseCode, leftColX + 30, detailY);
    detailY += 7;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Course Title:', leftColX, detailY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(paper.subjectName, leftColX + 30, detailY);
    detailY += 7;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Semester:', leftColX, detailY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(paper.semester, leftColX + 30, detailY);
    detailY += 7;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Department:', leftColX, detailY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(paper.department, leftColX + 30, detailY);

    // Right Column
    detailY = this.currentY + 8;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Date:', rightColX, detailY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(new Date(paper.examDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }), rightColX + 25, detailY);
    detailY += 7;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Duration:', rightColX, detailY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(paper.duration, rightColX + 25, detailY);
    detailY += 7;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Max. Marks:', rightColX, detailY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(paper.totalMarks.toString(), rightColX + 25, detailY);
    detailY += 7;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Academic Year:', rightColX, detailY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(paper.academicYear, rightColX + 25, detailY);

    this.currentY += boxHeight + 10;
  }

  private addInstructions(instructions: string[]) {
    this.addNewPageIfNeeded(40);

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INSTRUCTIONS TO CANDIDATES:', this.margins.left, this.currentY);
    this.currentY += 7;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    instructions.forEach((instruction, index) => {
      const lines = this.doc.splitTextToSize(
        `${index + 1}. ${instruction}`,
        this.pageWidth - 2 * this.margins.left - 5
      );
      
      lines.forEach((line: string) => {
        this.addNewPageIfNeeded(10);
        this.doc.text(line, this.margins.left + 3, this.currentY);
        this.currentY += 5;
      });
    });

    this.currentY += 5;
  }

  private addQuestions(questions: Question[]) {
    this.addNewPageIfNeeded(30);

    // Group questions by type/section
    const groupedQuestions = this.groupQuestionsByType(questions);

    let sectionNumber = 1;
    let questionNumber = 1;

    for (const [sectionName, sectionQuestions] of Object.entries(groupedQuestions)) {
      this.addNewPageIfNeeded(20);

      // Section Header
      this.doc.setFillColor(240, 240, 240);
      this.doc.rect(this.margins.left, this.currentY, this.pageWidth - 2 * this.margins.left, 10, 'F');
      
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(
        `PART ${this.numberToLetter(sectionNumber)} - ${sectionName}`,
        this.margins.left + 3,
        this.currentY + 7
      );

      // Calculate section marks
      const sectionMarks = sectionQuestions.reduce((sum, q) => sum + q.marks, 0);
      this.doc.text(
        `[${sectionMarks} Marks]`,
        this.pageWidth - this.margins.right - 25,
        this.currentY + 7
      );

      this.currentY += 15;

      // Add questions
      sectionQuestions.forEach((question) => {
        this.addNewPageIfNeeded(25);

        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(
          `Q${questionNumber}.`,
          this.margins.left + 3,
          this.currentY
        );

        // Question text with proper wrapping
        const questionLines = this.doc.splitTextToSize(
          question.text,
          this.pageWidth - 2 * this.margins.left - 20
        );

        this.doc.setFont('helvetica', 'normal');
        questionLines.forEach((line: string, idx: number) => {
          if (idx > 0) this.addNewPageIfNeeded(7);
          this.doc.text(line, this.margins.left + 15, this.currentY + (idx * 5));
        });

        // Marks indicator
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(
          `[${question.marks}]`,
          this.pageWidth - this.margins.right - 15,
          this.currentY
        );

        this.currentY += questionLines.length * 5;

        // Add options for MCQ
        if (question.type === 'mcq' && question.options) {
          this.currentY += 3;
          this.doc.setFont('helvetica', 'normal');
          this.doc.setFontSize(10);

          question.options.forEach((option, optIndex) => {
            this.addNewPageIfNeeded(8);
            const optionLabel = ['(a)', '(b)', '(c)', '(d)'][optIndex];
            const optionLines = this.doc.splitTextToSize(
              `${optionLabel} ${option}`,
              this.pageWidth - 2 * this.margins.left - 25
            );
            
            optionLines.forEach((line: string, lineIdx: number) => {
              this.doc.text(line, this.margins.left + 20, this.currentY + (lineIdx * 5));
            });
            this.currentY += optionLines.length * 5 + 2;
          });
        }

        // Add space for answer if it's a descriptive question
        if (question.type === 'short_answer' || question.type === 'long_answer') {
          const answerSpace = question.type === 'long_answer' ? 40 : 20;
          this.addNewPageIfNeeded(answerSpace);
          
          // Draw answer lines
          const lineCount = question.type === 'long_answer' ? 8 : 4;
          for (let i = 0; i < lineCount; i++) {
            this.currentY += 5;
            this.addNewPageIfNeeded(5);
            this.doc.setDrawColor(200, 200, 200);
            this.doc.setLineWidth(0.1);
            this.doc.line(
              this.margins.left + 15,
              this.currentY,
              this.pageWidth - this.margins.right - 10,
              this.currentY
            );
          }
        }

        this.currentY += 8;
        questionNumber++;
      });

      sectionNumber++;
      this.currentY += 5;
    }
  }

  private groupQuestionsByType(questions: Question[]): Record<string, Question[]> {
    const grouped: Record<string, Question[]> = {};

    questions.forEach((question) => {
      let sectionName = '';
      
      switch (question.type) {
        case 'mcq':
          sectionName = 'Multiple Choice Questions';
          break;
        case 'short_answer':
          sectionName = 'Short Answer Questions';
          break;
        case 'long_answer':
          sectionName = 'Long Answer Questions';
          break;
        case 'true_false':
          sectionName = 'True/False Questions';
          break;
        default:
          sectionName = 'General Questions';
      }

      if (!grouped[sectionName]) {
        grouped[sectionName] = [];
      }
      grouped[sectionName].push(question);
    });

    return grouped;
  }

  private numberToLetter(num: number): string {
    return String.fromCharCode(64 + num); // A, B, C, etc.
  }

  private addFooter() {
    const footerY = this.pageHeight - 10;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setTextColor(128, 128, 128);
    
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        footerY,
        { align: 'center' }
      );
      this.doc.text(
        '*** End of Question Paper ***',
        this.pageWidth / 2,
        footerY + 4,
        { align: 'center' }
      );
    }
  }

  public generate(paper: GeneratedPaper, options: PDFGenerationOptions = {}): jsPDF {
    // Add header with university details
    this.addHeader(paper);

    // Add instructions
    const defaultInstructions = [
      'Answer ALL questions.',
      'Each question carries marks as indicated.',
      'Use of calculators is permitted.',
      'Write legibly and neatly.',
      'Start each answer on a new page.',
      'Rough work should be done on the last page of the answer booklet.'
    ];
    this.addInstructions(paper.instructions.length > 0 ? paper.instructions : defaultInstructions);

    // Add questions
    this.addQuestions(paper.questions);

    // Add footer
    this.addFooter();

    return this.doc;
  }

  public async generateBlob(paper: GeneratedPaper, options: PDFGenerationOptions = {}): Promise<Blob> {
    this.generate(paper, options);
    return this.doc.output('blob');
  }

  public download(paper: GeneratedPaper, options: PDFGenerationOptions = {}) {
    this.generate(paper, options);
    const filename = `${paper.courseCode}_${paper.examType}_${new Date(paper.examDate).toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;
    this.doc.save(filename);
  }
}

// Helper function to generate PDF
export async function generateQuestionPaperPDF(
  paper: GeneratedPaper,
  options: PDFGenerationOptions = {}
): Promise<Blob> {
  const pdfGenerator = new QuestionPaperPDF();
  return await pdfGenerator.generateBlob(paper, options);
}

// Helper to download PDF directly
export function downloadQuestionPaperPDF(
  paper: GeneratedPaper,
  options: PDFGenerationOptions = {}
): void {
  const pdfGenerator = new QuestionPaperPDF();
  pdfGenerator.download(paper, options);
}
