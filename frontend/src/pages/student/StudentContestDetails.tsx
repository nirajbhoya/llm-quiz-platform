import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { contestsService, type Contest, type Leaderboard } from '../../services/contests.service';
import { getPerformanceStyle } from '../../utils/performance';
import type { Quiz } from '../../services/learning.service';

export default function StudentContestDetails() {
  const { id } = useParams<{ id: string }>();
  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [solutionsQuiz, setSolutionsQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      setError('');

      try {
        const contestData = await contestsService.getContest(id);
        setContest(contestData);

        if (contestData.status === 'COMPLETED') {
          try {
            const lb = await contestsService.getLeaderboard(contestData._id);
            setLeaderboard(lb);
          } catch (err) {
            console.error('Failed to load leaderboard', err);
          }

          if (contestData.solutionsPublished) {
            try {
              const quiz = await contestsService.getSolutions(contestData._id);
              setSolutionsQuiz(quiz);
            } catch (err) {
              console.error('Failed to load solutions', err);
            }
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load contest');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Contest not found'}</p>
        </div>
      </div>
    );
  }

  const isCompleted = contest.status === 'COMPLETED';

  return (
    <div className="px-4 py-6 sm:px-0 space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-white">{contest.title}</h1>
        <p className="mt-2 text-gray-400">{contest.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Contest summary */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Contest Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                <span className="text-gray-400 block mb-1">Status</span>
                <p className="font-bold text-white capitalize">{contest.status}</p>
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                <span className="text-gray-400 block mb-1">Questions</span>
                <p className="font-bold text-white">{contest.numQuestions}</p>
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                <span className="text-gray-400 block mb-1">Duration</span>
                <p className="font-bold text-white">{Math.floor(contest.timerSeconds / 60)} min</p>
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                <span className="text-gray-400 block mb-1">Start</span>
                <p className="font-bold text-white">{new Date(contest.startTime).toLocaleString()}</p>
              </div>
              <div className="bg-black/20 p-3 rounded-lg border border-white/5 col-span-2">
                <span className="text-gray-400 block mb-1">End</span>
                <p className="font-bold text-white">{new Date(contest.endTime).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Results</h2>
            {!isCompleted && (
              <p className="text-gray-400">Contest is not completed yet. Results will be available after it ends.</p>
            )}

            {isCompleted && !leaderboard && (
              <p className="text-gray-400">Results are being prepared. Please check back soon.</p>
            )}

            {isCompleted && leaderboard && (
              <div className="space-y-2">
                {leaderboard.leaderboard.map((entry) => (
                  <div
                    key={entry.studentId}
                    className="flex justify-between items-center border-b border-white/10 py-3 text-sm hover:bg-white/5 transition-colors px-2 rounded"
                  >
                    <div>
                      <span className={`font-bold mr-3 ${entry.rank <= 3 ? 'text-yellow-400' : 'text-gray-400'}`}>#{entry.rank}</span>
                      <span className="font-bold text-white">{entry.studentName}</span>
                      <span className="ml-2 text-gray-500 text-xs">{entry.studentEmail}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-indigo-400">Score: {entry.score}</div>
                      {(() => {
                        const perf = getPerformanceStyle(entry.accuracy);
                        return (
                          <div className="flex flex-col items-end gap-1 mt-1">
                            <div className={`text-xs font-black ${perf.textColor}`}>Accuracy: {entry.accuracy.toFixed(1)}%</div>
                            <span className="text-[8px] font-black uppercase tracking-tighter px-1 py-0.5 rounded border border-white/5 opacity-80" style={{ color: perf.color, backgroundColor: perf.bgColor, borderColor: perf.borderColor }}>
                              {perf.label}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}

                {leaderboard.leaderboard.length === 0 && (
                  <p className="text-gray-500">No submissions yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Solutions (shown under Results) */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Solutions</h2>
            {!isCompleted && (
              <p className="text-gray-400">Solutions will be available after the contest is completed.</p>
            )}

            {isCompleted && !contest.solutionsPublished && (
              <p className="text-gray-400">Solutions are not available yet.</p>
            )}

            {isCompleted && contest.solutionsPublished && !solutionsQuiz && (
              <p className="text-gray-400">Loading solutions...</p>
            )}

            {isCompleted && contest.solutionsPublished && solutionsQuiz && (
              <div className="space-y-4">
                {solutionsQuiz.questions.map((q, index) => (
                  <div key={index} className="border border-white/10 rounded-lg p-4 bg-black/20">
                    <p className="font-medium text-white mb-2">
                      <span className="text-indigo-400 mr-2">Q{index + 1}.</span>{q.prompt}
                    </p>
                    {q.type === 'MCQ' && q.options && typeof q.correctOptionIndex === 'number' && (
                      <p className="text-sm text-green-400 bg-green-900/20 p-2 rounded border border-green-900/30">
                        Correct option: <span className="font-bold ml-1">{q.options[q.correctOptionIndex]}</span>
                      </p>
                    )}
                    {q.type === 'NUMERIC' && q.correctAnswerText && (
                      <p className="text-sm text-green-400 bg-green-900/20 p-2 rounded border border-green-900/30">
                        Correct answer: <span className="font-bold ml-1">{q.correctAnswerText}</span>
                      </p>
                    )}
                    {q.explanation && (
                      <div className="mt-2 text-xs text-gray-400 border-t border-white/5 pt-2">
                        <span className="font-semibold text-gray-300">Explanation:</span> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Status</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors">
                <span className="text-gray-400">Contest Status</span>
                <span className="px-2 py-1 rounded text-xs font-bold bg-gray-800 text-white border border-gray-600 capitalize">
                  {contest.status}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors">
                <span className="text-gray-400">Results</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold border ${contest.resultsPublished
                      ? 'bg-green-900/30 text-green-400 border-green-700'
                      : 'bg-gray-800 text-gray-500 border-gray-600'
                    }`}
                >
                  {contest.resultsPublished ? 'Available' : 'Not Available'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors">
                <span className="text-gray-400">Solutions</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold border ${contest.solutionsPublished
                      ? 'bg-green-900/30 text-green-400 border-green-700'
                      : 'bg-gray-800 text-gray-500 border-gray-600'
                    }`}
                >
                  {contest.solutionsPublished ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
