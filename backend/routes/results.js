const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Submit exam answers and calculate score
router.post('/:examId/submit', authMiddleware, async (req, res) => {
    const examId = req.params.examId;
    const { answers } = req.body; // format: { questionId: 'A', questionId2: 'C' }

    try {
        // Fetch all questions for this exam to evaluate the answers
        const [questions] = await db.query('SELECT id, correct_option, marks FROM questions WHERE exam_id = ?', [examId]);

        if (questions.length === 0) {
            return res.status(400).json({ message: 'Exam has no questions or does not exist' });
        }

        let score = 0;
        let totalMarks = 0;

        questions.forEach(q => {
            totalMarks += q.marks;
            const studentAnswer = answers[q.id];
            if (studentAnswer === q.correct_option) {
                score += q.marks;
            }
        });

        // Save result
        const [result] = await db.query(
            'INSERT INTO results (user_id, exam_id, score, total_marks) VALUES (?, ?, ?, ?)',
            [req.user.id, examId, score, totalMarks]
        );

        res.json({
            message: 'Exam submitted successfully',
            score,
            totalMarks,
            percentage: ((score / totalMarks) * 100).toFixed(2),
            resultId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error submitting exam' });
    }
});

// Get user's own results
router.get('/my-results', authMiddleware, async (req, res) => {
    try {
        const [results] = await db.query(
            'SELECT r.id, r.score, r.total_marks, r.completed_at, e.title as exam_title ' +
            'FROM results r JOIN exams e ON r.exam_id = e.id ' +
            'WHERE r.user_id = ? ORDER BY r.completed_at DESC',
            [req.user.id]
        );
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching results' });
    }
});

// Admin: Get all results for a specific exam
router.get('/exam/:examId', [authMiddleware, adminMiddleware], async (req, res) => {
    const examId = req.params.examId;
    try {
        const [results] = await db.query(
            'SELECT r.id, r.score, r.total_marks, r.completed_at, u.name as student_name, u.email as student_email ' +
            'FROM results r JOIN users u ON r.user_id = u.id ' +
            'WHERE r.exam_id = ? ORDER BY r.score DESC, r.completed_at ASC',
            [examId]
        );
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching exam results' });
    }
});

module.exports = router;
