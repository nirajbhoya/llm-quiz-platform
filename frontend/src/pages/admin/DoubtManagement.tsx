import { useState, useEffect } from 'react';
import { communityDoubtService } from '../../services/community-doubt.service';
import { boardsService } from '../../services/boards.service';
import type { CommunityQuestion } from '../../services/community-doubt.service';
import type { Board } from '../../services/boards.service';

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 24 * 60) return `${Math.floor(m / 60)}h ${m % 60}m ago`;
    return new Date(iso).toLocaleString();
}

export default function DoubtManagement() {
    const [questions, setQuestions] = useState<CommunityQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedBoard, setSelectedBoard] = useState('');
    const [selectedStandard, setSelectedStandard] = useState('');
    const [selectedQuestion, setSelectedQuestion] = useState<CommunityQuestion | null>(null);

    useEffect(() => {
        loadData();
        boardsService.getBoards().then(setBoards).catch(() => { });
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const data = await communityDoubtService.getQuestions();
            setQuestions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleBlock(studentId: string, isBlocked: boolean) {
        if (!window.confirm(`Are you sure you want to ${isBlocked ? 'block' : 'unblock'} this student?`)) return;
        try {
            await communityDoubtService.blockStudent(studentId, isBlocked);
            alert(`Student ${isBlocked ? 'blocked' : 'unblocked'} successfully.`);
            loadData();
        } catch (err) {
            console.error(err);
        }
    }

    async function handleDeleteQuestion(qid: string) {
        if (!window.confirm('Delete this question and all its answers permanently?')) return;
        try {
            await communityDoubtService.deleteQuestion(qid);
            setQuestions(prev => prev.filter(q => q._id !== qid));
            if (selectedQuestion?._id === qid) setSelectedQuestion(null);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleDeleteAnswer(aid: string) {
        if (!window.confirm('Delete this answer permanently?')) return;
        try {
            await communityDoubtService.deleteAnswer(aid);
            if (selectedQuestion) {
                // Refresh current question view
                const updated = await communityDoubtService.getQuestion(selectedQuestion._id);
                setSelectedQuestion(updated);
            }
            loadData();
        } catch (err) {
            console.error(err);
        }
    }

    const filtered = questions.filter(q => {
        const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) ||
            q.authorId?.name?.toLowerCase().includes(search.toLowerCase());
        const matchesBoard = !selectedBoard || q.boardCode === selectedBoard;
        const matchesStandard = !selectedStandard || q.standard === parseInt(selectedStandard);
        return matchesSearch && matchesBoard && matchesStandard;
    });

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white">Doubt Management</h1>
                    <p className="text-gray-400">Monitor community activity and maintain quality</p>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <select
                        value={selectedBoard}
                        onChange={e => { setSelectedBoard(e.target.value); setSelectedStandard(''); }}
                        className="bg-gray-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="">All Boards</option>
                        {boards.map(b => (
                            <option key={b._id} value={b.code}>{b.name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedStandard}
                        onChange={e => setSelectedStandard(e.target.value)}
                        className="bg-gray-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="">All Standards</option>
                        {selectedBoard && boards.find(b => b.code === selectedBoard)?.standards.map(s => (
                            <option key={s.grade} value={s.grade.toString()}>Class {s.grade}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-gray-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[200px]"
                    />
                    <button onClick={loadData} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2">
                        Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Questions Table */}
                    <div className="lg:col-span-3 bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-400 min-w-[600px]">
                            <thead className="bg-white/5 text-gray-300 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 w-1/4">Author</th>
                                    <th className="px-4 py-3 w-1/5">Class/Board</th>
                                    <th className="px-4 py-3 w-2/5">Question</th>
                                    <th className="px-4 py-3 w-20">Stats</th>
                                    <th className="px-4 py-3 w-12 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(q => (
                                    <tr
                                        key={q._id}
                                        className={`hover:bg-white/5 transition-colors cursor-pointer ${selectedQuestion?._id === q._id ? 'bg-indigo-900/20' : ''}`}
                                        onClick={() => communityDoubtService.getQuestion(q._id).then(setSelectedQuestion)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-200 truncate">{q.authorId?.name || 'N/A'}</div>
                                            <div className="text-[10px] text-gray-500 truncate">{q.authorId?.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="bg-indigo-900/30 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-indigo-500/20">
                                                Class {q.standard || '?'}
                                            </span>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">{q.boardCode || 'Global'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-300 font-medium line-clamp-1">{q.title}</div>
                                            <div className="text-[10px] text-gray-600 italic">asked {timeAgo(q.createdAt)}</div>
                                        </td>
                                        <td className="px-4 py-3 text-[10px] whitespace-nowrap">
                                            <span className="text-indigo-400">V: {q.votes}</span> <br />
                                            <span className="text-green-500">A: {q.answerCount}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q._id); }}
                                                className="p-1.5 bg-red-900/20 text-red-500 hover:bg-red-900/40 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Detail/Discussion View */}
                    <div className="lg:col-span-2 bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 min-h-[600px]">
                        {selectedQuestion ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                                    <h2 className="text-xl font-extrabold text-white">{selectedQuestion.title}</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleBlock(selectedQuestion.authorId._id, true)}
                                            className="px-3 py-1.5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-600/20"
                                        >
                                            Block Author
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-400 text-sm italic py-4">{selectedQuestion.description}</p>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase text-gray-500 tracking-widest border-l-2 border-indigo-500 pl-3">Answers</h3>
                                    {selectedQuestion.answers && selectedQuestion.answers.length > 0 ? (
                                        selectedQuestion.answers.map(ans => (
                                            <div key={ans._id} className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-indigo-400">{ans.authorId?.name || 'User'}</span>
                                                    <div className="flex gap-3 items-center">
                                                        <span className="text-[10px] text-gray-600">{timeAgo(ans.createdAt)}</span>
                                                        <button
                                                            onClick={() => handleDeleteAnswer(ans._id)}
                                                            className="text-red-900 hover:text-red-500"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-gray-400 text-xs">{ans.content}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-600 text-xs text-center py-10">No answers yet to moderate.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-50">
                                <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                </svg>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Select a question to moderate</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
