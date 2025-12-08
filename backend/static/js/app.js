// Global variables
let uploadedDocuments = [];
let currentPaper = null;

// API configuration
const API_BASE = window.location.origin;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updatePaperSummary();
    loadDocuments();
});

// Initialize event listeners
function initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // File input
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Generate paper button
    document.getElementById('generatePaperBtn').addEventListener('click', generatePaper);

    // Quick navigation buttons
    document.getElementById('viewDocsBtn').addEventListener('click', () => switchTab('documents'));
    document.getElementById('generateBtn').addEventListener('click', () => switchTab('generate'));

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', downloadPaper);

    // Copy button
    document.getElementById('copyBtn').addEventListener('click', copyPaper);

    // Regenerate button
    document.getElementById('regenerateBtn').addEventListener('click', regeneratePaper);

    // Question type inputs
    ['vsaCount', 'saCount', 'laCount', 'vsaMarks', 'saMarks', 'laMarks'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePaperSummary);
    });

    // Bloom's taxonomy inputs
    ['bloomRemember', 'bloomUnderstand', 'bloomApply', 'bloomAnalyze', 'bloomEvaluate', 'bloomCreate'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateBloomTotal);
    });

    // Difficulty selector
    document.getElementById('difficultySelect').addEventListener('change', updatePaperSummary);

    // Drag and drop
    setupDragAndDrop();
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active', 'border-primary', 'text-primary');
            btn.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700');
        } else {
            btn.classList.remove('active', 'border-primary', 'text-primary');
            btn.classList.add('border-transparent', 'text-gray-500');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(tabName + 'Tab').classList.remove('hidden');
}

// Setup drag and drop
function setupDragAndDrop() {
    const dropZone = document.querySelector('.border-dashed');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('border-primary', 'bg-blue-50');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('border-primary', 'bg-blue-50');
        });
    });

    dropZone.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    handleFiles(files);
}

// File handling
function handleFileUpload(e) {
    const files = e.target.files;
    handleFiles(files);
}

async function handleFiles(files) {
    for (let file of files) {
        if (file.size > 50 * 1024 * 1024) {
            showToast(`File ${file.name} is too large (max 50MB)`, 'error');
            continue;
        }

        await uploadFile(file);
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        showToast(`Uploading ${file.name}...`, 'info');

        const response = await fetch(`${API_BASE}/upload-document`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            uploadedDocuments.push(result);
            updateDocumentsList();
            showToast(`Successfully uploaded ${file.name}`, 'success');
        } else {
            showToast(`Failed to upload ${file.name}: ${result.detail}`, 'error');
        }
    } catch (error) {
        showToast(`Error uploading ${file.name}: ${error.message}`, 'error');
    }
}

// Update documents list
function updateDocumentsList() {
    const documentsList = document.getElementById('documentsList');

    if (uploadedDocuments.length === 0) {
        documentsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                <p>No documents uploaded yet</p>
                <p class="text-sm">Upload documents to enhance question generation</p>
            </div>
        `;
        return;
    }

    documentsList.innerHTML = uploadedDocuments.map(doc => `
        <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
            <div class="flex items-center space-x-3">
                <i class="fas fa-file-alt text-gray-400"></i>
                <div>
                    <p class="font-medium text-gray-900">${doc.filename}</p>
                    <p class="text-sm text-gray-500">${doc.file_type.toUpperCase()} • ${doc.num_chunks} chunks</p>
                </div>
            </div>
            <button onclick="deleteDocument('${doc.document_id}')"
                    class="text-red-600 hover:text-red-700 p-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Delete document
async function deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        const response = await fetch(`${API_BASE}/documents/${documentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            uploadedDocuments = uploadedDocuments.filter(doc => doc.document_id !== documentId);
            updateDocumentsList();
            showToast('Document deleted successfully', 'success');
        } else {
            showToast('Failed to delete document', 'error');
        }
    } catch (error) {
        showToast(`Error deleting document: ${error.message}`, 'error');
    }
}

// Load documents from server
async function loadDocuments() {
    try {
        const response = await fetch(`${API_BASE}/documents`);
        if (response.ok) {
            const documents = await response.json();
            uploadedDocuments = documents;
            updateDocumentsList();
        }
    } catch (error) {
        console.error('Failed to load documents:', error);
    }
}

// Update paper summary
function updatePaperSummary() {
    const vsaCount = parseInt(document.getElementById('vsaCount').value) || 0;
    const saCount = parseInt(document.getElementById('saCount').value) || 0;
    const laCount = parseInt(document.getElementById('laCount').value) || 0;

    const vsaMarks = parseInt(document.getElementById('vsaMarks').value) || 0;
    const saMarks = parseInt(document.getElementById('saMarks').value) || 0;
    const laMarks = parseInt(document.getElementById('laMarks').value) || 0;

    const totalQuestions = vsaCount + saCount + laCount;
    const totalMarks = (vsaCount * vsaMarks) + (saCount * saMarks) + (laCount * laMarks);

    // Estimate time (2-5 min for VSA, 5-10 min for SA, 10-20 min for LA)
    const estimatedMinutes = (vsaCount * 3.5) + (saCount * 7.5) + (laCount * 15);
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = Math.round(estimatedMinutes % 60);

    const timeString = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;

    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('totalMarks').textContent = totalMarks;
    document.getElementById('estimatedTime').textContent = timeString;
    document.getElementById('difficultyDisplay').textContent =
        document.getElementById('difficultySelect').value.charAt(0).toUpperCase() +
        document.getElementById('difficultySelect').value.slice(1);
}

// Update Bloom's taxonomy total
function updateBloomTotal() {
    const values = ['bloomRemember', 'bloomUnderstand', 'bloomApply', 'bloomAnalyze', 'bloomEvaluate', 'bloomCreate'].map(id =>
        parseInt(document.getElementById(id).value) || 0
    );

    const total = values.reduce((sum, val) => sum + val, 0);
    document.getElementById('bloomTotal').textContent = total;

    // Color code based on total
    const totalElement = document.getElementById('bloomTotal');
    if (total === 100) {
        totalElement.className = 'font-semibold ml-1 text-green-600';
    } else if (total > 0) {
        totalElement.className = 'font-semibold ml-1 text-yellow-600';
    } else {
        totalElement.className = 'font-semibold ml-1';
    }
}

// Generate question paper
async function generatePaper() {
    const subject = document.getElementById('subjectInput').value.trim();
    const topic = document.getElementById('topicInput').value.trim();
    const difficulty = document.getElementById('difficultySelect').value;
    const useContext = document.getElementById('useContextToggle').checked;
    const instructions = document.getElementById('instructionsInput').value.trim();

    if (!subject) {
        showToast('Please enter a subject', 'error');
        return;
    }

    // Validate Bloom's taxonomy distribution
    const bloomTotal = parseInt(document.getElementById('bloomTotal').textContent);
    if (bloomTotal !== 100) {
        showToast('Bloom\'s taxonomy distribution must total 100%', 'error');
        return;
    }

    // Collect question types
    const questionTypes = [];
    const vsaCount = parseInt(document.getElementById('vsaCount').value) || 0;
    const saCount = parseInt(document.getElementById('saCount').value) || 0;
    const laCount = parseInt(document.getElementById('laCount').value) || 0;

    if (vsaCount > 0) questionTypes.push('very_short_answer');
    if (saCount > 0) questionTypes.push('short_answer');
    if (laCount > 0) questionTypes.push('long_answer');

    if (questionTypes.length === 0) {
        showToast('Please specify at least one question type', 'error');
        return;
    }

    // Collect Bloom's taxonomy distribution
    const bloomDistribution = {
        remember: parseInt(document.getElementById('bloomRemember').value) || 0,
        understand: parseInt(document.getElementById('bloomUnderstand').value) || 0,
        apply: parseInt(document.getElementById('bloomApply').value) || 0,
        analyze: parseInt(document.getElementById('bloomAnalyze').value) || 0,
        evaluate: parseInt(document.getElementById('bloomEvaluate').value) || 0,
        create: parseInt(document.getElementById('bloomCreate').value) || 0
    };

    const requestData = {
        topic: topic || subject,
        difficulty: difficulty,
        num_questions: vsaCount + saCount + laCount,
        question_types: questionTypes,
        use_context: useContext,
        bloom_distribution: bloomDistribution,
        question_format: {
            very_short_answer: {
                count: vsaCount,
                marks: parseInt(document.getElementById('vsaMarks').value) || 2
            },
            short_answer: {
                count: saCount,
                marks: parseInt(document.getElementById('saMarks').value) || 5
            },
            long_answer: {
                count: laCount,
                marks: parseInt(document.getElementById('laMarks').value) || 10
            }
        },
        instructions: instructions
    };

    // Show loading
    document.getElementById('loadingOverlay').classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE}/generate-questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (response.ok) {
            currentPaper = result;

            // Check if we got actual questions
            if (!result.questions || result.questions.length === 0) {
                showToast('No questions were generated. Please try different settings or upload context documents.', 'warning');
                return;
            }

            displayGeneratedPaper(result);
            showToast(`Successfully generated ${result.questions.length} questions!`, 'success');
            switchTab('generate');
            document.getElementById('generatedPaper').classList.remove('hidden');
            document.getElementById('generatedPaper').scrollIntoView({ behavior: 'smooth' });
        } else {
            showToast(`Failed to generate paper: ${result.detail}`, 'error');
        }
    } catch (error) {
        showToast(`Error generating paper: ${error.message}`, 'error');
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

// Display generated paper
function displayGeneratedPaper(paper) {
    const paperContent = document.getElementById('paperContent');

    // Debug logging
    console.log('Paper received:', paper);
    console.log('Questions:', paper.questions);

    // Format questions by type
    const questionsByType = {
        very_short_answer: [],
        short_answer: [],
        long_answer: []
    };

    paper.questions.forEach((question, index) => {
        const type = mapQuestionType(question.question_type || question.type || 'short_answer');

        // Ensure question_text exists, fallback to other fields if needed
        const questionText = question.question_text || question.question ||
                           `Question ${index + 1}: [Text not available]`;

        questionsByType[type].push({
            ...question,
            index: index + 1,
            question_text: questionText
        });
        console.log(`Question ${index + 1} assigned to type: ${type}, text:`, questionText);
    });

    console.log('Questions by type:', questionsByType);

    let html = `
        <div class="max-w-4xl mx-auto">
            <header class="text-center mb-8">
                <h1 class="text-2xl font-bold text-gray-900 mb-2">${paper.title || 'Question Paper'}</h1>
                <div class="text-sm text-gray-600 space-y-1">
                    <p><strong>Subject:</strong> ${paper.subject || 'General'}</p>
                    <p><strong>Total Marks:</strong> ${paper.total_marks || 'N/A'}</p>
                    <p><strong>Time Allowed:</strong> ${document.getElementById('estimatedTime').textContent}</p>
                    <p><strong>Difficulty Level:</strong> ${paper.difficulty || 'Medium'}</p>
                </div>
            </header>

            ${paper.instructions ? `
            <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 class="font-semibold mb-2">Instructions:</h3>
                <p class="text-sm">${paper.instructions}</p>
            </div>
            ` : ''}

            <div class="space-y-6">
    `;

    // Very Short Answers
    if (questionsByType.very_short_answer.length > 0) {
        const marks = parseInt(document.getElementById('vsaMarks').value) || 2;
        html += `
            <section>
                <h3 class="text-lg font-semibold mb-3 text-gray-900">
                    <i class="fas fa-circle text-xs text-success mr-2"></i>
                    Very Short Answer Questions (${marks} marks each)
                </h3>
                <div class="space-y-3">
                    ${questionsByType.very_short_answer.map(q => `
                        <div class="flex">
                            <span class="font-medium mr-2">Q${q.index}.</span>
                            <span class="flex-1">${q.question_text}</span>
                            <span class="text-gray-500">[${marks}]</span>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    // Short Answers
    if (questionsByType.short_answer.length > 0) {
        const marks = parseInt(document.getElementById('saMarks').value) || 5;
        html += `
            <section>
                <h3 class="text-lg font-semibold mb-3 text-gray-900">
                    <i class="fas fa-circle text-xs text-warning mr-2"></i>
                    Short Answer Questions (${marks} marks each)
                </h3>
                <div class="space-y-3">
                    ${questionsByType.short_answer.map(q => `
                        <div class="flex">
                            <span class="font-medium mr-2">Q${q.index}.</span>
                            <span class="flex-1">${q.question_text}</span>
                            <span class="text-gray-500">[${marks}]</span>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    // Long Answers
    if (questionsByType.long_answer.length > 0) {
        const marks = parseInt(document.getElementById('laMarks').value) || 10;
        html += `
            <section>
                <h3 class="text-lg font-semibold mb-3 text-gray-900">
                    <i class="fas fa-circle text-xs text-error mr-2"></i>
                    Long Answer Questions (${marks} marks each)
                </h3>
                <div class="space-y-4">
                    ${questionsByType.long_answer.map(q => `
                        <div class="flex">
                            <span class="font-medium mr-2">Q${q.index}.</span>
                            <span class="flex-1">${q.question_text}</span>
                            <span class="text-gray-500">[${marks}]</span>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    html += `
            </div>

            <footer class="mt-8 pt-6 border-t text-center text-sm text-gray-500">
                <p>Generated on ${new Date().toLocaleDateString()} using AI-powered Paperly</p>
            </footer>
        </div>
    `;

    paperContent.innerHTML = html;
}

// Map question types from backend to frontend format
function mapQuestionType(type) {
    const typeMap = {
        'very_short_answer': 'very_short_answer',
        'short_answer': 'short_answer',
        'long_answer': 'long_answer',
        'mcq': 'very_short_answer',      // Default MCQs to VSA
        'numerical': 'short_answer',     // Default numerical to SA
        'true_false': 'very_short_answer', // Default T/F to VSA
        'essay': 'long_answer',          // Default essay to long answer
        'default': 'short_answer'
    };

    return typeMap[type] || typeMap['default'];
}

// Download paper as text file
function downloadPaper() {
    if (!currentPaper) return;

    // Create a proper formatted text version of the paper
    let textContent = '';

    // Header
    textContent += `${currentPaper.title || 'Question Paper'}\n`;
    textContent += '=' .repeat(50) + '\n\n';

    if (currentPaper.subject) {
        textContent += `Subject: ${currentPaper.subject}\n`;
    }
    if (currentPaper.total_marks) {
        textContent += `Total Marks: ${currentPaper.total_marks}\n`;
    }
    if (currentPaper.difficulty) {
        textContent += `Difficulty Level: ${currentPaper.difficulty}\n`;
    }
    textContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    if (currentPaper.instructions) {
        textContent += `Instructions:\n${currentPaper.instructions}\n\n`;
    }

    // Questions grouped by type
    const questionsByType = {
        very_short_answer: [],
        short_answer: [],
        long_answer: []
    };

    currentPaper.questions.forEach((question, index) => {
        const type = mapQuestionType(question.question_type || question.type || 'short_answer');
        questionsByType[type].push({
            ...question,
            index: index + 1
        });
    });

    // Very Short Answers
    if (questionsByType.very_short_answer.length > 0) {
        const marks = parseInt(document.getElementById('vsaMarks').value) || 2;
        textContent += `Very Short Answer Questions (${marks} marks each)\n`;
        textContent += '-'.repeat(50) + '\n';
        questionsByType.very_short_answer.forEach(q => {
            textContent += `Q${q.index}. ${q.question_text || q.question || '[No question text]'} [${marks}]\n`;
        });
        textContent += '\n';
    }

    // Short Answers
    if (questionsByType.short_answer.length > 0) {
        const marks = parseInt(document.getElementById('saMarks').value) || 5;
        textContent += `Short Answer Questions (${marks} marks each)\n`;
        textContent += '-'.repeat(50) + '\n';
        questionsByType.short_answer.forEach(q => {
            textContent += `Q${q.index}. ${q.question_text || q.question || '[No question text]'} [${marks}]\n`;
        });
        textContent += '\n';
    }

    // Long Answers
    if (questionsByType.long_answer.length > 0) {
        const marks = parseInt(document.getElementById('laMarks').value) || 10;
        textContent += `Long Answer Questions (${marks} marks each)\n`;
        textContent += '-'.repeat(50) + '\n';
        questionsByType.long_answer.forEach(q => {
            textContent += `Q${q.index}. ${q.question_text || q.question || '[No question text]'} [${marks}]\n`;
        });
        textContent += '\n';
    }

    textContent += '\nGenerated using AI-powered Paperly';

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPaper.subject || 'Question_Paper'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Paper downloaded successfully', 'success');
}

// Copy paper to clipboard
function copyPaper() {
    if (!currentPaper) return;

    const content = document.getElementById('paperContent').textContent;

    navigator.clipboard.writeText(content).then(() => {
        showToast('Paper copied to clipboard', 'success');
    }).catch(err => {
        showToast('Failed to copy paper', 'error');
    });
}

// Regenerate paper
function regeneratePaper() {
    if (confirm('Are you sure you want to regenerate the paper with the same settings?')) {
        generatePaper();
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    toastMessage.textContent = message;

    // Set icon based on type
    const icons = {
        success: '<i class="fas fa-check-circle text-green-500 text-xl"></i>',
        error: '<i class="fas fa-exclamation-circle text-red-500 text-xl"></i>',
        warning: '<i class="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>',
        info: '<i class="fas fa-info-circle text-blue-500 text-xl"></i>'
    };

    toastIcon.innerHTML = icons[type] || icons.info;

    // Show toast
    toast.classList.remove('hidden');

    // Auto hide after 5 seconds
    setTimeout(() => {
        hideToast();
    }, 5000);
}

function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}