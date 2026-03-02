const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// --- Student & Admin Routes ---

// Get all available exams
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [exams] = await db.query(
            'SELECT e.id, e.title, e.description, e.duration, e.created_at, u.name as created_by FROM exams e LEFT JOIN users u ON e.created_by = u.id ORDER BY e.created_at DESC'
        );
        res.json(exams);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching exams' });
    }
});

// Get a specific exam with its questions
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const examId = req.params.id;
        const [exams] = await db.query(
            'SELECT * FROM exams WHERE id = ?',
            [examId]
        );

        if (exams.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const exam = exams[0];

        // If student, don't send correct_option, let backend verify it later during submission
        let queryStr = 'SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d, marks FROM questions WHERE exam_id = ?';
        if (req.user.role === 'admin') {
            queryStr = 'SELECT * FROM questions WHERE exam_id = ?';
        }

        const [questions] = await db.query(queryStr, [examId]);
        exam.questions = questions;

        res.json(exam);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching exam' });
    }
});

// --- Admin Only Routes ---

const combinedAdminMiddleware = [authMiddleware, adminMiddleware];

// Create a new exam
router.post('/', combinedAdminMiddleware, async (req, res) => {
    const { title, description, duration } = req.body;
    try {
        if (!title || !duration) {
            return res.status(400).json({ message: 'Title and duration are required' });
        }

        const [result] = await db.query(
            'INSERT INTO exams (title, description, duration, created_by) VALUES (?, ?, ?, ?)',
            [title, description, duration, req.user.id]
        );

        res.status(201).json({ message: 'Exam created successfully', examId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating exam' });
    }
});

// Update an exam
router.put('/:id', combinedAdminMiddleware, async (req, res) => {
    const { title, description, duration } = req.body;
    const examId = req.params.id;
    try {
        await db.query(
            'UPDATE exams SET title = ?, description = ?, duration = ? WHERE id = ?',
            [title, description, duration, examId]
        );
        res.json({ message: 'Exam updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating exam' });
    }
});

// Delete an exam
router.delete('/:id', combinedAdminMiddleware, async (req, res) => {
    const examId = req.params.id;
    try {
        await db.query('DELETE FROM exams WHERE id = ?', [examId]);
        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting exam' });
    }
});

// Add a question to an exam
router.post('/:id/questions', combinedAdminMiddleware, async (req, res) => {
    const examId = req.params.id;
    const { question_text, option_a, option_b, option_c, option_d, correct_option, marks } = req.body;

    try {
        if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
            return res.status(400).json({ message: 'All question fields are required' });
        }

        const [result] = await db.query(
            'INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [examId, question_text, option_a, option_b, option_c, option_d, correct_option, marks || 1]
        );

        res.status(201).json({ message: 'Question added successfully', questionId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error adding question' });
    }
});

// Delete a question
router.delete('/questions/:questionId', combinedAdminMiddleware, async (req, res) => {
    const questionId = req.params.questionId;
    try {
        await db.query('DELETE FROM questions WHERE id = ?', [questionId]);
        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting question' });
    }
});

module.exports = router;
