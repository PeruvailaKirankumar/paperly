import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';

interface Question {
    question_number: number;
    question_text: string;
    question_type: string;
    difficulty: string;
    marks: number;
    sample_answer?: string;
}

interface PaperData {
    id: string;
    title: string;
    subject?: string;
    difficulty: string;
    total_marks: number;
    questions: Question[];
    instructions?: string;
    generated_at?: string;
}

export async function generatePaperPDF(paper: PaperData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points
    const margin = 50;
    const lineHeight = 18;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const addNewPageIfNeeded = () => {
        if (y < margin + lineHeight) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
        }
    };

    const drawText = (text: string, options: { bold?: boolean; size?: number; gray?: boolean } = {}) => {
        const { bold = false, size = 12, gray = false } = options;
        const textFont = bold ? boldFont : font;
        const color = gray ? rgb(0.5, 0.5, 0.5) : rgb(0, 0, 0);

        // Simple word wrap
        const maxWidth = pageWidth - 2 * margin;
        const words = text.split(' ');
        let line = '';

        for (const word of words) {
            const testLine = line + (line ? ' ' : '') + word;
            const width = textFont.widthOfTextAtSize(testLine, size);

            if (width > maxWidth && line) {
                addNewPageIfNeeded();
                page.drawText(line, { x: margin, y, size, font: textFont, color });
                y -= lineHeight;
                line = word;
            } else {
                line = testLine;
            }
        }

        if (line) {
            addNewPageIfNeeded();
            page.drawText(line, { x: margin, y, size, font: textFont, color });
            y -= lineHeight;
        }
    };

    // Title
    drawText(paper.title, { bold: true, size: 20 });
    y -= 10;

    // Metadata
    drawText(`Subject: ${paper.subject || 'N/A'}  |  Difficulty: ${paper.difficulty}  |  Total Marks: ${paper.total_marks}`, { size: 11 });
    if (paper.generated_at) {
        drawText(`Generated: ${paper.generated_at.split('T')[0]}`, { size: 10, gray: true });
    }
    y -= 15;

    // Instructions
    if (paper.instructions) {
        drawText('Instructions:', { bold: true, size: 12 });
        drawText(paper.instructions, { size: 10 });
        y -= 10;
    }

    // Separator
    page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });
    y -= 20;

    // Questions
    drawText('Questions', { bold: true, size: 14 });
    y -= 10;

    for (const q of paper.questions) {
        if (y < margin + 60) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
        }

        const questionHeader = `Q${q.question_number}. (${q.marks} marks)`;
        drawText(questionHeader, { bold: true, size: 11 });
        drawText(q.question_text, { size: 11 });
        y -= 10;
    }

    // Note: pdf-lib doesn't support encryption natively
    // Password protection would require a different library or backend processing
    // For now, we generate unencrypted PDF and show password as a "viewing password" concept

    return await pdfDoc.save();
}

export function generateRandomPassword(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        password += chars[array[i] % chars.length];
    }
    return password;
}

export function openPdfInNewTab(pdfBytes: Uint8Array): void {
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

export function downloadPdf(pdfBytes: Uint8Array, filename: string): void {
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
