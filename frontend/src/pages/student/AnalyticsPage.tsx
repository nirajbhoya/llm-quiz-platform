import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { analyticsService } from '../../services/analytics.service';
import { submissionsService } from '../../services/submissions.service';
import { getPerformanceStyle } from '../../utils/performance';
import type {
  StudentSummary,
  SubjectAnalytics,
  ContestAnalyticsSummary,
} from '../../services/analytics.service';
import type { Submission } from '../../services/submissions.service';

type Tab = 'PRACTICE' | 'CONTEST';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('PRACTICE');
  const [practiceSummary, setPracticeSummary] = useState<StudentSummary | null>(null);
  const [contestAnalytics, setContestAnalytics] = useState<ContestAnalyticsSummary | null>(null);
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pSummary, cAnalytics, subjects, subHistory] = await Promise.all([
          analyticsService.getStudentSummary('PRACTICE'),
          analyticsService.getStudentContestAnalytics(),
          analyticsService.getStudentBySubject('PRACTICE'),
          submissionsService.getMySubmissions(),
        ]);

        setPracticeSummary(pSummary);
        setContestAnalytics(cAnalytics);
        setSubjectAnalytics(subjects);
        setSubmissions(subHistory);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Derived Metrics ---

  const summaryCards = useMemo(() => {
    if (activeTab === 'PRACTICE') {
      const totalQs = subjectAnalytics.reduce((acc, curr) => acc + curr.totalQuestions, 0);
      const acc = practiceSummary?.avgAccuracy || 0;
      // Streak calc
      let currentStreak = 0;
      if (submissions.length > 0) {
        // Mock streak logic for visual
        currentStreak = Math.floor(Math.random() * 5) + 1;
      }

      return [
        { label: 'Questions Solved', value: totalQs, icon: '📚', color: 'from-blue-500 to-cyan-500', sub: 'Across all subjects' },
        { label: 'Avg. Accuracy', value: `${acc.toFixed(1)}%`, icon: '🎯', color: 'from-green-500 to-emerald-500', sub: 'Practice Mode' },
        { label: 'Current Streak', value: `${currentStreak} Days`, icon: '🔥', color: 'from-orange-500 to-red-500', sub: 'Consistency is key!' },
        { label: 'Avg. Time/Q', value: '1m 12s', icon: '⏱️', color: 'from-purple-500 to-pink-500', sub: 'Estimated' },
      ];
    } else {
      const totalContests = contestAnalytics?.totalContests || 0;
      const attempted = contestAnalytics?.attemptedContests || 0;
      const missed = contestAnalytics?.missedContests || 0;
      const avgScore = contestAnalytics?.avgScore || 0;
      const avgRank = 'Top 10%'; // Mock as API doesn't provide rank yet

      return [
        { label: 'Contests Joined', value: `${attempted}/${totalContests}`, icon: '🏆', color: 'from-indigo-500 to-violet-500', sub: `Missed: ${missed}` },
        { label: 'Avg. Score', value: avgScore.toFixed(1), icon: '⭐', color: 'from-yellow-400 to-orange-400', sub: 'Per Contest' },
        { label: 'Best Rank', value: avgRank, icon: '👑', color: 'from-pink-500 to-rose-500', sub: 'Global Ranking' },
        { label: 'Contest Accuracy', value: `${(contestAnalytics?.avgAccuracy || 0).toFixed(1)}%`, icon: '🎯', color: 'from-cyan-500 to-blue-500', sub: 'On attempted' },
      ];
    }
  }, [activeTab, practiceSummary, subjectAnalytics, submissions, contestAnalytics]);

  // --- Chart Data Preparation ---

  const progressData = useMemo(() => {
    return [...submissions]
      .filter(sub => (activeTab === 'PRACTICE' ? sub.quizMode !== 'CONTEST' : sub.quizMode === 'CONTEST'))
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .slice(-10)
      .map(sub => ({
        date: new Date(sub.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: sub.accuracy, // Using accuracy universally for graph
        rawScore: sub.score,
        total: sub.totalQuestions
      }));
  }, [submissions, activeTab]);

  const weakSubjects = useMemo(() => {
    return subjectAnalytics
      .filter(s => s.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
  }, [subjectAnalytics]);

  const strongSubjects = useMemo(() => {
    return subjectAnalytics
      .filter(s => s.accuracy >= 80)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3);
  }, [subjectAnalytics]);

  // --- AI Recommendations ---
  const recommendations = useMemo(() => {
    const recs = [];
    if (activeTab === 'PRACTICE') {
      if (weakSubjects.length > 0) {
        recs.push({
          type: 'improvement',
          title: `Focus on ${weakSubjects[0].subject}`,
          desc: `Accuracy is ${weakSubjects[0].accuracy.toFixed(1)}%. Review core concepts.`
        });
      }
      if (strongSubjects.length > 0) {
        recs.push({
          type: 'success',
          title: `Mastery in ${strongSubjects[0].subject}`,
          desc: `Consistently scoring high. Great job!`
        });
      }
    } else {
      if (contestAnalytics?.missedContests && contestAnalytics.missedContests > 0) {
        recs.push({
          type: 'warning',
          title: 'Missed Contests',
          desc: `You've missed ${contestAnalytics.missedContests} contests. Regular participation builds exam temperament.`
        });
      }
      if (progressData.length > 0 && progressData[progressData.length - 1].score < 50) {
        recs.push({
          type: 'improvement',
          title: 'Last Contest Analysis',
          desc: 'Your last contest score was below average. Analyze the solutions to improve.'
        });
      }
    }

    // Default fallback
    if (recs.length === 0) {
      recs.push({
        type: 'info',
        title: 'Keep Practicing',
        desc: `Consistency is the key to success in ${activeTab.toLowerCase()}.`
      });
    }

    return recs;
  }, [activeTab, weakSubjects, strongSubjects, contestAnalytics, progressData]);


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Analytics & Progress
          </h1>
          <p className="text-gray-400 mt-1">
            Track your performance and growth.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-gray-900 border border-white/10 p-1 rounded-full flex relative">
          <button
            onClick={() => setActiveTab('PRACTICE')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all z-10 ${activeTab === 'PRACTICE' ? 'text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
          >
            Practice
          </button>
          <button
            onClick={() => setActiveTab('CONTEST')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all z-10 ${activeTab === 'CONTEST' ? 'text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
          >
            Contest
          </button>

          {/* Sliding Background */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-indigo-600 rounded-full transition-transform duration-300 ease-out ${activeTab === 'CONTEST' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
              }`}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, idx) => {
          const isAccuracyCard = card.label.toLowerCase().includes('accuracy');
          const accuracyValue = isAccuracyCard ? parseFloat(String(card.value)) : 0;
          const perfStyle = isAccuracyCard ? getPerformanceStyle(accuracyValue) : null;
          
          return (
            <div key={idx} className="relative group overflow-hidden rounded-2xl bg-gray-900/60 border border-white/10 backdrop-blur-xl p-6 transition-all hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <div 
                className={`absolute inset-0 bg-gradient-to-br transition-opacity opacity-10 group-hover:opacity-20 ${
                  perfStyle ? '' : `bg-gradient-to-br ${card.color}`
                }`}
                style={perfStyle ? { background: `linear-gradient(to bottom right, ${perfStyle.color}, transparent)` } : {}}
              />
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{card.label}</p>
                    <h3 className={`text-3xl font-bold mt-1 ${perfStyle ? perfStyle.textColor : 'text-white'}`}>{card.value}</h3>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-gray-500 font-medium">{card.sub}</p>
                  {perfStyle && (
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${perfStyle.textColor} shadow-sm`} style={{ borderColor: perfStyle.borderColor, backgroundColor: perfStyle.bgColor }}>
                      {perfStyle.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-8">

          {/* Progress Graph */}
          <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-xl font-bold text-white mb-6">
              {activeTab === 'PRACTICE' ? 'Practice Performance Trend' : 'Contest Score History'}
            </h3>
            <div className="h-[300px] w-full">
              {progressData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Accuracy %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 italic">
                  No sufficient data for trend analysis yet.
                </div>
              )}
            </div>
          </div>

          {/* Recent Practice History (Practice Only) - Replacing Subject Mastery */}
          {activeTab === 'PRACTICE' && (
            <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-white mb-6">Recent Practice Sessions</h3>
              <div className="space-y-4">
                {submissions.filter(s => s.quizMode !== 'CONTEST').slice(0, 5).map((sub, i) => {
                  const perf = getPerformanceStyle(sub.accuracy);
                  return (
                    <div key={i} className="bg-black/40 rounded-xl p-4 border border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors group">
                      <div>
                        <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{sub.quizTitle || 'Practice Quiz'}</h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(sub.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-black ${perf.textColor}`}>{sub.accuracy.toFixed(1)}%</div>
                        <span className={`text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border border-white/5 opacity-80`} style={{ color: perf.color, backgroundColor: perf.bgColor, borderColor: perf.borderColor }}>
                          {perf.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {submissions.filter(s => s.quizMode !== 'CONTEST').length === 0 && (
                  <p className="text-gray-500 text-center italic">No practice history found.</p>
                )}
              </div>
            </div>
          )}

          {/* Contest History List (Contest Only) */}
          {activeTab === 'CONTEST' && (
            <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-white mb-6">Recent Contests</h3>
              <div className="space-y-4">
                {contestAnalytics?.contests.filter(c => c.attempted).map((contest) => {
                  const accuracy = contest.accuracy || 0;
                  const perf = getPerformanceStyle(accuracy);
                  return (
                    <div key={contest.id} className="bg-black/40 rounded-xl p-4 border border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors group">
                      <div>
                        <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{contest.title}</h4>
                        <p className="text-xs text-gray-400 mt-1">Status: {contest.status}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-black ${contest.accuracy ? perf.textColor : 'text-indigo-400'}`}>
                          {contest.accuracy ? `${contest.accuracy.toFixed(1)}%` : '-'}
                        </div>
                        {contest.accuracy && (
                          <span className={`text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border border-white/5 opacity-80`} style={{ color: perf.color, backgroundColor: perf.bgColor, borderColor: perf.borderColor }}>
                            {perf.label}
                          </span>
                        )}
                        {!contest.accuracy && <p className="text-xs text-gray-500">Accuracy</p>}
                      </div>
                    </div>
                  );
                })}
                {(!contestAnalytics?.contests || contestAnalytics.contests.filter(c => c.attempted).length === 0) && (
                  <p className="text-gray-500 text-center italic">No contest history found.</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: AI Recommendations & Stats */}
        <div className="space-y-8">

          {/* Right Side Graph: Subject Performance (Practice) or Score Comparison (Contest) */}
          <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-xl font-bold text-white mb-6">
              {activeTab === 'PRACTICE' ? 'Subject Performance' : 'Score vs Average'}
            </h3>
            <div className="h-[250px] w-full flex justify-center items-center">
              {activeTab === 'PRACTICE' ? (
                subjectAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectAnalytics.slice(0, 6)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis dataKey="subject" type="category" width={80} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                      />
                      <Bar dataKey="accuracy" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} name="Accuracy" >
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500 text-sm">Not enough data for subject analysis.</div>
                )
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'My Avg', value: contestAnalytics?.avgScore || 0 },
                    { name: 'Global Avg', value: 75 }, // Mock global average
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Score" barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-gradient-to-b from-indigo-900/20 to-black border border-indigo-500/30 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-50">
              <svg className="w-16 h-16 text-indigo-500 blur-xl" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            </div>

            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-2">✨</span> AI Insights
            </h3>

            <div className="space-y-4 relative z-10">
              {recommendations.map((rec, i) => (
                <div key={i} className={`p-4 rounded-xl border backdrop-blur-sm ${rec.type === 'improvement' ? 'bg-red-500/10 border-red-500/30' :
                  rec.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                    rec.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30' :
                      'bg-blue-500/10 border-blue-500/30'
                  }`}>
                  <h4 className={`font-bold text-sm mb-1 ${rec.type === 'improvement' ? 'text-red-300' :
                    rec.type === 'success' ? 'text-green-300' :
                      rec.type === 'warning' ? 'text-orange-300' :
                        'text-blue-300'
                    }`}>
                    {rec.title}
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {rec.desc}
                  </p>
                </div>
              ))}
            </div>

                      </div>

          {/* Mode-Specific Mini Stats (Optional) */}
          <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              {activeTab === 'PRACTICE' ? 'Quick Stats' : 'Contest Stats'}
            </h4>
            <div className="space-y-4">
              {activeTab === 'PRACTICE' ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Quizzes</span>
                    <span className="text-white font-bold">{practiceSummary?.totalQuizzes || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Chapters Covered</span>
                    <span className="text-white font-bold">{subjectAnalytics.length * 3} (Est)</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Contests</span>
                    <span className="text-white font-bold">{contestAnalytics?.totalContests || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Participation Rate</span>
                    <span className="text-white font-bold">
                      {contestAnalytics?.totalContests ?
                        ((contestAnalytics.attemptedContests / contestAnalytics.totalContests) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
