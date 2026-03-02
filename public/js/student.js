// student.js

let currentExamId = null;
let currentDuration = 0;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('userName').textContent = user.name;
    }
    loadExams();
    loadResults();
});

async function loadExams() {
    try {
        const response = await authFetch('/exams');
        const exams = await response.json();

        const examsList = document.getElementById('examsList');
        examsList.innerHTML = '';

        if (exams.length === 0) {
            examsList.innerHTML = '<p>No exams available at the moment.</p>';
            return;
        }

        exams.forEach(exam => {
            const card = document.createElement('div');
            card.className = 'card fade-in';
            card.innerHTML = `
                <div class="badge">${exam.duration} Minutes</div>
                <h3>${exam.title}</h3>
                <p>${exam.description || 'No description provided.'}</p>
                <button class="btn" style="padding: 8px;" onclick="startExam(${exam.id})">Take Exam</button>
            `;
            examsList.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to load exams', error);
        document.getElementById('examsList').innerHTML = '<p style="color:red">Failed to load exams.</p>';
    }
}

async function loadResults() {
    try {
        const response = await authFetch('/results/my-results');
        const results = await response.json();

        const tableBody = document.getElementById('resultsTableBody');
        tableBody.innerHTML = '';

        if (results.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No results found.</td></tr>';
            return;
        }

        results.forEach(res => {
            const date = new Date(res.completed_at).toLocaleDateString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${res.exam_title}</td>
                <td><strong>${res.score} / ${res.total_marks}</strong> (${((res.score / res.total_marks) * 100).toFixed(1)}%)</td>
                <td>${date}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to load results', error);
    }
}

async function startExam(examId) {
    try {
        const response = await authFetch(`/exams/${examId}`);
        const exam = await response.json();

        if (!exam.questions || exam.questions.length === 0) {
            showNotification('This exam has no questions yet.', 'error');
            return;
        }

        currentExamId = exam.id;
        currentDuration = exam.duration * 60; // in seconds

        document.getElementById('examTitle').textContent = exam.title;
        document.getElementById('examDescription').textContent = exam.description;

        renderQuestions(exam.questions);

        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('examView').classList.remove('hidden');

        startTimer();
    } catch (error) {
        console.error('Failed to start exam', error);
        showNotification('Could not load exam data', 'error');
    }
}

function renderQuestions(questions) {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    questions.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'question-container fade-in';
        qDiv.style.animationDelay = `${index * 0.1}s`;

        qDiv.innerHTML = `
            <div class="question-text">${index + 1}. ${q.question_text} <span style="font-size: 0.8rem; color:#94a3b8; margin-left:10px;">(${q.marks} marks)</span></div>
            <div class="options-list">
                <label class="option-label" onclick="selectOption(this, 'q_${q.id}')">
                    <input type="radio" name="q_${q.id}" value="A" required> A. ${q.option_a}
                </label>
                <label class="option-label" onclick="selectOption(this, 'q_${q.id}')">
                    <input type="radio" name="q_${q.id}" value="B"> B. ${q.option_b}
                </label>
                <label class="option-label" onclick="selectOption(this, 'q_${q.id}')">
                    <input type="radio" name="q_${q.id}" value="C"> C. ${q.option_c}
                </label>
                <label class="option-label" onclick="selectOption(this, 'q_${q.id}')">
                    <input type="radio" name="q_${q.id}" value="D"> D. ${q.option_d}
                </label>
            </div>
        `;
        container.appendChild(qDiv);
    });
}

function selectOption(labelElement, groupName) {
    // Remove selected class from all labels in this group
    const allLabels = labelElement.parentElement.querySelectorAll('.option-label');
    allLabels.forEach(l => l.classList.remove('selected'));

    // Add selected class to chosen label and check radio
    labelElement.classList.add('selected');
    labelElement.querySelector('input').checked = true;
}

function startTimer() {
    const display = document.getElementById('examTimer');
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const minutes = Math.floor(currentDuration / 60);
        let seconds = currentDuration % 60;

        seconds = seconds < 10 ? '0' + seconds : seconds;
        display.textContent = `${minutes}:${seconds}`;

        if (--currentDuration < 0) {
            clearInterval(timerInterval);
            display.textContent = '00:00';
            showNotification('Time is up! Submitting exam automatically.', 'error');
            submitExam(new Event('submit')); // Auto submit
        }
    }, 1000);
}

document.getElementById('examForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitExam();
});

async function submitExam() {
    clearInterval(timerInterval);
    const form = document.getElementById('examForm');
    const formData = new FormData(form);
    const answers = {};

    for (let [key, value] of formData.entries()) {
        const questionId = key.replace('q_', '');
        answers[questionId] = value;
    }

    try {
        const response = await authFetch(`/results/${currentExamId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ answers })
        });
        const result = await response.json();

        if (response.ok) {
            showNotification('Exam submitted successfully!');
            document.getElementById('examView').classList.add('hidden');
            document.getElementById('resultView').classList.remove('hidden');

            document.getElementById('finalScoreDisplay').textContent = `${result.score}/${result.totalMarks}`;
            document.getElementById('finalPercentage').textContent = result.percentage;

            loadResults(); // Refresh dashboard data
        } else {
            showNotification(result.message || 'Error submitting exam', 'error');
            startTimer(); // Resume timer if fails
        }
    } catch (error) {
        console.error('Submission failed', error);
        showNotification('Failed to submit exam', 'error');
    }
}

function cancelExam() {
    if (confirm('Are you sure you want to cancel? Progress will not be saved.')) {
        clearInterval(timerInterval);
        backToDashboard();
    }
}

function backToDashboard() {
    document.getElementById('examView').classList.add('hidden');
    document.getElementById('resultView').classList.add('hidden');
    document.getElementById('dashboardView').classList.remove('hidden');
    currentExamId = null;
    document.getElementById('examForm').reset();
}
