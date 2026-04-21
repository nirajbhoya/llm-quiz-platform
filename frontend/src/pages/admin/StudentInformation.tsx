import { useState, useEffect } from 'react';
import { usersService, type UserProfile } from '../../services/users.service';
import { boardsService, type Board } from '../../services/boards.service';

export default function StudentInformation() {
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedBoard, setSelectedBoard] = useState<string>('');
    const [selectedStandard, setSelectedStandard] = useState<number | ''>('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        const loadBoards = async () => {
            try {
                const data = await boardsService.getBoards();
                setBoards(data);
            } catch (err) {
                console.error('Failed to load boards', err);
            }
        };
        loadBoards();
    }, []);

    useEffect(() => {
        const loadStudents = async () => {
            try {
                setLoading(true);
                const filters: Record<string, string | number> = {};
                if (selectedBoard) filters.boardCode = selectedBoard;
                if (selectedStandard) filters.standard = selectedStandard;

                const data = await usersService.getStudents(filters);
                setStudents(data);
            } catch (err) {
                console.error('Failed to load students', err);
            } finally {
                setLoading(false);
            }
        };
        loadStudents();
    }, [selectedBoard, selectedStandard]);

    const handleViewDetails = async (student: UserProfile) => {
        setIsModalOpen(true);
        setDetailsLoading(true);
        try {
            const details = await usersService.getStudentDetails(student.id);
            setSelectedStudent(details);
        } catch (err) {
            console.error('Failed to load student details', err);
        } finally {
            setDetailsLoading(false);
        }
    };

    const currentBoard = boards.find(b => b.code === selectedBoard);
    const availableStandards = currentBoard ? currentBoard.standards.map(s => s.grade) : [];

    return (
        <div className="space-y-6 px-4 py-6 sm:px-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Student Information</h1>
                    <p className="mt-1 text-sm text-gray-400">
                        View and manage specific details of all registered students.
                    </p>
                </div>
                <div className="text-sm font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    {students.length} students found
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-lg">
                <div className="flex items-center gap-2 mb-4 text-sm font-bold text-indigo-400 uppercase tracking-wider">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                    </svg>
                    Filters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="board-filter" className="block text-xs font-medium text-gray-400 mb-2">
                            Select Board
                        </label>
                        <select
                            id="board-filter"
                            value={selectedBoard}
                            onChange={(e) => {
                                setSelectedBoard(e.target.value);
                                setSelectedStandard(''); // Reset standard when board changes
                            }}
                            className="block w-full rounded-lg bg-black/40 border border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 focus:outline-none focus:ring-2"
                        >
                            <option value="">All Boards</option>
                            {boards.map((board) => (
                                <option key={board._id} value={board.code}>
                                    {board.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="standard-filter" className="block text-xs font-medium text-gray-400 mb-2">
                            Select Class
                        </label>
                        <select
                            id="standard-filter"
                            value={selectedStandard}
                            onChange={(e) => setSelectedStandard(e.target.value ? Number(e.target.value) : '')}
                            disabled={!selectedBoard}
                            className="block w-full rounded-lg bg-black/40 border border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2"
                        >
                            <option value="">All Classes</option>
                            {availableStandards.map((std) => (
                                <option key={std} value={std}>
                                    Class {std}
                                </option>
                            ))}
                        </select>
                        {!selectedBoard && (
                            <p className="mt-1 text-xs text-gray-500 italic">Select a board first to filter by class</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Students List */}
            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading students...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <svg className="h-12 w-12 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p>No students found matching the selected filters.</p>
                    </div>
                ) : (
                    <ul role="list" className="divide-y divide-white/10">
                        {students.map((student) => {
                            // Try to find board name for display
                            const boardName = boards.find(b => b.code === student.boardCode)?.name || student.boardCode || 'No Board';

                            return (
                                <li key={student.id}>
                                    <div className="px-4 py-4 flex items-center sm:px-6 hover:bg-white/5 transition duration-150 ease-in-out">
                                        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    {/* Avatar Placeholder */}
                                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-900/40 ring-2 ring-white/10">
                                                        {(student.name && student.name.charAt(0).toUpperCase()) || 'S'}
                                                    </div>
                                                </div>
                                                <div className="ml-4 truncate">
                                                    <div className="flex text-sm items-center">
                                                        <p className="font-bold text-white truncate text-lg mr-2">{student.name}</p>
                                                    </div>
                                                    <div className="mt-1 flex">
                                                        <div className="flex items-center text-sm text-gray-400">
                                                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                            </svg>
                                                            <p>
                                                                <span className="text-gray-300">{boardName}</span>
                                                                {student.standard ? <span className="text-gray-500 mx-2">•</span> : ''}
                                                                {student.standard ? <span className="text-indigo-300 font-medium">Class {student.standard}</span> : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ml-5 flex-shrink-0">
                                            <button
                                                onClick={() => handleViewDetails(student)}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                                title="View Details"
                                            >
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Student Details Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                            aria-hidden="true"
                            onClick={() => setIsModalOpen(false)}
                        ></div>

                        {/* Modal panel */}
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-gray-900 border border-white/10 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-gray-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-xl leading-6 font-bold text-white mb-6" id="modal-title">
                                            Student Details
                                        </h3>

                                        {detailsLoading ? (
                                            <div className="mt-8 mb-8 flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                            </div>
                                        ) : selectedStudent ? (
                                            <div className="mt-4 space-y-6">
                                                <div className="border-b border-white/10 pb-4">
                                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center">
                                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        Student Information
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-4 bg-white/5 p-4 rounded-lg border border-white/5">
                                                        <div>
                                                            <label className="block text-xs text-gray-500 uppercase tracking-wide">Name</label>
                                                            <p className="text-base font-medium text-white mt-1">{selectedStudent.name}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 uppercase tracking-wide">Email</label>
                                                            <p className="text-base font-medium text-white mt-1 break-all">{selectedStudent.email}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center">
                                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        Parent Information
                                                    </h4>
                                                    {selectedStudent.parent ? (
                                                        <div className="grid grid-cols-1 gap-4 bg-white/5 p-4 rounded-lg border border-white/5">
                                                            <div>
                                                                <label className="block text-xs text-gray-500 uppercase tracking-wide">Parent Name</label>
                                                                <p className="text-base font-medium text-white mt-1">{selectedStudent.parent.name}</p>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-gray-500 uppercase tracking-wide">Parent Email</label>
                                                                <p className="text-base font-medium text-white mt-1 break-all">{selectedStudent.parent.email || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white/5 p-4 rounded-lg border border-white/5 border-dashed text-center">
                                                            <p className="text-sm italic text-gray-500">No parent information available</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-8 mb-8 text-center bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
                                                <p className="text-red-400">Failed to load details</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-black/40 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-white/10">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-lg border border-gray-600 shadow-sm px-4 py-2 bg-transparent text-base font-medium text-gray-300 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
