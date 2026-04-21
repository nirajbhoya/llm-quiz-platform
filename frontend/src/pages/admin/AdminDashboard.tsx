import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { contestsService } from '../../services/contests.service';
import { boardsService, type Board } from '../../services/boards.service';
import type { Contest } from '../../services/contests.service';

export default function AdminDashboard() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('ALL');
  const [selectedStandard, setSelectedStandard] = useState<number | 'ALL'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contestData, boardData] = await Promise.all([
          contestsService.getContests(),
          boardsService.getBoards(),
        ]);
        setContests(contestData);
        setBoards(boardData);
      } catch (error) {
        console.error('Failed to fetch admin dashboard data:', error);
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

  const filteredContests = contests.filter((c) => {
    if (selectedBoard !== 'ALL' && c.boardCode !== selectedBoard) return false;
    if (selectedStandard !== 'ALL' && c.standard !== selectedStandard) return false;
    return true;
  });

  const liveContests = filteredContests.filter((c) => c.status === 'LIVE').length;
  const scheduledContests = filteredContests.filter((c) => c.status === 'SCHEDULED').length;
  const completedContests = filteredContests.filter((c) => c.status === 'COMPLETED').length;

  const selectedBoardObj =
    selectedBoard === 'ALL' ? null : boards.find((b) => b.code === selectedBoard);
  const standards = selectedBoardObj ? selectedBoardObj.standards.map((s) => s.grade) : [];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-2 text-gray-400">Manage contests and view analytics</p>
        </div>
        <Link
          to="/admin/contests/create"
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all hover:scale-105"
        >
          Create Contest
        </Link>
      </div>

      {/* Filters for Board & Class */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Board</label>
          <select
            value={selectedBoard}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedBoard(value);
              // reset class when board changes; if "ALL" then class also becomes ALL
              if (value === 'ALL') {
                setSelectedStandard('ALL');
              } else {
                const nextBoard = boards.find((b) => b.code === value);
                const firstGrade = nextBoard?.standards[0]?.grade ?? 1;
                setSelectedStandard(firstGrade);
              }
            }}
            className="px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="ALL">All Boards</option>
            {boards.map((b) => (
              <option key={b._id} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Class</label>
          <select
            value={selectedStandard}
            onChange={(e) => {
              const value = e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10);
              setSelectedStandard(value);
            }}
            className="px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="ALL">All Classes</option>
            {standards.map((g) => (
              <option key={g} value={g}>
                Class {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl overflow-hidden hover:border-green-500/50 transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500/20 rounded-md p-3 border border-green-500/50">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">Live Contests</dt>
                  <dd className="text-2xl font-bold text-white">{liveContests}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500/20 rounded-md p-3 border border-blue-500/50">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">Scheduled</dt>
                  <dd className="text-2xl font-bold text-white">{scheduledContests}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl overflow-hidden hover:border-gray-500/50 transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-500/20 rounded-md p-3 border border-gray-500/50">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">Completed</dt>
                  <dd className="text-2xl font-bold text-white">{completedContests}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Contests */}
      <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">
            Contests for {selectedBoard === 'ALL' ? 'All Boards' : selectedBoard}
            {' '}
            • {selectedStandard === 'ALL' ? 'All Classes' : `Class ${selectedStandard}`}
          </h2>
        </div>
        <div className="divide-y divide-white/10">
          {filteredContests.slice(0, 50).map((contest) => (
            <div key={contest._id} className="px-6 py-4 hover:bg-white/5 transition-colors">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">{contest.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{contest.description}</p>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-400">
                    <span className="flex items-center">
                      Status:
                      <span className={`ml-1 font-bold capitalize ${contest.status === 'LIVE' ? 'text-green-400' :
                          contest.status === 'SCHEDULED' ? 'text-blue-400' :
                            contest.status === 'COMPLETED' ? 'text-gray-400' : 'text-yellow-400'
                        }`}>
                        {contest.status}
                      </span>
                    </span>
                    <span>Questions: {contest.numQuestions}</span>
                    <span>Starts: {new Date(contest.startTime).toLocaleString()}</span>
                  </div>
                </div>
                <Link
                  to={`/admin/contests/${contest._id}`}
                  className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-600/40 hover:text-indigo-200 transition-all"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


