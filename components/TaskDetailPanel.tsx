import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, Clock, Flag, Users, Link2, CheckCircle2 } from 'lucide-react';
import { Task, TaskStatus, TaskPriority, Milestone, TimeEntry, TaskComment, TeamMember } from '../types';
import TimeLogForm from './TimeLogForm';
import CommentThread from './CommentThread';
import AssigneeSelector from './AssigneeSelector';

interface TaskDetailPanelProps {
  task: Task;
  milestones: Milestone[];
  allTasks: Task[];
  timeEntries: TimeEntry[];
  comments: TaskComment[];
  teamMembers: TeamMember[];
  currentUserId: string;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onLogTime: (taskId: string, hours: number, description: string) => void;
  onDeleteTimeEntry: (entryId: string) => void;
  onAddComment: (taskId: string, content: string) => void;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onClose: () => void;
  isReadOnly: boolean;
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'To Do', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  in_review: { label: 'In Review', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  done: { label: 'Done', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
};

const priorityConfig: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  high: { label: 'High', color: 'bg-red-100 text-red-700 border-red-300', icon: '🔴' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: '🟡' },
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600 border-slate-300', icon: '⚪' },
};

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  milestones,
  allTasks,
  timeEntries,
  comments,
  teamMembers,
  currentUserId,
  onUpdate,
  onDelete,
  onLogTime,
  onDeleteTimeEntry,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onClose,
  isReadOnly,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [estimatedHours, setEstimatedHours] = useState<string>(
    task.estimatedHours?.toString() || ''
  );
  const [dueDate, setDueDate] = useState<string>(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [startDate, setStartDate] = useState<string>(
    task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''
  );
  const [milestoneId, setMilestoneId] = useState<string>(task.milestoneId || '');
  const [dependsOn, setDependsOn] = useState<string[]>(task.dependsOn);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds);
  const [assigneeNames, setAssigneeNames] = useState<string[]>(task.assigneeNames);
  const [assigneeAvatars, setAssigneeAvatars] = useState<(string | null)[]>(task.assigneeAvatars);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      title !== task.title ||
      description !== task.description ||
      status !== task.status ||
      priority !== task.priority ||
      estimatedHours !== (task.estimatedHours?.toString() || '') ||
      dueDate !== (task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '') ||
      startDate !== (task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '') ||
      milestoneId !== (task.milestoneId || '') ||
      JSON.stringify(dependsOn) !== JSON.stringify(task.dependsOn) ||
      JSON.stringify(assigneeIds) !== JSON.stringify(task.assigneeIds);
    setHasChanges(changed);
  }, [title, description, status, priority, estimatedHours, dueDate, startDate, milestoneId, dependsOn, assigneeIds, task]);

  const handleSave = () => {
    if (isReadOnly || !hasChanges) return;

    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      dueDate: dueDate ? new Date(dueDate).getTime() : null,
      startDate: startDate ? new Date(startDate).getTime() : null,
      milestoneId: milestoneId || null,
      dependsOn,
      assigneeIds,
      assigneeNames,
      assigneeAvatars,
      completedAt: status === 'done' ? (task.completedAt || Date.now()) : null,
    };

    onUpdate(task.id, updates);
    onClose();
  };

  const handleAssigneeChange = (ids: string[], names: string[], avatars: (string | null)[]) => {
    setAssigneeIds(ids);
    setAssigneeNames(names);
    setAssigneeAvatars(avatars);
  };

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  const toggleDependency = (taskId: string) => {
    if (isReadOnly) return;
    setDependsOn(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Filter out current task from dependency options
  const availableDependencies = allTasks.filter(t => t.id !== task.id);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${status === 'done' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <h2 className="text-lg font-bold text-slate-800">Task Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isReadOnly}
              className="w-full px-4 py-3 text-lg font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isReadOnly}
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Add a description..."
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 ${statusConfig[status].color}`}
              >
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                <Flag className="w-3 h-3 inline mr-1" />
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 ${priorityConfig[priority].color}`}
              >
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignees */}
          <AssigneeSelector
            teamMembers={teamMembers}
            selectedIds={assigneeIds}
            onChange={handleAssigneeChange}
            isReadOnly={isReadOnly}
          />

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Estimated Hours */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              <Clock className="w-3 h-3 inline mr-1" />
              Estimated Hours
            </label>
            <input
              type="number"
              value={estimatedHours}
              onChange={e => setEstimatedHours(e.target.value)}
              disabled={isReadOnly}
              min="0"
              step="0.5"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              placeholder="e.g., 4"
            />
          </div>

          {/* Milestone */}
          {milestones.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                <Flag className="w-3 h-3 inline mr-1" />
                Milestone
              </label>
              <select
                value={milestoneId}
                onChange={e => setMilestoneId(e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              >
                <option value="">No Milestone</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dependencies */}
          {availableDependencies.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                <Link2 className="w-3 h-3 inline mr-1" />
                Depends On ({dependsOn.length} selected)
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {availableDependencies.map(t => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 ${
                      isReadOnly ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={dependsOn.includes(t.id)}
                      onChange={() => toggleDependency(t.id)}
                      disabled={isReadOnly}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700 truncate flex-1">
                      {t.title}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${statusConfig[t.status].color}`}>
                      {statusConfig[t.status].label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Time Tracking */}
          <TimeLogForm
            taskId={task.id}
            timeEntries={timeEntries}
            totalLoggedHours={task.loggedHours || 0}
            onLogTime={onLogTime}
            onDeleteEntry={onDeleteTimeEntry}
            isReadOnly={isReadOnly}
          />

          {/* Comments */}
          <CommentThread
            taskId={task.id}
            comments={comments}
            currentUserId={currentUserId}
            onAddComment={onAddComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            isReadOnly={isReadOnly}
          />

          {/* Metadata */}
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-400 space-y-1">
            <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(task.updatedAt).toLocaleString()}</p>
            {task.completedAt && (
              <p className="text-emerald-600">Completed: {new Date(task.completedAt).toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          {!isReadOnly && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          {isReadOnly && <div />}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={!hasChanges || !title.trim()}
                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                  hasChanges && title.trim()
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Task?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This will permanently delete "{task.title}". This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskDetailPanel;
