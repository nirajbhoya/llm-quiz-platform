import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { contestsService } from '../../services/contests.service';
import type { Contest } from '../../services/contests.service';

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const data = await contestsService.getStudentContests(filter || undefined);
        setContests(data);
      } catch (error) {
        console.error('Failed to fetch contests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContests();
  }, [filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE':
        return 'bg-green-100 text-green-800';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Contests</h1>
          <p className="mt-2 text-gray-400">Participate in live contests and compete</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-gray-900/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Contests</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="LIVE">Live</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {contests.map((contest) => (
          <div key={contest._id} className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6 transition-all hover:border-purple-500/30">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{contest.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(contest.status)}`}>
                    {contest.status}
                  </span>
                </div>
                <p className="text-gray-400 mb-4">{contest.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Questions:</span>
                    <span className="ml-2 font-medium text-gray-300">{contest.numQuestions}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Difficulty:</span>
                    <span className="ml-2 font-medium text-gray-300 capitalize">{contest.difficulty}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2 font-medium text-gray-300">{Math.floor(contest.timerSeconds / 60)} min</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Starts:</span>
                    <span className="ml-2 font-medium text-gray-300">{new Date(contest.startTime).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="ml-6">
                {contest.status === 'LIVE' && (
                  contest.attempted ? (
                    <button
                      disabled
                      className="bg-gray-700 text-gray-400 px-6 py-2 rounded-lg font-bold cursor-not-allowed border border-gray-600"
                    >
                      Attempted
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const width = window.screen.availWidth;
                        const height = window.screen.availHeight;
                        window.open(
                          `/student/contests/${contest._id}/take`,
                          'TakeContest',
                          `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`
                        );
                      }}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-900/20"
                    >
                      Take Contest
                    </button>
                  )
                )}
                {contest.status === 'SCHEDULED' && (
                  <button
                    disabled
                    className="bg-gray-800 text-gray-500 px-6 py-2 rounded-lg font-bold cursor-not-allowed border border-gray-700"
                  >
                    Not Started
                  </button>
                )}
                {contest.status === 'COMPLETED' && (
                  <Link
                    to={`/student/contests/${contest._id}`}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-900/20"
                  >
                    View Results
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {contests.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No contests found</p>
        </div>
      )}
    </div>
  );
}


