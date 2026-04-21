import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { submissionsService } from '../../services/submissions.service';
import { getPerformanceStyle } from '../../utils/performance';
import type { Submission, SubmissionDetails } from '../../services/submissions.service';

type ModeFilter = 'ALL' | 'PRACTICE' | 'CONTEST';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState<ModeFilter>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  // Fallback map of quiz titles loaded from per-submission details when not passed from /submissions/me
  const [extraTitles, setExtraTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data = await submissionsService.getMySubmissions();
        setSubmissions(data);

        // For any submissions where quizTitle was not included, fetch it from the details endpoint.
        const withoutTitle = data.filter((s) => !s.quizTitle);
        if (withoutTitle.length > 0) {
          const titleMap: Record<string, string> = {};
          await Promise.all(
            withoutTitle.map(async (s) => {
              try {
                const details: SubmissionDetails = await submissionsService.getSubmissionDetails(s._id);
                if (details.quiz.title) {
                  titleMap[s._id] = details.quiz.title;
                }
              } catch (err) {
                console.error('Failed to fetch quiz title for submission', s._id, err);
              }
            })
          );
          if (Object.keys(titleMap).length > 0) {
            setExtraTitles((prev) => ({ ...prev, ...titleMap }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Build month options (YYYY-MM) from completedAt
  const monthOptions = Array.from(
    new Set(
      submissions.map((s) =>
        s.completedAt ? s.completedAt.slice(0, 7) : ''
      ).filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  const formatMonthLabel = (value: string) => {
    const [year, month] = value.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const isContest = !!submission.contestId;
    const modeOk =
      modeFilter === 'ALL' ||
      (modeFilter === 'CONTEST' && isContest) ||
      (modeFilter === 'PRACTICE' && !isContest);

    if (!modeOk) return false;

    if (monthFilter === 'ALL') return true;
    const key = submission.completedAt ? submission.completedAt.slice(0, 7) : '';
    return key === monthFilter;
  });

  // When viewing Contest mode, show one row per contest (latest attempt), not every attempt
  let displayedSubmissions = filteredSubmissions;
  if (modeFilter === 'CONTEST') {
    const latestByContest = new Map<string, Submission>();
    filteredSubmissions.forEach((s) => {
      const key = s.contestId || s.quizId; // fall back to quizId if contestId missing
      const prev = key ? latestByContest.get(key) : undefined;
      if (!key) return;
      if (!prev || new Date(s.completedAt) > new Date(prev.completedAt)) {
        latestByContest.set(key, s);
      }
    });
    displayedSubmissions = Array.from(latestByContest.values());
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Submission History</h1>
          <p className="mt-2 text-gray-400">View your past quiz attempts</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Mode filter */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Mode</label>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
              className="px-3 py-2 bg-gray-900/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="ALL" className="bg-gray-900 text-white">All</option>
              <option value="PRACTICE" className="bg-gray-900 text-white">Practice</option>
              <option value="CONTEST" className="bg-gray-900 text-white">Contest</option>
            </select>
          </div>

          {/* Month filter */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Month</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="ALL" className="bg-gray-900 text-white">All Months</option>
              {monthOptions.map((value) => (
                <option key={value} value={value} className="bg-gray-900 text-white">
                  {formatMonthLabel(value)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 shadow-lg rounded-xl overflow-hidden">
        {displayedSubmissions.length > 0 ? (
          <div className="divide-y divide-white/10">
            {displayedSubmissions.map((submission) => (
              <div key={submission._id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {(() => {
                        // For contest submissions, prefer contest title from Contest collection
                        if (submission.contestId && submission.contestTitle) {
                          return submission.contestTitle;
                        }

                        // For practice quizzes, prefer subject + chapter if available
                        const subject = submission.quizSubject || '';
                        const chapter = submission.quizChapter || '';
                        const subjectChapter = subject || chapter
                          ? `${subject}${subject && chapter ? ' — ' : ''}${chapter}`
                          : '';

                        if (subjectChapter) return subjectChapter;
                        // Fallback to title (from /submissions/me or details), then legacy code
                        return (
                          extraTitles[submission._id] ||
                          submission.quizTitle ||
                          `Quiz #${submission._id.slice(-6)}`
                        );
                      })()}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Completed: {new Date(submission.completedAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-6 text-sm">
                      <span className="text-gray-400">
                        Score: <span className="font-bold text-white">{submission.score}/{submission.totalQuestions}</span>
                      </span>
                      {(() => {
                        const perf = getPerformanceStyle(submission.accuracy);
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Accuracy:</span>
                            <span className={`font-black ${perf.textColor}`}>{submission.accuracy.toFixed(1)}%</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/5 opacity-80`} style={{ color: perf.color, backgroundColor: perf.bgColor, borderColor: perf.borderColor }}>
                              {perf.label}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <Link
                    to={`/student/submissions/${submission._id}`}
                    className="ml-auto inline-flex justify-center items-center bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] whitespace-nowrap"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No submissions found</p>
          </div>
        )}
      </div>
    </div>
  );
}


