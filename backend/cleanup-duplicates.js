const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/llm_quiz_platform';

async function cleanupDuplicates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Submission = mongoose.model('Submission', new mongoose.Schema({}, { strict: false }));

    const submissions = await Submission.find({}).sort({ createdAt: -1 });
    console.log(`Total submissions: ${submissions.length}`);

    const seen = new Set();
    const toDelete = [];

    for (const sub of submissions) {
      if (!sub.quizId || !sub.studentId) continue;
      const key = `${sub.quizId.toString()}-${sub.studentId.toString()}`;
      if (seen.has(key)) {
        toDelete.push(sub._id);
      } else {
        seen.add(key);
      }
    }

    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} duplicate submissions...`);
      const result = await Submission.deleteMany({ _id: { $in: toDelete } });
      console.log(`Deleted ${result.deletedCount} submissions.`);
    } else {
      console.log('No duplicates found.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanupDuplicates();
