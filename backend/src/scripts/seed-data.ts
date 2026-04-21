import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { UserModel } from '../modules/users/user.model';
import { ContestModel, QuizModel, IQuestion } from '../modules/contests/contest.model'; // Adjusted import based on file structure

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/llm_quiz_platform';

const seedData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create Admin
        const adminEmail = 'admin@example.com';
        let admin = await UserModel.findOne({ email: adminEmail });
        if (!admin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            admin = await UserModel.create({
                name: 'Admin User',
                email: adminEmail,
                passwordHash: hashedPassword,
                role: 'admin',
            });
            console.log('Admin created');
        } else {
            console.log('Admin already exists');
        }

        // 2. Create Student
        const studentEmail = 'student@example.com';
        let student = await UserModel.findOne({ email: studentEmail });
        if (!student) {
            const hashedPassword = await bcrypt.hash('student123', 10);
            student = await UserModel.create({
                name: 'Test Student',
                email: studentEmail,
                passwordHash: hashedPassword,
                role: 'student',
                boardCode: 'CBSE', // MATCHING CONTEST
                standard: 12,      // MATCHING CONTEST
                gender: 'Male',
            });
            console.log('Student created');
        } else {
            // Ensure student has correct board/standard for the test
            if (student.boardCode !== 'CBSE' || student.standard !== 12) {
                student.boardCode = 'CBSE';
                student.standard = 12;
                await student.save();
                console.log('Student updated with correct Board/Class');
            }
            console.log('Student already exists');
        }

        // 3. Create Contest
        const contestTitle = 'Math Championship 2026';
        let contest = await ContestModel.findOne({ title: contestTitle });

        // Always recreate or update to ensure it's LIVE and has questions
        if (contest) {
            console.log('Contest exists, cleaning up to recreate...');
            await QuizModel.deleteMany({ contestId: contest._id });
            await ContestModel.findByIdAndDelete(contest._id);
        }

        const now = new Date();
        const startTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        contest = await ContestModel.create({
            title: contestTitle,
            description: 'A test contest for UI verification.',
            boardCode: 'CBSE',
            standard: 12,
            subject: 'Mathematics',
            chapter: 'Algebra',
            difficulty: 'medium',
            numQuestions: 5,
            questionTypes: ['MCQ'],
            timerSeconds: 300,
            startTime,
            endTime,
            status: 'LIVE', // Force LIVE status
        });
        console.log('Contest created:', contest._id);

        // 4. Create Quiz Template
        const questions: IQuestion[] = [
            {
                prompt: 'What is 2 + 2?',
                type: 'MCQ',
                options: ['3', '4', '5', '6'],
                correctOptionIndex: 1,
                explanation: '2 plus 2 equals 4.',
                subject: 'Mathematics',
                chapter: 'Algebra',
            },
            {
                prompt: 'Solve for x: 2x = 10',
                type: 'MCQ',
                options: ['2', '10', '5', '8'],
                correctOptionIndex: 2,
                explanation: 'Divide both sides by 2.',
                subject: 'Mathematics',
                chapter: 'Algebra',
            },
            {
                prompt: 'What is 5 * 5?',
                type: 'MCQ',
                options: ['10', '25', '55', '15'],
                correctOptionIndex: 1,
                explanation: '5 times 5 is 25.',
                subject: 'Mathematics',
                chapter: 'Algebra',
            },
            {
                prompt: 'What is 10 - 3?',
                type: 'MCQ',
                options: ['6', '7', '8', '3'],
                correctOptionIndex: 1,
                explanation: '10 minus 3 is 7.',
                subject: 'Mathematics',
                chapter: 'Algebra',
            },
            {
                prompt: 'What is 100 / 10?',
                type: 'MCQ',
                options: ['100', '1', '10', '50'],
                correctOptionIndex: 2,
                explanation: '100 divided by 10 is 10.',
                subject: 'Mathematics',
                chapter: 'Algebra',
            },
        ];

        const quiz = await QuizModel.create({
            mode: 'CONTEST',
            contestId: contest._id,
            boardCode: 'CBSE',
            standard: 12,
            subject: 'Mathematics',
            chapter: 'Algebra',
            difficulty: 'medium',
            numQuestions: 5,
            timerSeconds: 300,
            questions,
        });

        contest.quizTemplateId = quiz._id as any;
        await contest.save();
        console.log('Quiz template created and linked.');

        console.log('Seeding complete.');
        process.exit(0);

    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seedData();
