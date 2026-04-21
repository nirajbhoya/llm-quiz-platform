import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireRole, AuthRequest } from '../auth/auth.middleware';
import { DoubtSessionModel } from './doubt-session.model';
import { answerDoubtQuestion } from '../../services/llm.service';

const router = Router();

// ─── Multer setup (same pattern as doubts.routes.ts) ─────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = 'uploads/doubt-sessions';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'img-' + unique + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase()) &&
            /jpeg|jpg|png|gif|webp/.test(file.mimetype);
        ok ? cb(null, true) : cb(new Error('Only images are allowed'));
    },
});

// ─── Create a new doubt session ─────────────────────────────────────────────
router.post('/', requireAuth, requireRole(['student']), async (req: AuthRequest, res, next) => {
    try {
        const { title, subject, boardCode, standard } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const session = await DoubtSessionModel.create({
            studentId: req.user!.userId,
            title,
            subject,
            boardCode,
            standard,
            messages: [],
        });

        res.status(201).json(session);
    } catch (err) {
        next(err);
    }
});

// ─── List all doubt sessions for the current student ─────────────────────────
router.get('/', requireAuth, requireRole(['student']), async (req: AuthRequest, res, next) => {
    try {
        const sessions = await DoubtSessionModel.find({
            studentId: req.user!.userId,
        })
            .sort({ updatedAt: -1 })
            .select('_id title subject boardCode standard messages createdAt updatedAt')
            .lean();

        // Attach message count for the list view
        const result = sessions.map((s) => ({
            ...s,
            messageCount: s.messages?.length ?? 0,
        }));

        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ─── Get a single doubt session (full messages) ───────────────────────────────
router.get('/:id', requireAuth, requireRole(['student']), async (req: AuthRequest, res, next) => {
    try {
        const session = await DoubtSessionModel.findOne({
            _id: req.params.id,
            studentId: req.user!.userId,
        }).lean();

        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(session);
    } catch (err) {
        next(err);
    }
});

// ─── Ask a question inside a session (AI answers and both stored) ─────────────
router.post('/:id/ask', requireAuth, requireRole(['student']), upload.array('images', 3), async (req: AuthRequest, res, next) => {
    try {
        const { question } = req.body;
        if (!question?.trim()) return res.status(400).json({ error: 'Question is required' });

        const session = await DoubtSessionModel.findOne({
            _id: req.params.id,
            studentId: req.user!.userId,
        });

        if (!session) return res.status(404).json({ error: 'Session not found' });

        const now = new Date();

        // Collect uploaded image paths
        const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];
        const imagePaths = uploadedFiles.map(f => f.path.replace(/\\/g, '/'));

        // Store the student's question (with optional images)
        const studentMsg = {
            role: 'student' as const,
            content: question.trim(),
            images: imagePaths,
            createdAt: now,
        };
        session.messages.push(studentMsg);

        // Build history for LLM context (exclude the just-added message)
        const historyBeforeCurrent = session.messages.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
        }));

        // If images were uploaded, mention them in the question sent to the LLM
        const questionForLLM = imagePaths.length > 0
            ? `${question.trim()}\n\n[Note: The student has attached ${imagePaths.length} image(s) with this question. Describe or reason about them based on the context provided.]`
            : question.trim();

        const aiAnswer = await answerDoubtQuestion({
            question: questionForLLM,
            history: historyBeforeCurrent,
            subject: session.subject,
            boardCode: session.boardCode,
            standard: session.standard,
        });

        // Store the AI answer
        const aiMsg = { role: 'ai' as const, content: aiAnswer, images: [], createdAt: new Date() };
        session.messages.push(aiMsg);

        await session.save();

        res.json({
            studentMessage: studentMsg,
            aiMessage: aiMsg,
            totalMessages: session.messages.length,
        });
    } catch (err) {
        next(err);
    }
});

// ─── Delete a doubt session ───────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole(['student']), async (req: AuthRequest, res, next) => {
    try {
        const session = await DoubtSessionModel.findOneAndDelete({
            _id: req.params.id,
            studentId: req.user!.userId,
        });

        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// ─── Admin: list all sessions ─────────────────────────────────────────────────
router.get('/admin/all', requireAuth, requireRole(['admin']), async (req: AuthRequest, res, next) => {
    try {
        const sessions = await DoubtSessionModel.find()
            .sort({ updatedAt: -1 })
            .populate('studentId', 'name email')
            .lean();

        res.json(sessions);
    } catch (err) {
        next(err);
    }
});

export default router;
