import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contestsService } from '../../services/contests.service';
import type { Contest, LeaderboardEntry } from '../../services/contests.service';
import type { Question } from '../../services/learning.service';

export default function ContestManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState<number | ''>('');
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  // Preview & Selection State
  const [showPreview, setShowPreview] = useState(false);
  const [candidates, setCandidates] = useState<Question[]>([]);
  const [selectionMode, setSelectionMode] = useState<'auto' | 'manual'>('auto');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  useEffect(() => {
    const fetchContest = async () => {
      if (!id) return;
      try {
        const data = await contestsService.getContest(id);
        setContest(data);
        setEditStart(toLocalInput(data.startTime));
        setEditEnd(toLocalInput(data.endTime));
        setEditDurationMinutes(Math.floor(data.timerSeconds / 60));
      } catch (error) {
        console.error('Failed to fetch contest:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContest();
  }, [id]);

  const handleGenerateTemplate = async () => {
    if (!id) return;
    setActionLoading('generate');
    try {
      // Step 1: Generate candidates
      const { questions } = await contestsService.generateCandidateQuestions(id);
      setCandidates(questions);

      // Default: Auto-select random N questions
      selectRandomQuestions(questions, contest?.numQuestions || 0);
      setSelectionMode('auto');
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to generate template:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const selectRandomQuestions = (pool: Question[], count: number) => {
    const indices = new Set<number>();
    if (count >= pool.length) {
      pool.forEach((_, i) => indices.add(i));
    } else {
      while (indices.size < count) {
        indices.add(Math.floor(Math.random() * pool.length));
      }
    }
    setSelectedIndices(indices);
  };

  const toggleSelection = (index: number) => {
    if (selectionMode === 'auto') return; // Cannot toggle manually in auto mode
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleConfirmQuiz = async () => {
    if (!id) return;
    setActionLoading('confirm');
    try {
      const selectedQuestions = candidates.filter((_, i) => selectedIndices.has(i));
      await contestsService.saveQuizTemplate(id, selectedQuestions);
      const updated = await contestsService.getContest(id);
      setContest(updated);
      setShowPreview(false);
    } catch (error) {
      console.error('Failed to save quiz:', error);
    } finally {
      setActionLoading(null);
    }
  };



  const handleDeleteContest = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this contest? This cannot be undone.')) {
      return;
    }

    setActionLoading('delete');
    try {
      await contestsService.deleteContest(id);
      navigate('/admin/contests');
    } catch (error) {
      console.error('Failed to delete contest:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateTiming = async () => {
    if (!id) return;

    const duration =
      editDurationMinutes === '' ? NaN : Number(editDurationMinutes);

    if (!editStart || !editEnd || !duration || duration <= 0 || Number.isNaN(duration)) {
      console.warn('[ContestManagement] invalid timing values', {
        editStart,
        editEnd,
        editDurationMinutes,
      });
      return;
    }

    setActionLoading('timing');
    try {
      const updated = await contestsService.updateContestTiming(id, {
        startTime: editStart,
        endTime: editEnd,
        timerSeconds: duration * 60,
      });
      setContest(updated);
      // Re-sync edit fields from server response and exit edit mode
      setEditStart(toLocalInput(updated.startTime));
      setEditEnd(toLocalInput(updated.endTime));
      setEditDurationMinutes(Math.floor(updated.timerSeconds / 60));
      setIsEditingDetails(false);
    } catch (error) {
      console.error('Failed to update timing:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Leaderboard State
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const handleViewLeaderboard = async () => {
    if (!contest) return;
    try {
      const data = await contestsService.getLeaderboard(contest._id);
      setLeaderboard(data.leaderboard);
      setShowLeaderboard(true);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!contest) {
    return <div className="px-4 py-6">Contest not found</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-w-4xl w-full m-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Contest Leaderboard</h3>
              <button onClick={() => setShowLeaderboard(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Accuracy</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Completed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-transparent">
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No participants yet.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((entry) => (
                        <tr key={entry.studentId} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-lg ${entry.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                              entry.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                                entry.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gray-700'
                              }`}>
                              {entry.rank}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{entry.studentName}</div>
                            <div className="text-sm text-gray-500">{entry.studentEmail}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-bold">
                            {entry.score}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {entry.accuracy.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(entry.completedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowLeaderboard(false)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-w-4xl w-full m-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Review Quiz Questions</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span className="font-medium text-gray-300">Selection Mode:</span>
                <div className="flex bg-black/40 rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => {
                      setSelectionMode('auto');
                      selectRandomQuestions(candidates, contest?.numQuestions || 0);
                    }}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${selectionMode === 'auto' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    Auto Selection
                  </button>
                  <button
                    onClick={() => setSelectionMode('manual')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${selectionMode === 'manual' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    Manual Selection
                  </button>
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-300">Selected: </span>
                <span className={`${selectedIndices.size === (contest?.numQuestions || 0) ? 'text-green-400' : 'text-orange-400'} font-bold`}>
                  {selectedIndices.size}
                </span>
                <span className="text-gray-500"> / {contest?.numQuestions} required</span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-900">
              <div className="space-y-4">
                {candidates.map((q, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectionMode === 'manual' && toggleSelection(idx)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedIndices.has(idx)
                      ? 'border-indigo-500/50 bg-indigo-900/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                      : 'border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20'
                      } ${selectionMode === 'auto' ? 'opacity-75 cursor-default' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIndices.has(idx)
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-gray-600 bg-transparent'
                        }`}>
                        {selectedIndices.has(idx) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{idx + 1}. {q.prompt}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-400">
                          {q.options?.map((opt: string, i: number) => (
                            <div key={i} className={i === q.correctOptionIndex ? 'text-green-400 font-medium' : ''}>
                              {String.fromCharCode(65 + i)}. {opt}
                            </div>
                          ))}
                          {q.correctAnswerText && <div className="text-green-400 font-medium">Answer: {q.correctAnswerText}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex justify-end space-x-3 bg-gray-900 rounded-b-xl">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmQuiz}
                disabled={selectedIndices.size !== (contest?.numQuestions || 0) || actionLoading === 'confirm'}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 shadow-lg shadow-green-900/30"
              >
                {actionLoading === 'confirm' ? 'Saving...' : 'Confirm & Publish Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/contests')}
          className="text-indigo-400 hover:text-indigo-300 mb-4 flex items-center transition-colors"
        >
          <span className="mr-1">←</span> Back to Contests
        </button>
        <h1 className="text-3xl font-bold text-white">{contest.title}</h1>
        <p className="mt-2 text-gray-400">{contest.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Contest Info */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Contest Details</h2>
              <button
                type="button"
                onClick={() => setIsEditingDetails((prev) => !prev)}
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {isEditingDetails ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <p className={`text-lg font-bold capitalize ${contest.status === 'LIVE' ? 'text-green-400' :
                  contest.status === 'SCHEDULED' ? 'text-blue-400' :
                    contest.status === 'COMPLETED' ? 'text-gray-400' : 'text-yellow-400'
                  }`}>{contest.status}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Difficulty</span>
                <p className="text-lg font-bold text-white capitalize">{contest.difficulty}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Questions</span>
                <p className="text-lg font-bold text-white">{contest.numQuestions}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Duration</span>
                {isEditingDetails ? (
                  <input
                    type="number"
                    min={1}
                    value={editDurationMinutes}
                    onChange={(e) =>
                      setEditDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1 w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-lg font-bold text-white">
                    {Math.floor(contest.timerSeconds / 60)} minutes
                  </p>
                )}
              </div>
              <div>
                <span className="text-sm text-gray-500">Start Time</span>
                {isEditingDetails ? (
                  <input
                    type="datetime-local"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-lg font-bold text-white">
                    {new Date(contest.startTime).toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <span className="text-sm text-gray-500">End Time</span>
                {isEditingDetails ? (
                  <input
                    type="datetime-local"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-lg font-bold text-white">
                    {new Date(contest.endTime).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            {isEditingDetails && (
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(false)}
                  className="px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateTiming}
                  disabled={actionLoading === 'timing'}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                >
                  {actionLoading === 'timing' ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
            <div className="space-y-4">
              {!contest.quizTemplateId && (
                <button
                  onClick={handleGenerateTemplate}
                  disabled={actionLoading !== null}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 shadow-lg shadow-indigo-900/30 transition-all transform hover:scale-[1.02]"
                >
                  {actionLoading === 'generate' ? 'Generating...' : 'Generate Quiz Template'}
                </button>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                <div
                  className={`w-full px-3 py-2 bg-black/40 border rounded-lg capitalize font-bold ${contest.status === 'LIVE' ? 'text-green-400 border-green-500/50' :
                    contest.status === 'SCHEDULED' ? 'text-blue-400 border-blue-500/50' :
                      contest.status === 'COMPLETED' ? 'text-gray-400 border-gray-600' :
                        'text-yellow-400 border-yellow-500/50'
                    }`}
                >
                  {contest.status.toLowerCase()}
                </div>
              </div>

              {contest.status === 'COMPLETED' && (
                <button
                  onClick={() => navigate(`/admin/contests/${contest._id}/overview`)}
                  className="w-full bg-teal-600/20 text-teal-300 border border-teal-500/50 px-4 py-2 rounded-lg font-bold hover:bg-teal-600/30 transition-colors"
                >
                  View Overview
                </button>
              )}

              <button
                onClick={handleDeleteContest}
                disabled={actionLoading !== null}
                className="w-full bg-red-600/20 text-red-300 border border-red-500/50 px-4 py-2 rounded-lg font-bold hover:bg-red-600/30 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'delete' ? 'Deleting...' : 'Delete Contest'}
              </button>

              <button
                onClick={handleViewLeaderboard}
                className="w-full bg-purple-600/20 text-purple-300 border border-purple-500/50 px-4 py-2 rounded-lg font-bold hover:bg-purple-600/30 transition-colors"
              >
                View Leaderboard
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status Indicators */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Quiz Template</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${contest.quizTemplateId ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
                  }`}>
                  {contest.quizTemplateId ? 'Generated' : 'Not Generated'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Results Published</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${contest.resultsPublished ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-700 text-gray-300 border border-gray-600'
                  }`}>
                  {contest.resultsPublished ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Solutions Published</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${contest.solutionsPublished ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-700 text-gray-300 border border-gray-600'
                  }`}>
                  {contest.solutionsPublished ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


