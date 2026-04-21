import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { submissionsService } from '../../services/submissions.service';
import type { Quiz } from '../../services/learning.service';

type QuestionStatus =
  | 'NOT_VISITED'
  | 'NOT_ANSWERED'
  | 'ANSWERED'
  | 'MARKED_FOR_REVIEW'
  | 'ANSWERED_MARKED_FOR_REVIEW';

interface QuestionMeta {
  visited: boolean;
  markedForReview: boolean;
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [questionMeta, setQuestionMeta] = useState<Record<number, QuestionMeta>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Initialize question metadata when quiz loads
  useEffect(() => {
    if (!quiz) return;
    setQuestionMeta((prev) => {
      if (Object.keys(prev).length > 0) return prev; // keep existing state on re-renders
      const initial: Record<number, QuestionMeta> = {};
      quiz.questions.forEach((_, idx) => {
        initial[idx] = {
          visited: idx === 0, // first question is visited when quiz starts
          markedForReview: false,
        };
      });
      return initial;
    });
  }, [quiz]);

  useEffect(() => {
    const loadQuiz = () => {
      try {
        // Try to get quiz from localStorage (for learning mode)
        const storedQuiz = localStorage.getItem('currentQuiz');
        if (storedQuiz) {
          const quizData = JSON.parse(storedQuiz);
          if (quizData._id === quizId) {
            setQuiz(quizData);
            setLoading(false);
            return;
          }
        }

        // For contest quizzes, we'll need to fetch from contest endpoint
        // This is a limitation - backend doesn't have direct quiz GET endpoint
        setError('Quiz not found. Please start a new quiz.');
        setLoading(false);
      } catch {
        setError('Failed to load quiz');
        setLoading(false);
      }
    };

    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const handleSubmitRef = useRef<() => void>(() => { });

  useEffect(() => {
    // Request fullscreen on mount for focus
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.log('Fullscreen denied or not supported', e);
      }
    };
    enterFullscreen();

    // Exit fullscreen on unmount
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }
    };
  }, []);



  useEffect(() => {
    if (quiz && quiz.timerSeconds) {
      setTimeRemaining(quiz.timerSeconds);
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quiz]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionIndex: number, value: string | number) => {
    setAnswers({ ...answers, [questionIndex]: value });
    // Mark question as visited when answering
    setQuestionMeta((prev) => ({
      ...prev,
      [questionIndex]: {
        ...(prev[questionIndex] || { visited: true, markedForReview: false }),
        visited: true,
      },
    }));
  };

  const getQuestionStatus = (questionIndex: number): QuestionStatus => {
    const meta = questionMeta[questionIndex];
    const visited = meta?.visited ?? false;
    const markedForReview = meta?.markedForReview ?? false;
    const value = answers[questionIndex];
    const hasAnswer = value !== undefined && value !== '';

    if (!visited) return 'NOT_VISITED';
    if (markedForReview && hasAnswer) return 'ANSWERED_MARKED_FOR_REVIEW';
    if (markedForReview) return 'MARKED_FOR_REVIEW';
    if (hasAnswer) return 'ANSWERED';
    return 'NOT_ANSWERED';
  };

  const goToQuestion = (index: number) => {
    if (!quiz) return;
    if (index < 0 || index >= quiz.questions.length) return;
    setCurrentQuestionIndex(index);
    setQuestionMeta((prev) => ({
      ...prev,
      [index]: {
        ...(prev[index] || { visited: false, markedForReview: false }),
        visited: true,
      },
    }));
  };

  const handleSaveAndNext = () => {
    if (!quiz) return;
    const idx = currentQuestionIndex;
    setQuestionMeta((prev) => ({
      ...prev,
      [idx]: {
        ...(prev[idx] || { visited: true, markedForReview: false }),
        visited: true,
        markedForReview: false,
      },
    }));
    if (idx < quiz.questions.length - 1) {
      goToQuestion(idx + 1);
    }
  };

  const handleSaveAndMarkForReview = () => {
    if (!quiz) return;
    const idx = currentQuestionIndex;
    setQuestionMeta((prev) => ({
      ...prev,
      [idx]: {
        ...(prev[idx] || { visited: true, markedForReview: false }),
        visited: true,
        markedForReview: true,
      },
    }));
    if (idx < quiz.questions.length - 1) {
      goToQuestion(idx + 1);
    }
  };

  const handleMarkForReviewAndNext = () => {
    if (!quiz) return;
    const idx = currentQuestionIndex;
    setQuestionMeta((prev) => ({
      ...prev,
      [idx]: {
        ...(prev[idx] || { visited: true, markedForReview: false }),
        visited: true,
        markedForReview: true,
      },
    }));
    if (idx < quiz.questions.length - 1) {
      goToQuestion(idx + 1);
    }
  };

  const handleClearResponse = () => {
    const idx = currentQuestionIndex;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitting || !quiz) return;
    setSubmitting(true);

    try {
      const answerArray = Object.entries(answers).map(([index, value]) => {
        const question = quiz.questions[parseInt(index)];
        if (question.type === 'MCQ') {
          return { questionIndex: parseInt(index), selectedOptionIndex: value as number };
        } else {
          return { questionIndex: parseInt(index), answerText: value as string };
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await submissionsService.submitQuiz(quiz._id, { answers: answerArray });
      localStorage.removeItem('currentQuiz');
      // After submitting a practice quiz, return to the practice list and show "View Result" for this quiz
      // After receiving success response, close the window
      if (window.opener && !window.opener.closed) {
        window.opener.location.reload();
      }
      window.close();
    } catch (err: unknown) {
      const error = err as any;
      setError(error.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Quiz not found'}</p>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  const statusCounts = quiz.questions.reduce(
    (acc, _q, idx) => {
      const status = getQuestionStatus(idx);
      acc[status] += 1;
      return acc;
    },
    {
      NOT_VISITED: 0,
      NOT_ANSWERED: 0,
      ANSWERED: 0,
      MARKED_FOR_REVIEW: 0,
      ANSWERED_MARKED_FOR_REVIEW: 0,
    } as Record<QuestionStatus, number>
  );



  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Practice Quiz</h1>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg text-sm font-bold hover:bg-red-600/30 transition-colors"
          >
            CLOSE WINDOW
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left: Question area */}
          <div className="lg:col-span-3 bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6 relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Read the question carefully and select the most appropriate option.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Time Remaining</div>
                <div
                  className={`text-2xl font-mono font-bold ${timeRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-indigo-400'
                    }`}
                >
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </div>

            {/* Question text */}
            <div className="mb-6 bg-black/20 p-4 rounded-lg border border-white/5">
              <p className="text-lg font-medium text-white whitespace-pre-line">{currentQuestion.prompt}</p>
            </div>

            {/* Options / answer input */}
            <div className="mb-8">
              {currentQuestion.type === 'MCQ' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-4 border rounded-xl cursor-pointer text-sm transition-all transform hover:scale-[1.01] ${answers[currentQuestionIndex] === index
                        ? 'border-indigo-500 bg-indigo-900/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                        : 'border-gray-700 bg-black/40 text-gray-300 hover:border-gray-500 hover:bg-white/5'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center transition-colors ${answers[currentQuestionIndex] === index
                        ? 'border-indigo-400 bg-indigo-500'
                        : 'border-gray-500'
                        }`}>
                        {answers[currentQuestionIndex] === index && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <input
                        type="radio"
                        name={`question-${currentQuestionIndex}`}
                        value={index}
                        checked={answers[currentQuestionIndex] === index}
                        onChange={() => handleAnswer(currentQuestionIndex, index)}
                        className="hidden"
                      />
                      <span className="font-medium text-base">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'NUMERIC' && (
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={answers[currentQuestionIndex] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        handleAnswer(currentQuestionIndex, '');
                        return;
                      }
                      if (!/^\d*(?:\.\d*)?$/.test(value)) return;
                      const digitsOnly = value.replace(/\./g, '');
                      if (digitsOnly.length > 5) return;
                      handleAnswer(currentQuestionIndex, value);
                    }}
                    className="w-full px-5 py-4 bg-black/50 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white text-lg tracking-widest font-mono placeholder-gray-600"
                    placeholder="Enter numeric answer..."
                  />
                </div>
              )}
            </div>

            {/* Primary action buttons (Save / Mark for review) */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                type="button"
                onClick={handleSaveAndNext}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-900/30"
              >
                SAVE &amp; NEXT
              </button>
              <button
                type="button"
                onClick={handleSaveAndMarkForReview}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-bold hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-900/30"
              >
                SAVE &amp; FOR REVIEW
              </button>
              <button
                type="button"
                onClick={handleClearResponse}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-600 hover:bg-gray-700 font-medium"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={handleMarkForReviewAndNext}
                className="px-4 py-2 bg-purple-600/20 text-purple-300 border border-purple-500/50 rounded-lg hover:bg-purple-600/30 font-bold"
              >
                REVIEW &amp; NEXT
              </button>
            </div>

            {/* Bottom navigation */}
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 border border-gray-700 rounded-lg text-gray-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                >
                  &lt; PREV
                </button>
                <button
                  type="button"
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === quiz.questions.length - 1}
                  className="px-4 py-2 border border-gray-700 rounded-lg text-gray-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                >
                  NEXT &gt;
                </button>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg text-sm font-bold hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(220,38,38,0.4)] tracking-wider"
              >
                {submitting ? 'SUBMITTING...' : 'FINISH EXAM'}
              </button>
            </div>
          </div>

          {/* Right: Question palette & legend */}
          <div className="space-y-4">
            {/* Legend */}
            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 text-xs">
              <h3 className="text-sm font-bold text-white mb-3 tracking-wide uppercase">Status Key</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-700 border border-gray-500"></span>
                    <span className="text-gray-400">Not Visited</span>
                  </div>
                  <span className="text-gray-500 font-mono">{statusCounts.NOT_VISITED}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-900/50 border border-red-500"></span>
                    <span className="text-gray-400">Not Answered</span>
                  </div>
                  <span className="text-gray-500 font-mono">{statusCounts.NOT_ANSWERED}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 border border-green-400 shadow-[0_0_5px_rgba(34,197,94,0.6)]"></span>
                    <span className="text-white">Answered</span>
                  </div>
                  <span className="text-white font-mono">{statusCounts.ANSWERED}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-purple-900/50 border border-purple-500"></span>
                    <span className="text-gray-400">Review</span>
                  </div>
                  <span className="text-gray-500 font-mono">{statusCounts.MARKED_FOR_REVIEW}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-indigo-900/50 border border-purple-400 relative">
                      <span className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full"></span>
                    </span>
                    <span className="text-gray-400">Ans &amp; Review</span>
                  </div>
                  <span className="text-gray-500 font-mono">{statusCounts.ANSWERED_MARKED_FOR_REVIEW}</span>
                </div>
              </div>
            </div>

            {/* Question palette */}
            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 text-xs">
              <h3 className="text-sm font-bold text-white mb-3 tracking-wide uppercase">Question Palette</h3>
              <div className="grid grid-cols-5 gap-2">
                {quiz.questions.map((_, idx) => {
                  const status = getQuestionStatus(idx);
                  const isCurrent = idx === currentQuestionIndex;

                  let bgClass = 'bg-gray-800 text-gray-400 border-gray-700';
                  if (status === 'NOT_ANSWERED') bgClass = 'bg-red-900/20 text-red-400 border-red-900/50';
                  if (status === 'ANSWERED') bgClass = 'bg-green-600 text-white border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
                  if (status === 'MARKED_FOR_REVIEW') bgClass = 'bg-purple-900/20 text-purple-400 border-purple-900/50';
                  if (status === 'ANSWERED_MARKED_FOR_REVIEW') bgClass = 'bg-indigo-900/20 text-indigo-400 border-indigo-500 relative';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      className={`w-10 h-10 rounded-lg text-xs font-bold flex items-center justify-center border transition-all ${bgClass} ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-black ring-white scale-110 z-10' : 'hover:bg-white/10'
                        }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                      {status === 'ANSWERED_MARKED_FOR_REVIEW' && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full -mr-0.5 -mt-0.5"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

