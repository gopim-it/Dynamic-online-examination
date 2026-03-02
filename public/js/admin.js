// admin.js

let currentAdminExamId = null;

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') {
            window.location.href = '/student.html'; // security redirect
            return;
        }
        document.getElementById('userName').textContent = user.name;
    }
    loadAdminExams();
    showSection('examsSection');
});

function hideAllSections() {
    ['examsSection', 'createExamSection', 'addQuestionsSection', 'examResultsSection'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
}

function showSection(sectionId) {
    hideAllSections();
    document.getElementById(sectionId).classList.remove('hidden');
    if (sectionId === 'examsSection') loadAdminExams();
}

async function loadAdminExams() {
    try {
        const response = await authFetch('/exams');
        const exams = await response.json();

        const tableBody = document.getElementById('adminExamsTable');
        tableBody.innerHTML = '';

        if (exams.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No exams created yet.</td></tr>';
            return;
        }

        exams.forEach(exam => {
            const date = new Date(exam.created_at).toLocaleDateString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${exam.id}</td>
                <td><strong>${exam.title}</strong></td>
                <td>${exam.duration}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem; margin-right: 5px;" onclick="viewExamResults(${exam.id}, '${exam.title}')">Results</button>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;" onclick="deleteExam(${exam.id})">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to load admin exams', error);
    }
}

document.getElementById('createExamForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('examTitle').value;
    const description = document.getElementById('examDesc').value;
    const duration = document.getElementById('examDuration').value;

    try {
        const response = await authFetch('/exams', {
            method: 'POST',
            body: JSON.stringify({ title, description, duration })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('Exam created! Now add questions.');
            currentAdminExamId = data.examId;
            document.getElementById('currentExamTitleDisplay').textContent = `Add Questions to: ${title}`;
            showSection('addQuestionsSection');
            document.getElementById('createExamForm').reset();
            loadPreviewQuestions();
        } else {
            showNotification(data.message || 'Failed to create exam', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server error', 'error');
    }
});

document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'addQuestionForm') {
        e.preventDefault();
        if (!currentAdminExamId) return;

        const qData = {
            question_text: document.getElementById('qText').value,
            option_a: document.getElementById('optA').value,
            option_b: document.getElementById('optB').value,
            option_c: document.getElementById('optC').value,
            option_d: document.getElementById('optD').value,
            correct_option: document.getElementById('correctOpt').value,
            marks: document.getElementById('qMarks').value
        };

        try {
            const response = await authFetch(`/exams/${currentAdminExamId}/questions`, {
                method: 'POST',
                body: JSON.stringify(qData)
            });

            if (response.ok) {
                showNotification('Question added successfully!');
                document.getElementById('addQuestionForm').reset();
                document.getElementById('qMarks').value = "1";
                loadPreviewQuestions();
            } else {
                const data = await response.json();
                showNotification(data.message || 'Failed to add question', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Server error', 'error');
        }
    }
});

async function loadPreviewQuestions() {
    if (!currentAdminExamId) return;
    try {
        const response = await authFetch(`/exams/${currentAdminExamId}`);
        const exam = await response.json();

        const previewList = document.getElementById('questionsPreviewList');
        previewList.innerHTML = '';

        if (!exam.questions || exam.questions.length === 0) {
            previewList.innerHTML = '<p>No questions added yet.</p>';
            return;
        }

        exam.questions.forEach((q, index) => {
            const qDiv = document.createElement('div');
            qDiv.className = 'card fade-in';
            qDiv.style.marginBottom = '10px';
            qDiv.style.padding = '15px';
            qDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>Q${index + 1}: ${q.question_text}</strong>
                    <span style="color:var(--success-color)">Answer: ${q.correct_option} (${q.marks} marks)</span>
                </div>
            `;
            previewList.appendChild(qDiv);
        });
    } catch (error) {
        console.error('Failed to load preview', error);
    }
}

async function viewExamResults(examId, title) {
    document.getElementById('resultExamTitle').textContent = `Results: ${title}`;
    showSection('examResultsSection');

    try {
        const response = await authFetch(`/results/exam/${examId}`);
        const results = await response.json();

        const tableBody = document.getElementById('adminResultsTable');
        tableBody.innerHTML = '';

        if (results.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No submissions for this exam yet.</td></tr>';
            return;
        }

        results.forEach(res => {
            const date = new Date(res.completed_at).toLocaleString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${res.student_name}</td>
                <td>${res.student_email}</td>
                <td><strong>${res.score}/${res.total_marks}</strong></td>
                <td><span class="badge" style="margin:0">${((res.score / res.total_marks) * 100).toFixed(1)}%</span></td>
                <td>${date}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to load exam results', error);
        document.getElementById('adminResultsTable').innerHTML = '<tr><td colspan="5" style="color:red">Error loading results</td></tr>';
    }
}

async function deleteExam(examId) {
    if (confirm('Are you sure you want to delete this exam? All associated questions and results will be permanently removed.')) {
        try {
            const response = await authFetch(`/exams/${examId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showNotification('Exam deleted!');
                loadAdminExams();
            } else {
                showNotification('Failed to delete exam', 'error');
            }
        } catch (error) {
            console.error('Delete failed', error);
            showNotification('Server error', 'error');
        }
    }
}
