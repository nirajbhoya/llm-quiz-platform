const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/llm_quiz_platform';

async function checkDuplicates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Submission = mongoose.model('Submission', new mongoose.Schema({}, { strict: false }));

    const submissions = await Submission.find({}).sort({ createdAt: -1 });
    console.log(`Total submissions: ${submissions.length}`);

    const seen = new Set();
    const duplicates = [];

    for (const sub of submissions) {
      const key = `${sub.quizId}-${sub.studentId}`;
      if (seen.has(key)) {
        duplicates.push(sub);
      } else {
        seen.add(key);
      }
    }

    console.log(`Found ${duplicates.length} duplicate submissions.`);
    for (const d of duplicates) {
      console.log(`Duplicate: QuizID=${d.quizId}, StudentID=${d.studentId}, ID=${d._id}, CreatedAt=${d.createdAt}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDuplicates();
