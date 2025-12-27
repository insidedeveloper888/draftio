import React, { useState, useMemo } from 'react';
import { X, Check, Sparkles, Clock, AlertTriangle, ChevronDown, ChevronRight, Flag } from 'lucide-react';
import { ExtractedTask, ExtractedMilestone, TaskExtractionResponse } from '../types';

interface TaskExtractionModalProps {
  extractionResult: TaskExtractionResponse;
  onConfirm: (selectedTasks: ExtractedTask[], selectedMilestones: ExtractedMilestone[]) => void;
  onCancel: () => void;
}

const priorityConfig = {
  high: { color: 'text-red-600 bg-red-50 border-red-200', icon: '🔴' },
  medium: { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: '🟡' },
  low: { color: 'text-slate-600 bg-slate-50 border-slate-200', icon: '⚪' },
};

const TaskExtractionModal: React.FC<TaskExtractionModalProps> = ({
  extractionResult,
  onConfirm,
  onCancel,
}) => {
  const { tasks, milestones, chatResponse } = extractionResult;

  // Track selected items
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(
    new Set(tasks.map((_, i) => i)) // All selected by default
  );
  const [selectedMilestoneIndices, setSelectedMilestoneIndices] = useState<Set<number>>(
    new Set(milestones.map((_, i) => i)) // All selected by default
  );

  // Track expanded milestones
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(
    new Set(milestones.map(m => m.name))
  );

  // Group tasks by milestone
  const tasksByMilestone = useMemo(() => {
    const grouped: Record<string, { task: ExtractedTask; index: number }[]> = {
      'No Milestone': [],
    };

    milestones.forEach(m => {
      grouped[m.name] = [];
    });

    tasks.forEach((task, index) => {
      const milestoneName = task.milestoneName || 'No Milestone';
      if (!grouped[milestoneName]) {
        grouped[milestoneName] = [];
      }
      grouped[milestoneName].push({ task, index });
    });

    return grouped;
  }, [tasks, milestones]);

  const toggleTask = (index: number) => {
    setSelectedTaskIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleMilestone = (index: number) => {
    setSelectedMilestoneIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleMilestoneExpanded = (name: string) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const selectAllTasks = () => {
    setSelectedTaskIndices(new Set(tasks.map((_, i) => i)));
  };

  const deselectAllTasks = () => {
    setSelectedTaskIndices(new Set());
  };

  const handleConfirm = () => {
    const selectedTasks = tasks.filter((_, i) => selectedTaskIndices.has(i));
    const selectedMilestones = milestones.filter((_, i) => selectedMilestoneIndices.has(i));
    onConfirm(selectedTasks, selectedMilestones);
  };

  const totalEstimatedHours = useMemo(() => {
    return tasks
      .filter((_, i) => selectedTaskIndices.has(i))
      .reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  }, [tasks, selectedTaskIndices]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Review Extracted Tasks</h2>
              <p className="text-sm text-slate-500">
                {tasks.length} tasks, {milestones.length} milestones extracted
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Summary */}
        <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100 shrink-0">
          <p className="text-sm text-indigo-800">{chatResponse}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quick Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllTasks}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAllTasks}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Deselect All
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>
                {selectedTaskIndices.size} tasks selected ({totalEstimatedHours}h estimated)
              </span>
            </div>
          </div>

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                Milestones
              </h3>
              <div className="space-y-2">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedMilestoneIndices.has(index)
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                    onClick={() => toggleMilestone(index)}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        selectedMilestoneIndices.has(index)
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedMilestoneIndices.has(index) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{milestone.name}</div>
                      <div className="text-sm text-slate-500">{milestone.description}</div>
                    </div>
                    <span className="text-xs text-slate-400">
                      {tasksByMilestone[milestone.name]?.length || 0} tasks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks by Milestone */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
              Tasks
            </h3>
            <div className="space-y-4">
              {Object.entries(tasksByMilestone).map(([milestoneName, tasksInMilestone]) => {
                if (tasksInMilestone.length === 0) return null;

                const isExpanded = expandedMilestones.has(milestoneName);

                return (
                  <div key={milestoneName} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Milestone Header */}
                    <button
                      onClick={() => toggleMilestoneExpanded(milestoneName)}
                      className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="font-semibold text-slate-700">{milestoneName}</span>
                        <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                          {tasksInMilestone.length}
                        </span>
                      </div>
                    </button>

                    {/* Tasks */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100">
                        {tasksInMilestone.map(({ task, index }) => {
                          const priority = task.priority as keyof typeof priorityConfig;
                          const config = priorityConfig[priority] || priorityConfig.medium;

                          return (
                            <div
                              key={index}
                              className={`p-4 cursor-pointer transition-colors ${
                                selectedTaskIndices.has(index)
                                  ? 'bg-white'
                                  : 'bg-slate-50 opacity-60'
                              }`}
                              onClick={() => toggleTask(index)}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                    selectedTaskIndices.has(index)
                                      ? 'bg-indigo-600 border-indigo-600'
                                      : 'border-slate-300'
                                  }`}
                                >
                                  {selectedTaskIndices.has(index) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-slate-800">
                                      {task.title}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${config.color}`}
                                    >
                                      {task.priority}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-500 line-clamp-2">
                                    {task.description}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                    {task.estimatedHours && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {task.estimatedHours}h
                                      </span>
                                    )}
                                    {task.dependsOn && task.dependsOn.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {task.dependsOn.length} dependencies
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedTaskIndices.size === 0}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
              selectedTaskIndices.size > 0
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            Import {selectedTaskIndices.size} Tasks
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskExtractionModal;
