import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { submissionsService } from '../../services/submissions.service';
import { getPerformanceStyle } from '../../utils/performance';
import type { Submission } from '../../services/submissions.service';
import type { Quiz } from '../../services/learning.service';

interface SubmissionDetailsResponse {
  submission: Submission;
  quiz: Quiz;
}

export default function StudentSubmissionDetails() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SubmissionDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const details = await submissionsService.getSubmissionDetails(id);
        setData(details as any);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load submission details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-gray-400">{error || 'Submission not found'}</p>
          <Link to="/student/submissions" className="mt-6 inline-block text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  const { submission, quiz } = data;
  const isContestQuiz = !!submission.contestId;

  return (
    <div className="px-4 py-6 sm:px-0 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            {isContestQuiz ? 'Contest Quiz Result' : 'Quiz Result'}
          </h1>
          <p className="mt-2 text-gray-400 font-medium">
            {quiz.title || (isContestQuiz ? 'Contest Quiz' : 'Practice Quiz')} • {quiz.boardCode} • Class {quiz.standard} • {quiz.difficulty}
          </p>
        </div>
        <div className="text-right text-sm text-gray-400 space-y-1">
          <p>
            Completed:{' '}
            <span className="font-bold text-white">{new Date(submission.completedAt).toLocaleString()}</span>
          </p>
          <p>
            Score:{' '}
            <span className="text-xl font-black text-indigo-400">
              {submission.score}/{submission.totalQuestions}
            </span>
          </p>
          <p>
            Accuracy:{' '}
            {(() => {
              const perf = getPerformanceStyle(submission.accuracy);
              return (
                <span className={`text-xl font-black ${perf.textColor}`}>
                  {submission.accuracy.toFixed(1)}%
                  <span className="ml-2 text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/5" style={{ color: perf.color, backgroundColor: perf.bgColor, borderColor: perf.borderColor }}>
                    {perf.label}
                  </span>
                </span>
              );
            })()}
          </p>
        </div>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            {isContestQuiz ? (
              <p className="text-gray-300">
                This quiz was part of a contest. Detailed solutions are available only on the
                contest page after the contest has ended.
              </p>
            ) : (
              <p className="text-gray-300">
                Review your answers along with correct options and explanations. Use this to understand
                mistakes and strengthen weak areas.
              </p>
            )}
          </div>
        </div>
        <Link
          to={isContestQuiz ? '/student/contests' : '/student/learning'}
          state={isContestQuiz ? undefined : { activeOption: 'existing' }}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all text-center"
        >
          {isContestQuiz ? 'Back to Contests' : 'Back to Practice Quizzes'}
        </Link>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
        <h2 className="text-2xl font-black text-white mb-8 tracking-tight border-b border-white/5 pb-4">Question-wise Solutions</h2>
        <div className="space-y-4">
          {isContestQuiz ? (
            <p className="text-gray-600 text-sm">
              Solutions for contest quizzes are not shown here. Please open the corresponding contest
              page to view official solutions once the contest is completed.
            </p>
          ) : (
            quiz.questions.map((q, index) => {
              const answer = submission.answers.find((a) => a.questionIndex === index);
              const isCorrect = answer?.isCorrect ?? false;

              return (
                <div key={index} className="bg-black/20 border border-white/5 rounded-2xl p-6 transition-hover hover:border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-lg font-bold text-white leading-relaxed">
                      Q{index + 1}. {q.prompt}
                    </p>
                    <span
                      className={`ml-4 px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest ${
                        isCorrect ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  {q.type === 'MCQ' && q.options && (
                    <div className="mt-4 space-y-2">
                      {q.options.map((option, optIndex) => {
                        const isStudentChoice = answer?.selectedOptionIndex === optIndex;
                        const isRight = q.correctOptionIndex === optIndex;

                        return (
                          <div
                            key={optIndex}
                            className={`flex items-center px-4 py-3 rounded-xl border text-sm transition-all shadow-sm ${
                              isRight
                                ? 'border-green-500/50 bg-green-500/10 text-white font-medium'
                                : isStudentChoice
                                ? 'border-red-500/50 bg-red-500/10 text-white font-medium'
                                : 'border-white/5 bg-white/5 text-gray-400'
                            }`}
                          >
                            <span className={`mr-3 text-xs font-black ${isRight ? 'text-green-400' : isStudentChoice ? 'text-red-400' : 'text-gray-500'}`}>
                                ({String.fromCharCode(65 + optIndex)})
                            </span>
                            <span className="flex-1">{option}</span>
                            {isRight && (
                              <span className="ml-3 px-2 py-0.5 bg-green-500/20 text-[10px] font-black uppercase text-green-400 rounded-md border border-green-500/20">
                                  Correct Answer
                              </span>
                            )}
                            {!isRight && isStudentChoice && (
                              <span className="ml-3 px-2 py-0.5 bg-red-500/20 text-[10px] font-black uppercase text-red-400 rounded-md border border-red-500/20">
                                  Your Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'NUMERIC' && (
                    <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Correct answer</span>
                        <span className="text-green-400 font-black text-lg">{q.correctAnswerText}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Your answer</span>
                        <span className={`font-black text-lg ${isCorrect ? 'text-indigo-400' : 'text-red-400'}`}>
                          {answer?.answerText ?? 'Not answered'}
                        </span>
                      </div>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="mt-6 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                        <p className="text-indigo-300 text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                            Explanation
                        </p>
                        <p className="text-gray-300 text-sm leading-relaxed italic">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
