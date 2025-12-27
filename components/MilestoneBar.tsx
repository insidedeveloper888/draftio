import React from 'react';
import { Flag, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Milestone, Task } from '../types';

interface MilestoneBarProps {
  milestones: Milestone[];
  tasks: Task[];
  onMilestoneClick?: (milestone: Milestone) => void;
}

const MilestoneBar: React.FC<MilestoneBarProps> = ({
  milestones,
  tasks,
  onMilestoneClick,
}) => {
  if (milestones.length === 0) return null;

  // Calculate progress for each milestone
  const milestonesWithProgress = milestones
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(milestone => {
      const milestoneTasks = tasks.filter(t => t.milestoneId === milestone.id);
      const totalTasks = milestoneTasks.length;
      const completedTasks = milestoneTasks.filter(t => t.status === 'done').length;
      const inProgressTasks = milestoneTasks.filter(t => t.status === 'in_progress' || t.status === 'in_review').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Check if overdue
      const isOverdue = milestone.targetDate && milestone.targetDate < Date.now() && !milestone.completedAt;

      // Check if due soon (within 3 days)
      const isDueSoon = milestone.targetDate &&
        milestone.targetDate > Date.now() &&
        milestone.targetDate < Date.now() + 3 * 24 * 60 * 60 * 1000 &&
        !milestone.completedAt;

      return {
        ...milestone,
        totalTasks,
        completedTasks,
        inProgressTasks,
        progress,
        isOverdue,
        isDueSoon,
        isComplete: milestone.completedAt !== null || progress === 100,
      };
    });

  // Calculate overall progress
  const totalMilestoneTasks = tasks.filter(t => t.milestoneId !== null).length;
  const completedMilestoneTasks = tasks.filter(t => t.milestoneId !== null && t.status === 'done').length;
  const overallProgress = totalMilestoneTasks > 0
    ? Math.round((completedMilestoneTasks / totalMilestoneTasks) * 100)
    : 0;

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-4">
      {/* Overall Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-slate-700">Milestones</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Overall: <span className="font-bold text-indigo-600">{overallProgress}%</span>
          </div>
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestone Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
        {milestonesWithProgress.map(milestone => (
          <div
            key={milestone.id}
            onClick={() => onMilestoneClick?.(milestone)}
            className={`shrink-0 w-56 p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
              milestone.isComplete
                ? 'bg-emerald-50 border-emerald-200'
                : milestone.isOverdue
                ? 'bg-red-50 border-red-200'
                : milestone.isDueSoon
                ? 'bg-amber-50 border-amber-200'
                : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {/* Milestone Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {milestone.isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : milestone.isOverdue ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : (
                  <Flag className="w-4 h-4 text-indigo-600" />
                )}
                <span className="font-semibold text-sm text-slate-800 truncate max-w-[140px]">
                  {milestone.name}
                </span>
              </div>
              <span className={`text-xs font-bold ${
                milestone.isComplete ? 'text-emerald-600' :
                milestone.isOverdue ? 'text-red-600' :
                'text-indigo-600'
              }`}>
                {milestone.progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  milestone.isComplete ? 'bg-emerald-500' :
                  milestone.isOverdue ? 'bg-red-500' :
                  milestone.isDueSoon ? 'bg-amber-500' :
                  'bg-indigo-500'
                }`}
                style={{ width: `${milestone.progress}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>
                {milestone.completedTasks}/{milestone.totalTasks} tasks
              </span>
              {milestone.targetDate && (
                <span className={`flex items-center gap-1 ${
                  milestone.isOverdue ? 'text-red-600 font-bold' :
                  milestone.isDueSoon ? 'text-amber-600 font-semibold' : ''
                }`}>
                  <Clock className="w-3 h-3" />
                  {new Date(milestone.targetDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Unassigned Tasks Summary */}
        {tasks.filter(t => t.milestoneId === null).length > 0 && (
          <div className="shrink-0 w-44 p-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center">
                <span className="text-[8px] text-slate-600">?</span>
              </div>
              <span className="font-semibold text-sm text-slate-600">Unassigned</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {tasks.filter(t => t.milestoneId === null).length} tasks without milestone
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MilestoneBar;
