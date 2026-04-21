import { Router } from 'express';
import { Types } from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireRole, AuthRequest } from '../auth/auth.middleware';
import { CommunityQuestionModel, CommunityAnswerModel } from './community-doubt.model';
import { UserModel } from '../users/user.model';

const router = Router();

// ─── Multer setup for community doubts ──────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = 'uploads/community-doubts';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'comm-' + unique + path.extname(file.originalname));
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

// Middleware to check if user belongs to the same class/board as the question
const checkAccess = async (req: AuthRequest, res: any, next: any) => {
    try {
        const doubtId = req.params.id || req.params.answerId;
        if (!doubtId) return next();

        let question;
        if (req.params.id) {
            question = await CommunityQuestionModel.findById(req.params.id);
        } else {
            const answer = await CommunityAnswerModel.findById(req.params.answerId);
            if (answer) question = await CommunityQuestionModel.findById(answer.questionId);
        }

        if (!question) return res.status(404).json({ error: 'Question not found' });

        if (req.user?.role === 'student') {
            const user = await UserModel.findById(req.user.userId);
            if (user && (user.boardCode !== question.boardCode || user.standard !== question.standard)) {
                return res.status(403).json({ error: 'Access denied: This doubt belongs to a different class' });
            }
        }
        next();
    } catch (err) {
        next(err);
    }
};

// Middleware to check if user is blocked
const checkBlocked = async (req: AuthRequest, res: any, next: any) => {
    try {
        const user = await UserModel.findById(req.user!.userId);
        if (user?.isBlockedFromDoubts) {
            return res.status(403).json({ error: 'You are blocked from posting in the community doubt section' });
        }
        next();
    } catch (err) {
        next(err);
    }
};

// ─── List community questions (Filtered by Board/Standard for Students) ──────
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
    try {
        let query = {};

        // If user is a student, only show questions from their own board and standard
        if (req.user?.role === 'student') {
            const user = await UserModel.findById(req.user.userId);
            if (user && user.boardCode && user.standard) {
                query = {
                    boardCode: user.boardCode,
                    standard: user.standard
                };
            }
        }

        const questions = await CommunityQuestionModel.find(query)
            .sort({ createdAt: -1 })
            .populate('authorId', 'name email')
            .lean();
        res.json(questions);
    } catch (err) {
        next(err);
    }
});

// ─── Post a new question ─────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole(['student']), checkBlocked, upload.array('images', 3), async (req: AuthRequest, res, next) => {
    try {
        const { title, description, subject } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        const student = await UserModel.findById(req.user!.userId);
        if (!student || !student.boardCode || !student.standard) {
            return res.status(400).json({ error: 'Please update your board and standard in your profile first' });
        }

        const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];
        const imagePaths = uploadedFiles.map(f => f.path.replace(/\\/g, '/'));

        const question = await CommunityQuestionModel.create({
            authorId: req.user!.userId,
            title,
            description,
            subject,
            images: imagePaths,
            boardCode: student.boardCode,
            standard: student.standard,
        });

        res.status(201).json(question);
    } catch (err) {
        next(err);
    }
});

// ─── Get single question with answers (Restriction applied via checkAccess)
router.get('/:id', requireAuth, checkAccess, async (req: AuthRequest, res, next) => {
    try {
        const question = await CommunityQuestionModel.findById(req.params.id)
            .populate('authorId', 'name email')
            .lean();

        const answers = await CommunityAnswerModel.find({ questionId: req.params.id })
            .sort({ votes: -1, createdAt: -1 })
            .populate('authorId', 'name email')
            .lean();

        res.json({ ...question, answers });
    } catch (err) {
        next(err);
    }
});

// ─── Post an answer ──────────────────────────────────────────────────────────
router.post('/:id/answers', requireAuth, requireRole(['student']), checkBlocked, checkAccess, upload.array('images', 2), async (req: AuthRequest, res, next) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        const question = await CommunityQuestionModel.findById(req.params.id);
        if (!question) return res.status(404).json({ error: 'Question not found' });

        const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];
        const imagePaths = uploadedFiles.map(f => f.path.replace(/\\/g, '/'));

        const answer = await CommunityAnswerModel.create({
            questionId: req.params.id,
            authorId: req.user!.userId,
            content,
            images: imagePaths,
        });

        // Increment answer count
        question.answerCount += 1;
        await question.save();

        res.status(201).json(answer);
    } catch (err) {
        next(err);
    }
});

// ─── Vote for a question ─────────────────────────────────────────────────────
router.post('/:id/vote', requireAuth, requireRole(['student']), checkBlocked, checkAccess, async (req: AuthRequest, res, next) => {
    try {
        const question = await CommunityQuestionModel.findById(req.params.id);
        if (!question) return res.status(404).json({ error: 'Question not found' });

        const userId = new Types.ObjectId(req.user!.userId);

        // Toggle vote
        const index = question.upvoters.indexOf(userId);
        if (index > -1) {
            question.upvoters.splice(index, 1);
            question.votes -= 1;
        } else {
            question.upvoters.push(userId);
            question.votes += 1;
        }

        await question.save();
        res.json({ votes: question.votes, isUpvoted: index === -1 });
    } catch (err) {
        next(err);
    }
});

// ─── Vote for an answer (One vote per question per student) ──────────────────
router.post('/answers/:answerId/vote', requireAuth, requireRole(['student']), checkBlocked, checkAccess, async (req: AuthRequest, res, next) => {
    try {
        const answer = await CommunityAnswerModel.findById(req.params.answerId);
        if (!answer) return res.status(404).json({ error: 'Answer not found' });

        const userId = new Types.ObjectId(req.user!.userId);

        // Find if this specific user has already upvoted ANY answer for this specific question
        const existingVote = await CommunityAnswerModel.findOne({
            questionId: answer.questionId,
            upvoters: userId
        });

        if (existingVote) {
            // Case 1: They are clicking the SAME answer again -> Toggle off (remove vote)
            if (existingVote._id.toString() === answer._id.toString()) {
                answer.upvoters = answer.upvoters.filter(id => id.toString() !== userId.toString());
                answer.votes = Math.max(0, answer.votes - 1);
                await answer.save();
                return res.json({ votes: answer.votes, isUpvoted: false });
            }

            // Case 2: They already voted for a DIFFERENT answer -> Transfer the vote
            // Remove from old answer
            existingVote.upvoters = existingVote.upvoters.filter(id => id.toString() !== userId.toString());
            existingVote.votes = Math.max(0, existingVote.votes - 1);
            await existingVote.save();

            // Add to new answer
            answer.upvoters.push(userId);
            answer.votes += 1;
            await answer.save();

            return res.json({
                votes: answer.votes,
                isUpvoted: true,
                transferredFrom: existingVote._id // Tell frontend to refresh both
            });
        }

        // Case 3: First time voting for any answer in this question
        answer.upvoters.push(userId);
        answer.votes += 1;
        await answer.save();
        res.json({ votes: answer.votes, isUpvoted: true });

    } catch (err) {
        next(err);
    }
});

// ─── Admin: Delete question ──────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: AuthRequest, res, next) => {
    try {
        await CommunityQuestionModel.findByIdAndDelete(req.params.id);
        await CommunityAnswerModel.deleteMany({ questionId: req.params.id });
        res.json({ message: 'Question and associated answers deleted' });
    } catch (err) {
        next(err);
    }
});

// ─── Admin: Delete answer ────────────────────────────────────────────────────
router.delete('/answers/:answerId', requireAuth, requireRole(['admin']), async (req: AuthRequest, res, next) => {
    try {
        const answer = await CommunityAnswerModel.findByIdAndDelete(req.params.answerId);
        if (answer) {
            await CommunityQuestionModel.findByIdAndUpdate(answer.questionId, { $inc: { answerCount: -1 } });
        }
        res.json({ message: 'Answer deleted' });
    } catch (err) {
        next(err);
    }
});

// ─── Admin: Block/Unblock student from community doubts ───────────────────────
router.post('/admin/block-student/:studentId', requireAuth, requireRole(['admin']), async (req: AuthRequest, res, next) => {
    try {
        const { isBlocked } = req.body; // boolean
        const student = await UserModel.findByIdAndUpdate(req.params.studentId, { isBlockedFromDoubts: isBlocked }, { new: true });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json({ message: `Student ${isBlocked ? 'blocked' : 'unblocked'} successfully`, student });
    } catch (err) {
        next(err);
    }
});

export default router;
