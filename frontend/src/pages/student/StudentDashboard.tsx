import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsService } from '../../services/analytics.service';
import { contestsService } from '../../services/contests.service';
import { getPerformanceStyle } from '../../utils/performance';
import type { StudentSummary } from '../../services/analytics.service';
import type { Contest } from '../../services/contests.service';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [upcomingContests, setUpcomingContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, contestsData] = await Promise.all([
          analyticsService.getStudentSummary(),
          contestsService.getStudentContests('SCHEDULED'),
        ]);
        setSummary(summaryData);
        setUpcomingContests(contestsData.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">{user?.name}</span>!</h1>
        <p className="mt-2 text-gray-400">Continue your journey to mastery.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 overflow-hidden shadow-lg rounded-xl hover:border-purple-500/50 transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-indigo-900/50 rounded-lg flex items-center justify-center border border-indigo-500/30">
                  <span className="text-indigo-400 text-sm font-bold">Q</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">Total Quizzes</dt>
                  <dd className="text-xl font-bold text-white">{summary?.totalQuizzes || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 overflow-hidden shadow-lg rounded-xl hover:border-green-500/50 transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-900/50 rounded-lg flex items-center justify-center border border-green-500/30">
                  <span className="text-green-400 text-sm font-bold">S</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">Average Score</dt>
                  <dd className="text-xl font-bold text-white">
                    {summary?.avgScore.toFixed(1) || '0.0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 overflow-hidden shadow-lg rounded-xl hover:border-yellow-500/50 transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-900/50 rounded-lg flex items-center justify-center border border-yellow-500/30">
                  <span className="text-yellow-400 text-sm font-bold">A</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">Average Accuracy</dt>
                  <dd className="text-xl font-bold text-white flex items-center gap-2">
                    {summary?.avgAccuracy.toFixed(1) || '0.0'}%
                    {summary && (
                      (() => {
                        const perf = getPerformanceStyle(summary.avgAccuracy);
                        return (
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-white/5 opacity-80`} style={{ color: perf.color, backgroundColor: perf.bgColor, borderColor: perf.borderColor }}>
                            {perf.label}
                          </span>
                        );
                      })()
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8">
        <Link
          to="/student/learning"
          className="bg-gray-900/40 backdrop-blur-lg border border-white/10 overflow-hidden shadow-lg rounded-xl hover:shadow-purple-900/20 hover:border-purple-500/50 transition-all group"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-indigo-900/50 rounded-xl flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">Practice Mode</h3>
                <p className="text-sm text-gray-400">Take practice quizzes on any topic</p>
              </div>
            </div>
          </div>
        </Link>

        <Link
          to="/student/contests"
          className="bg-gray-900/40 backdrop-blur-lg border border-white/10 overflow-hidden shadow-lg rounded-xl hover:shadow-purple-900/20 hover:border-purple-500/50 transition-all group"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-900/50 rounded-xl flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">Contests</h3>
                <p className="text-sm text-gray-400">Participate in live contests</p>
              </div>
            </div>
          </div>
        </Link>

        <Link
          to="/student/doubts"
          className="bg-gray-900/40 backdrop-blur-lg border border-white/10 overflow-hidden shadow-lg rounded-xl hover:shadow-purple-900/20 hover:border-orange-500/50 transition-all group"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-orange-900/50 rounded-xl flex items-center justify-center border border-orange-500/30 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">Doubt Discussion</h3>
                <p className="text-sm text-gray-400">Ask questions and get help</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Upcoming Contests */}
      {upcomingContests.length > 0 && (
        <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-white/5">
            <h2 className="text-lg font-bold text-white">Upcoming Contests</h2>
          </div>
          <div className="divide-y divide-white/10">
            {upcomingContests.map((contest) => (
              <div key={contest._id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">{contest.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{contest.description}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <p className="text-xs text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-500/30">
                        Starts: {new Date(contest.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/student/contests/${contest._id}`}
                    className="ml-4 bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


