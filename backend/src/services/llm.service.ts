import { DifficultyLevel, IQuestion, QuestionType } from '../modules/contests/contest.model';
import OpenAI from 'openai';

interface GenerateQuizParams {
  boardCode?: string;
  standard?: number;
  subject?: string;
  subjects?: string[];
  chapter?: string;
  difficulty: DifficultyLevel;
  numQuestions: number;
  questionTypes: QuestionType[];
}

// LLM configuration
// Preferred for Groq:
//   GROQ_API_KEY=...
//   GROQ_MODEL=llama-3.1-8b-instant (or another Groq model)
// Optionally override base URL via LLM_BASE_URL.
// Fallbacks for OpenAI are still supported.
const isGroq = !!process.env.GROQ_API_KEY;
const apiKey =
  process.env.GROQ_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.LLM_API_KEY;

const model =
  process.env.LLM_MODEL ||
  process.env.GROQ_MODEL ||
  process.env.OPENAI_MODEL ||
  (isGroq ? 'llama-3.1-8b-instant' : 'gpt-4.1-mini');

const baseURL =
  process.env.LLM_BASE_URL ||
  (isGroq ? 'https://api.groq.com/openai/v1' : undefined);

// Safe debug of LLM config (no secrets)
console.log('[LLM] init config', {
  provider: isGroq ? 'groq' : 'openai-or-other',
  hasApiKey: !!apiKey,
  model,
  baseURL,
});

const openai = apiKey
  ? new OpenAI({
    apiKey,
    // When using Groq, baseURL points to Groq's OpenAI-compatible endpoint
    ...(baseURL ? { baseURL } : {}),
  })
  : null;

export const isLlmConfigured = (): boolean => !!apiKey;

/**
 * Shuffles an array of options and returns the new options array along with the updated correctOptionIndex.
 */
function shuffleOptions(options: string[], correctIndex: number): { shuffledOptions: string[], newCorrectIndex: number } {
  if (!options || options.length === 0) return { shuffledOptions: options, newCorrectIndex: correctIndex };
  
  // Create an array of objects to track which one is correct
  const indexedOptions = options.map((opt, i) => ({ text: opt, isCorrect: i === correctIndex }));
  
  // Fisher-Yates shuffle
  for (let i = indexedOptions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
  }
  
  return {
    shuffledOptions: indexedOptions.map((o) => o.text),
    newCorrectIndex: indexedOptions.findIndex((o) => o.isCorrect),
  };
}

export const generateQuizQuestions = async (params: GenerateQuizParams): Promise<IQuestion[]> => {
  const {
    boardCode,
    standard,
    subject,
    subjects,
    chapter,
    difficulty,
    numQuestions,
    questionTypes,
  } = params;

  // Only MCQ is allowed as per new requirement
  const allowedTypes: QuestionType[] = ['MCQ'];
  const qType: QuestionType = 'MCQ';

  // Construct subject string
  let subjectStr = subject || 'General Knowledge';
  if (subjects && subjects.length > 0) {
    subjectStr = subjects.join(', ');
  }

  // If no API key is configured, fall back to deterministic stub questions
    if (!openai) {
      console.warn('[LLM] openai client is not configured, using stub questions');
      const questions: IQuestion[] = [];
      for (let i = 0; i < numQuestions; i += 1) {
        const num1 = Math.floor(Math.random() * 50) + 1;
        const num2 = Math.floor(Math.random() * 50) + 1;
        const correctSum = num1 + num2;
        const wrong1 = correctSum + Math.floor(Math.random() * 5) + 1;
        const wrong2 = correctSum - Math.floor(Math.random() * 5) - 1;
        const wrong3 = correctSum + 10;

        const originalOptions = [String(wrong1), String(correctSum), String(wrong2), String(wrong3)];
        // Force different correct answer positions using i % 4
        const forcedCorrectIndex = i % 4;
        let finalOptions = [...originalOptions];
        let finalCorrectIndex = 1; // original correct index

        if (finalCorrectIndex !== forcedCorrectIndex) {
          [finalOptions[finalCorrectIndex], finalOptions[forcedCorrectIndex]] = [finalOptions[forcedCorrectIndex], finalOptions[finalCorrectIndex]];
          finalCorrectIndex = forcedCorrectIndex;
        }

        questions.push({
          prompt: `Config Fallback: What is the sum of ${num1} and ${num2}?`,
          type: 'MCQ' as QuestionType,
          options: finalOptions,
          correctOptionIndex: finalCorrectIndex,
          correctAnswerText: String(correctSum),
          explanation:
            'This is a fallback question because the LLM API key is missing. Configure GROQ_API_KEY to enable real questions.',
          subject: subject || (subjects?.[0]) || 'General',
          chapter: chapter || 'Math Basics',
        });
      }
      return questions;
    }

  const system =
    'You are an expert academic content creator and examiner for school students (Classes 1-12). ' +
    'Your goal is to generate high-quality, scientifically accurate Multiple Choice Questions (MCQ) aligned to specific boards and standards. ' +
    'For HARD difficulty, generate advanced, high-order thinking (HOTS) questions similar to those found in specialized reference books (like HC Verma, RD Sharma, NCERT Exemplar) or competitive entrance exams (JEE, NEET, NTSE). ' +
    'For MEDIUM difficulty, focus on deep conceptual understanding and application-based problems, not just factual recall. ' +
    'Each question must be unique, non-repetitive, and test different nuances of the topic. ' +
    'CRITICAL: Distribute correct answers randomly across all 4 options (A, B, C, D). ' +
    'Return ONLY a valid JSON object matching the provided schema.';

  const typeDescription = 'multiple-choice';

  // Construct a more descriptive prompt for difficulty
  let difficultyInstruction = '';
  if (difficulty.toUpperCase() === 'HARD') {
    difficultyInstruction = 'The questions must be CHALLENGING and ADVANCED. Use complex scenarios, multi-step reasoning, and reference-book level depth (e.g., JEE/NEET style for high school, Olympiad style for middle school). Avoid trivial or direct factual questions.';
  } else if (difficulty.toUpperCase() === 'MEDIUM') {
    difficultyInstruction = 'The questions should be CONCEPTUAL and APPLICATION-BASED. Focus on "how" and "why" rather than "what".';
  } else {
    difficultyInstruction = 'The questions should be straightforward and test fundamental understanding.';
  }

  const userPrompt = `Generate ${numQuestions} distinct ${typeDescription} questions based on the following criteria:
Board: ${boardCode || 'Any'}
Class/Standard: ${standard || 'Any'}
Subject: ${subjectStr}
Topic/Chapter: ${chapter || 'General Concepts'}
Difficulty Level: ${difficulty}

SPECIFIC INSTRUCTIONS FOR DIFFICULTY:
${difficultyInstruction}

OUTPUT JSON SCHEMA:
You must return a valid JSON object with a single key "questions" containing an array of exactly ${numQuestions} objects.
Example:
{
  "questions": [
    {
      "prompt": "Detailed question text...",
      "type": "MCQ",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctOptionIndex": 2, // 0-indexed
      "explanation": "Brief step-by-step reasoning or conceptual proof...",
      "subject": "${subjectStr}",
      "chapter": "${chapter || 'General'}"
    }
  ]
}

Strict Constraints:
- Quantity: Exactly ${numQuestions} questions.
- Quality: ${difficulty} level depth. Ensure no two questions cover the exact same sub-topic.
- Options: All 4 options must be plausible to avoid easy elimination.
- Randomization: Distribute correctOptionIndex (0-3) evenly throughout the set.
`;

  try {
    const completion = await openai!.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5, // Lower temperature for more reliable JSON structure
      response_format: { type: 'json_object' } as any,
    });

    const raw = completion.choices[0]?.message?.content || '{"questions": []}';

    let parsed: { questions: any[] };
    try {
      parsed = JSON.parse(raw) as { questions: any[] };
    } catch (parseErr) {
      console.error('[LLM] Failed to parse JSON from LLM response, raw content:', raw);
      throw parseErr;
    }

    const llmQuestions = parsed.questions || [];
    console.log('[LLM] received questions from provider:', llmQuestions.length, 'requested:', numQuestions);

    // Post-process to ensure correct answers are distributed across different positions
    const processedQuestions = llmQuestions.slice(0, numQuestions).map((q, index) => {
      const rawOptions = Array.isArray(q.options) && q.options.length === 4
        ? q.options
        : ['Option A', 'Option B', 'Option C', 'Option D'];
      const rawCorrectIndex = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;

      // Force different correct answer positions by using index % 4
      const forcedCorrectIndex = index % 4;

      // If the LLM put correct answer at wrong position, swap it with the forced position
      let finalOptions = [...rawOptions];
      let finalCorrectIndex = rawCorrectIndex;

      if (rawCorrectIndex !== forcedCorrectIndex) {
        // Swap the current correct answer with the position we want it in
        [finalOptions[rawCorrectIndex], finalOptions[forcedCorrectIndex]] = [finalOptions[forcedCorrectIndex], finalOptions[rawCorrectIndex]];
        finalCorrectIndex = forcedCorrectIndex;
      }

      return {
        prompt: q.prompt,
        type: 'MCQ' as QuestionType, // Force MCQ
        options: finalOptions,
        correctOptionIndex: finalCorrectIndex,
        correctAnswerText: q.correctAnswerText,
        explanation: q.explanation || 'No explanation provided.',
        subject: q.subject || subject,
        chapter: q.chapter || chapter,
      };
    });

    // If the LLM returned fewer questions than requested, top up with simple Math fallback questions
    if (processedQuestions.length < numQuestions) {
      const missing = numQuestions - processedQuestions.length;
      console.warn('[LLM] provider returned fewer questions than requested, topping up with', missing, 'stub questions');
      for (let i = processedQuestions.length; i < numQuestions; i += 1) {
        // Generate a random simple math question for fallback
        const num1 = Math.floor(Math.random() * 50) + 1;
        const num2 = Math.floor(Math.random() * 50) + 1;
        const correctSum = num1 + num2;
        const wrong1 = correctSum + Math.floor(Math.random() * 5) + 1;
        const wrong2 = correctSum - Math.floor(Math.random() * 5) - 1;
        const wrong3 = correctSum + 10;

        // Shuffle options
        const originalOptions = [String(wrong1), String(correctSum), String(wrong2), String(wrong3)];
        const { shuffledOptions, newCorrectIndex } = shuffleOptions(originalOptions, 1);

        processedQuestions.push({
          prompt: `Fallback Question: What is the sum of ${num1} and ${num2}?`,
          type: 'MCQ' as QuestionType,
          options: shuffledOptions,
          correctOptionIndex: newCorrectIndex,
          correctAnswerText: String(correctSum),
          explanation: `The sum of ${num1} + ${num2} is ${correctSum}. (Fallback generated due to LLM limit)`,
          subject: subject || 'General',
          chapter: chapter || 'Math Basics',
        });
      }
    }

    return processedQuestions;
  } catch (err) {
    console.error('LLM quiz generation failed, falling back to stub questions', err);
    const questions: IQuestion[] = [];
    for (let i = 0; i < numQuestions; i += 1) {
      const num1 = Math.floor(Math.random() * 20) + 1;
      const num2 = Math.floor(Math.random() * 20) + 1;
      const correct = num1 * num2;
      const originalOptions = [String(correct - 1), String(correct), String(correct + 1), String(correct + 5)];
      // Force different correct answer positions using i % 4
      const forcedCorrectIndex = i % 4;
      let finalOptions = [...originalOptions];
      let finalCorrectIndex = 1; // original correct index

      if (finalCorrectIndex !== forcedCorrectIndex) {
        [finalOptions[finalCorrectIndex], finalOptions[forcedCorrectIndex]] = [finalOptions[forcedCorrectIndex], finalOptions[finalCorrectIndex]];
        finalCorrectIndex = forcedCorrectIndex;
      }

      questions.push({
        prompt: `Network Error Fallback: What is ${num1} multiplied by ${num2}?`,
        type: 'MCQ' as QuestionType,
        options: finalOptions,
        correctOptionIndex: finalCorrectIndex,
        correctAnswerText: String(correct),
        explanation: 'Check backend logs/API key. This is a local fallback question.',
        subject,
        chapter,
      });
    }
    return questions;
  }
};

interface DoubtMessage {
  role: 'student' | 'ai';
  content: string;
}

interface AnswerDoubtParams {
  question: string;
  history: DoubtMessage[];
  subject?: string;
  boardCode?: string;
  standard?: number;
}

export const answerDoubtQuestion = async (params: AnswerDoubtParams): Promise<string> => {
  const { question, history, subject, boardCode, standard } = params;

  const contextParts: string[] = [];
  if (boardCode) contextParts.push(`Education Board: ${boardCode}`);
  if (standard) contextParts.push(`Class/Standard: ${standard}`);
  if (subject) contextParts.push(`Subject: ${subject}`);
  const contextStr = contextParts.length > 0 ? contextParts.join(', ') : 'General';

  const systemPrompt =
    `You are a helpful and friendly AI tutor for school students. Context: ${contextStr}. ` +
    'Answer questions clearly, step-by-step when needed. Use simple language appropriate for school students. ' +
    'Be encouraging and accurate. If diagrams are needed, describe them in words. ' +
    'Keep answers concise but complete.';

  if (!openai) {
    return `Thank you for your question! Currently the AI tutor is not configured. Please ask your teacher for help with: "${question}"`;
  }

  // Build message history for the LLM
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Include previous conversation history (last 10 messages for context)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'student' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // Add the current question
  messages.push({ role: 'user', content: question });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    return completion.choices[0]?.message?.content?.trim() || 'I could not generate an answer. Please try again.';
  } catch (err) {
    console.error('[LLM] answerDoubtQuestion failed', err);
    return 'Sorry, I encountered an error while generating an answer. Please try again.';
  }
};
