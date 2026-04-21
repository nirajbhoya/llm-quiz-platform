
/**
 * Utility to get performance colors and labels based on percentage.
 * 
 * Rules:
 * - 90–100%: Green (#10b981) - Excellent
 * - 75–89%: Light Green (#34d399) - Very Good
 * - 60–74%: Yellow (#facc15) - Good
 * - 40–59%: Orange (#fb923c) - Average
 * - Below 40%: Red (#ef4444) - Fail/Improvement
 */

export interface PerformanceStyle {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  textColor: string;
}

export const getPerformanceStyle = (percentage: number): PerformanceStyle => {
  if (percentage >= 90) {
    return {
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.2)',
      label: 'Excellent',
      textColor: 'text-emerald-400'
    };
  }
  if (percentage >= 75) {
    return {
      color: '#34d399',
      bgColor: 'rgba(52, 211, 153, 0.1)',
      borderColor: 'rgba(52, 211, 153, 0.2)',
      label: 'Very Good',
      textColor: 'text-green-400'
    };
  }
  if (percentage >= 60) {
    return {
      color: '#facc15',
      bgColor: 'rgba(250, 204, 21, 0.1)',
      borderColor: 'rgba(250, 204, 21, 0.2)',
      label: 'Good',
      textColor: 'text-yellow-400'
    };
  }
  if (percentage >= 40) {
    return {
      color: '#fb923c',
      bgColor: 'rgba(251, 146, 60, 0.1)',
      borderColor: 'rgba(251, 146, 60, 0.2)',
      label: 'Average',
      textColor: 'text-orange-400'
    };
  }
  return {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    label: 'Needs Improvement',
    textColor: 'text-red-400'
  };
};
