import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { boardsService } from '../../services/boards.service';
import { learningService } from '../../services/learning.service';
import { submissionsService } from '../../services/submissions.service';
import { getPerformanceStyle } from '../../utils/performance';
import type { Board } from '../../services/boards.service';
import type { CreateLearningQuizRequest, Quiz } from '../../services/learning.service';
import type { Submission } from '../../services/submissions.service';

interface LearningLocationState {
  activeOption?: 'create' | 'existing';
  lastSubmissionId?: string;
  lastQuizId?: string;
}

export default function LearningMode() {
  const { user } = useAuth();
  const location = useLocation();
  const locationState = (location.state || {}) as LearningLocationState;
  const [boards, setBoards] = useState<Board[]>([]);
  // Initialize with user's profile data if available
  const [selectedBoard, setSelectedBoard] = useState(user?.boardCode || '');
  const [selectedStandard, setSelectedStandard] = useState(user?.standard?.toString() || '');
  // const [selectedSubject, setSelectedSubject] = useState(''); // Keep for compatibility if needed, but primary is selectedSubjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [standards, setStandards] = useState<{ grade: number }[]>([]);
  const [subjects, setSubjects] = useState<{ name: string }[]>([]);
  const [chapters, setChapters] = useState<{ name: string }[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [timerSeconds, setTimerSeconds] = useState(600);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeOption, setActiveOption] = useState<'create' | 'existing'>(
    locationState.activeOption ?? 'create'
  );
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [submissionsByQuiz, setSubmissionsByQuiz] = useState<Record<string, Submission>>({});
  const [highlightQuizId] = useState<string | undefined>(locationState.lastQuizId);

  // Filters for existing practice quizzes
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const data = await boardsService.getBoards();
        setBoards(data);
      } catch {
        setError('Failed to load boards');
      }
    };
    fetchBoards();
  }, []);

  useEffect(() => {
    const fetchMyQuizzesAndSubmissions = async () => {
      try {
        setLoadingQuizzes(true);
        const [quizzes, submissions] = await Promise.all([
          learningService.getMyQuizzes(),
          submissionsService.getMySubmissions(),
        ]);
        setMyQuizzes(quizzes);

        const map: Record<string, Submission> = {};
        submissions.forEach((sub) => {
          const quizId = sub.quizId;
          const prev = map[quizId];
          if (!prev || new Date(sub.completedAt) > new Date(prev.completedAt)) {
            map[quizId] = sub;
          }
        });
        setSubmissionsByQuiz(map);
      } catch (err) {
        console.error('Failed to load practice quizzes or submissions', err);
      } finally {
        setLoadingQuizzes(false);
      }
    };
    if (activeOption === 'existing') {
      fetchMyQuizzesAndSubmissions();
    }
  }, [activeOption]);

  useEffect(() => {
    if (selectedBoard) {
      const fetchStandards = async () => {
        try {
          const data = await boardsService.getStandards(selectedBoard);
          setStandards(data);
        } catch {
          setError('Failed to load standards');
        }
      };
      fetchStandards();
    }
  }, [selectedBoard]);

  useEffect(() => {
    if (selectedBoard && selectedStandard) {
      const fetchSubjects = async () => {
        try {
          const data = await boardsService.getSubjects(selectedBoard, parseInt(selectedStandard));
          setSubjects(data);
          setSelectedSubjects([]); // Reset selections on standard change
          setSelectedChapter(''); // Reset chapter
        } catch {
          setError('Failed to load subjects');
        }
      };
      fetchSubjects();
    }
  }, [selectedBoard, selectedStandard]);

  useEffect(() => {
    // Only fetch chapters if exactly one subject is selected
    if (selectedBoard && selectedStandard && selectedSubjects.length === 1) {
      const fetchChapters = async () => {
        try {
          const data = await boardsService.getChapters(selectedBoard, parseInt(selectedStandard), selectedSubjects[0]);
          setChapters(data);
        } catch {
          setError('Failed to load chapters');
        }
      };
      fetchChapters();
    } else {
      setChapters([]);
    }
  }, [selectedBoard, selectedStandard, selectedSubjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const quizData: CreateLearningQuizRequest = {
        title,
        description,
        boardCode: selectedBoard,
        standard: parseInt(selectedStandard),
        subject: selectedSubjects[0], // Primary subject for list view compatibility
        subjects: selectedSubjects,
        chapter: selectedChapter || undefined,
        difficulty,
        numQuestions,
        timerSeconds,
        questionTypes: ['MCQ'],
      };

      const quiz = await learningService.createQuiz(quizData);

      // Reset create form back to defaults
      setSelectedBoard('');
      setSelectedStandard('');
      // setSelectedSubject('');
      setSelectedSubjects([]);
      setSelectedChapter('');
      setTitle('');
      setDescription('');
      setDifficulty('medium');
      setNumQuestions(10);
      setTimerSeconds(600);

      // After creating, switch to Option B and show it in the list instead of entering directly
      setActiveOption('existing');
      setMyQuizzes((prev) => [quiz, ...prev]);
    } catch (err: unknown) {
      const error = err as any;
      setError(error.response?.data?.error || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  // Build filter option lists based on loaded quizzes
  const subjectOptions = Array.from(
    new Set(
      myQuizzes
        .map((q) => q.subject)
        .filter((s): s is string => !!s)
    )
  );

  const monthOptions = Array.from(
    new Set(
      myQuizzes
        .map((q) => {
          if (!q.createdAt) return '';
          // Expecting ISO-like string; first 7 chars are YYYY-MM
          const key = q.createdAt.slice(0, 7);
          return key;
        })
        .filter((v) => v)
    )
  ).sort((a, b) => b.localeCompare(a));

  const formatMonthLabel = (value: string) => {
    const [year, month] = value.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  };

  const filteredQuizzes = myQuizzes.filter((q) => {
    const subjectMatch = !filterSubject || (q.subject || '').trim().toLowerCase() === filterSubject.trim().toLowerCase();

    const rawCreated = typeof q.createdAt === 'string' ? q.createdAt : new Date(q.createdAt).toISOString();
    const quizMonth = rawCreated ? rawCreated.slice(0, 7) : '';
    const monthMatch = !filterMonth || quizMonth === filterMonth;

    return subjectMatch && monthMatch;
  });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Practice Mode</h1>
        <p className="mt-2 text-gray-400">Create or take practice quizzes</p>
      </div>

      {/* Option selector */}
      <div className="mb-6 flex space-x-4">
        <button
          type="button"
          onClick={() => setActiveOption('create')}
          className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${activeOption === 'create'
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
            : 'bg-black/40 text-gray-400 border-gray-700 hover:bg-white/5 hover:text-white'
            }`}
        >
          Option A: Create Practice Quiz
        </button>
        <button
          type="button"
          onClick={() => setActiveOption('existing')}
          className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${activeOption === 'existing'
            ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.5)]'
            : 'bg-black/40 text-gray-400 border-gray-700 hover:bg-white/5 hover:text-white'
            }`}
        >
          Option B: Take Existing Quiz
        </button>
      </div>

      {activeOption === 'create' && (
        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-900/30 border border-red-800 p-4">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Quiz Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Math Morning Practice"
                className="w-full px-4 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Board *</label>
              <select
                required
                value={selectedBoard}
                disabled={!!user?.boardCode}
                onChange={(e) => {
                  setSelectedBoard(e.target.value);
                  setSelectedStandard('');
                  // setSelectedSubject('');
                  setSelectedSubjects([]);
                  setSelectedChapter('');
                }}
                className={`w-full px-4 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${user?.boardCode ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                <option value="">Select Board</option>
                {boards.map((board) => (
                  <option key={board._id} value={board.code}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBoard && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Standard *</label>
                <select
                  required
                  value={selectedStandard}
                  disabled={!!user?.standard}
                  onChange={(e) => {
                    setSelectedStandard(e.target.value);
                    // setSelectedSubject('');
                    setSelectedSubjects([]);
                    setSelectedChapter('');
                  }}
                  className={`w-full px-4 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${user?.standard ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  <option value="">Select Standard</option>
                  {standards.map((std) => (
                    <option key={std.grade} value={std.grade}>
                      Class {std.grade}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedBoard && selectedStandard && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subjects (Select at least one)</label>
                {subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"

                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${selectedSubjects.length === subjects.length
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                        }`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (selectedSubjects.length === subjects.length) {
                          setSelectedSubjects([]);
                        } else {
                          setSelectedSubjects(subjects.map(s => s.name));
                        }
                      }}
                    >
                      All Subjects
                    </button>
                    {subjects.map((subj) => {
                      const isSelected = selectedSubjects.includes(subj.name);
                      return (
                        <button
                          key={subj.name}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSubjects(prev => prev.filter(s => s !== subj.name));
                            } else {
                              setSelectedSubjects(prev => [...prev, subj.name]);
                            }
                            // Clear chapter if subject changes significantly? 
                            // Multi-subject usually disables chapter selection or requires complex logic.
                            // Let's disable chapter selection if > 1 subject is selected.
                            if (!isSelected && selectedSubjects.length >= 0) {
                              setSelectedChapter('');
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                            }`}
                        >
                          {subj.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No subjects available for this standard.</p>
                )}
                {subjects.length > 0 && selectedSubjects.length === 0 && (
                  <p className="text-red-400 text-xs mt-1">Please select at least one subject.</p>
                )}
              </div>
            )}

            {selectedBoard && selectedStandard && selectedSubjects.length === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Chapter (Optional)</label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="w-full px-4 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Chapters</option>
                  {chapters.map((chap) => (
                    <option key={chap.name} value={chap.name}>
                      {chap.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="w-full px-4 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Number of Questions</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  required
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Timer (seconds)</label>
                <input
                  type="number"
                  min={60}
                  required
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !title || !selectedBoard || !selectedStandard || selectedSubjects.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-bold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/30 transition-transform transform hover:scale-[1.02]"
            >
              {loading ? 'Creating Quiz...' : 'CREATE PRACTICE QUIZ'}
            </button>
          </form>
        </div>
      )}

      {activeOption === 'existing' && (
        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl p-6 max-w-3xl">
          <h2 className="text-xl font-bold text-white mb-4">Your Practice Quizzes</h2>

          {/* Filters: subject and month */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 mb-4 space-y-2 sm:space-y-0">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Filter by Subject</label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full px-4 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Subjects</option>
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Filter by Month</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-4 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Months</option>
                {monthOptions.map((value) => (
                  <option key={value} value={value}>
                    {formatMonthLabel(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingQuizzes ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : myQuizzes.length === 0 ? (
            <p className="text-gray-400">You have not created any practice quizzes yet.</p>
          ) : filteredQuizzes.length === 0 ? (
            <p className="text-gray-400">No practice quizzes match your filters.</p>
          ) : (
            <div className="space-y-4">
              {filteredQuizzes.map((q) => {
                const submission = submissionsByQuiz[q._id];
                const isHighlighted = highlightQuizId === q._id;
                // Construct display string for subjects
                let displaySubject = q.subject;
                if (q.subjects && q.subjects.length > 0) {
                  displaySubject = q.subjects.join(', ');
                }

                return (
                  <div
                    key={q._id}
                    className={`border rounded-lg p-5 flex justify-between items-center transition-colors ${isHighlighted ? 'border-green-500/50 bg-green-900/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    <div>
                      <h3 className="text-lg font-bold text-white">{q.title || 'Practice Quiz'}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {q.boardCode} • Class {q.standard} • <span className="capitalize">{q.difficulty}</span> • {q.numQuestions} questions
                      </p>
                      {displaySubject && (
                        <p className="text-xs text-gray-500 mt-1">
                          {displaySubject}{q.chapter ? ` — ${q.chapter}` : ''}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">
                        Created at: {new Date(q.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {/* Retake button removed as per user request */}

                      {submission ? (
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const perf = getPerformanceStyle(submission.accuracy);
                              return (
                                <>
                                  <div className={`text-lg font-black ${perf.textColor}`}>{submission.accuracy.toFixed(1)}%</div>
                                  <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/5" style={{ color: perf.color, backgroundColor: perf.bgColor, borderColor: perf.borderColor }}>
                                    {perf.label}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/student/submissions/${submission._id}`);
                            }}
                            className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-600/50 rounded-lg text-sm font-bold hover:bg-indigo-600/30 transition-colors"
                          >
                            Result
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('currentQuiz', JSON.stringify(q));
                            // Open in new window with minimal UI
                            const width = window.screen.availWidth;
                            const height = window.screen.availHeight;
                            window.open(
                              `/student/quiz/${q._id}`,
                              'PracticeQuiz',
                              `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`
                            );
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-900/20"
                        >
                          Take Quiz
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

