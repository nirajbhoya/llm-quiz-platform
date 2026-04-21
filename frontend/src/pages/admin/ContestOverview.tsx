import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contestsService, type Contest, type ContestStats } from '../../services/contests.service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ContestOverview() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [contest, setContest] = useState<Contest | null>(null);
    const [stats, setStats] = useState<ContestStats | null>(null);
    const [loading, setLoading] = useState(true);

    const [showMissedModal, setShowMissedModal] = useState(false);

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id]);

    const loadData = async (contestId: string) => {
        try {
            setLoading(true);
            const [contestData, statsData] = await Promise.all([
                contestsService.getContest(contestId),
                contestsService.getContestStats(contestId)
            ]);
            setContest(contestData);
            setStats(statsData);
        } catch (err) {
            console.error('Failed to load contest overview data', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading overview...</div>;
    if (!contest || !stats) return <div className="p-8 text-center">Contest not found.</div>;

    return (
        <div className="space-y-6 px-4 py-6 sm:px-0">
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/admin/contests')}
                        className="text-sm text-indigo-400 hover:text-indigo-300 mb-2 hover:underline transition-colors"
                    >
                        &larr; Back to Contests
                    </button>
                    <h1 className="text-3xl font-bold text-white uppercase tracking-wide">{contest.title} - Overview</h1>
                    <p className="text-gray-400">
                        Ended on: {new Date(contest.endTime).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Action buttons could go here */}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-lg hover:border-indigo-500/30 transition-colors">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Participation</p>
                    <div className="mt-2 text-sm text-gray-300 space-y-1">
                        <div className="flex justify-between">
                            <span>Total Students:</span>
                            <span className="font-bold text-white">{stats.totalStudents}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Participated:</span>
                            <span className="font-bold text-green-400">{stats.totalParticipants}</span>
                        </div>
                        <div
                            className="flex justify-between border-t border-white/10 pt-1 cursor-pointer group"
                            onClick={() => setShowMissedModal(true)}
                        >
                            <span className="group-hover:text-red-300 transition-colors">Missed:</span>
                            <div className="flex items-center">
                                <span className="font-bold text-red-400 mr-1">
                                    {stats.missedStudents.length}
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-lg hover:border-indigo-500/30 transition-colors">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Average Score</p>
                    <p className="mt-2 text-3xl font-bold text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">{stats.averageScore.toFixed(1)}</p>
                </div>
                <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-lg hover:border-green-500/30 transition-colors">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Highest Score</p>
                    <p className="mt-2 text-3xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">{stats.highestScore}</p>
                </div>
                <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-lg hover:border-red-500/30 transition-colors">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Lowest Score</p>
                    <p className="mt-2 text-3xl font-bold text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]">{stats.lowestScore}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Distribution Chart */}
                <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6">Score Distribution</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={Object.entries(stats.scoreDistribution).map(([range, count]) => ({
                                    range,
                                    count,
                                }))}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis
                                    dataKey="range"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: '#111827',
                                        border: '1px solid #374151',
                                        borderRadius: '0.5rem',
                                        color: '#F9FAFB'
                                    }}
                                    itemStyle={{ color: '#F9FAFB' }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#6366F1"
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Performers Table */}
                <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6">Top 5 Performers</h3>
                    <div className="overflow-hidden">
                        {stats.topPerformers.length === 0 ? (
                            <p className="text-gray-500 italic">No participation data yet.</p>
                        ) : (
                            <table className="min-w-full divide-y divide-white/10">
                                <thead>
                                    <tr>
                                        <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Rank</th>
                                        <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Score</th>
                                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Accuracy</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {stats.topPerformers.map((student, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-white font-bold">#{idx + 1}</td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-300">
                                                <div className="font-bold text-white">{student.name}</div>
                                                <div className="text-xs text-gray-500">{student.email}</div>
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-indigo-400 font-bold">{student.score}</td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-400">{student.accuracy}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>


            {/* Missed Students Modal */}
            {
                showMissedModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setShowMissedModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-gray-900 border border-white/10 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <div className="bg-gray-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-bold text-white" id="modal-title">
                                                Missed Students
                                            </h3>
                                            <div className="mt-4 max-h-60 overflow-y-auto custom-scrollbar">
                                                {stats.missedStudents.length === 0 ? (
                                                    <p className="text-sm text-gray-500">No students missed this contest.</p>
                                                ) : (
                                                    <ul className="divide-y divide-white/10">
                                                        {stats.missedStudents.map((student, idx) => (
                                                            <li key={idx} className="py-3 flex justify-between hover:bg-white/5 px-2 rounded transition-colors">
                                                                <div>
                                                                    <p className="text-sm font-medium text-white">{student.name}</p>
                                                                    <p className="text-sm text-gray-500">{student.email}</p>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-black/40 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-white/10">
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-600 shadow-sm px-4 py-2 bg-transparent text-base font-medium text-gray-300 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                                        onClick={() => setShowMissedModal(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
