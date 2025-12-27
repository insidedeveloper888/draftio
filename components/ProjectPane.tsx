import React, { useState, useMemo } from 'react';
import { Sparkles, Search, Filter, Plus, LayoutGrid, CheckCircle2, Clock, AlertCircle, GripVertical, AlertTriangle, Users } from 'lucide-react';
import { SavedProject, Task, Milestone, TaskStatus, TeamMember } from '../types';
import MilestoneBar from './MilestoneBar';

interface ProjectPaneProps {
  project: SavedProject | undefined;
  teamMembers: TeamMember[];
  isLockedByMe: boolean;
  isReadOnly: boolean;
  onExtractTasks: () => void;
  isExtractingTasks: boolean;
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
}

const ProjectPane: React.FC<ProjectPaneProps> = ({
  project,
  teamMembers,
  isLockedByMe,
  isReadOnly,
  onExtractTasks,
  isExtractingTasks,
  onTaskStatusChange,
  onTaskClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [milestoneFilter, setMilestoneFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const tasks = useMemo(() => project?.tasks || [], [project?.tasks]);
  const milestones = useMemo(() => project?.milestones || [], [project?.milestones]);

  // Get unique assignees from tasks for the filter dropdown
  const taskAssignees = useMemo(() => {
    const assigneeIds = new Set<string>();
    tasks.forEach(t => t.assigneeIds?.forEach(id => assigneeIds.add(id)));
    return teamMembers.filter(m => assigneeIds.has(m.uid));
  }, [tasks, teamMembers]);

  // Create a map for quick team member lookup
  const teamMemberMap = useMemo(() => {
    const map: Record<string, TeamMember> = {};
    teamMembers.forEach(m => { map[m.uid] = m; });
    return map;
  }, [teamMembers]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    let filtered = tasks;

    if (milestoneFilter) {
      filtered = filtered.filter(t => t.milestoneId === milestoneFilter);
    }

    if (assigneeFilter) {
      filtered = filtered.filter(t => t.assigneeIds?.includes(assigneeFilter));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    return {
      todo: filtered.filter(t => t.status === 'todo').sort((a, b) => a.orderIndex - b.orderIndex),
      in_progress: filtered.filter(t => t.status === 'in_progress').sort((a, b) => a.orderIndex - b.orderIndex),
      in_review: filtered.filter(t => t.status === 'in_review').sort((a, b) => a.orderIndex - b.orderIndex),
      done: filtered.filter(t => t.status === 'done').sort((a, b) => a.orderIndex - b.orderIndex),
    };
  }, [tasks, milestoneFilter, assigneeFilter, searchQuery]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Drag handlers
  const handleDragStart = (taskId: string) => {
    if (isReadOnly) return;
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (isReadOnly) return;
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    if (isReadOnly || !draggedTaskId || !onTaskStatusChange) return;

    const task = tasks.find(t => t.id === draggedTaskId);
    if (task && task.status !== newStatus) {
      onTaskStatusChange(draggedTaskId, newStatus);
    }

    setDraggedTaskId(null);
    setDragOverStatus(null);
  };

  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <LayoutGrid className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Project Selected</h2>
          <p className="text-slate-500">Select a project from the library to view tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
      {/* Project Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{project.projectName}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-slate-500">
                {completedTasks} of {totalTasks} tasks complete
              </span>
              {totalTasks > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{progressPercentage}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Extract Tasks Button */}
            <button
              onClick={onExtractTasks}
              disabled={isExtractingTasks || isReadOnly || !project.implementationPlan}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isExtractingTasks || isReadOnly || !project.implementationPlan
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isExtractingTasks ? 'animate-pulse' : ''}`} />
              {isExtractingTasks ? 'Extracting...' : 'Extract Tasks from Plan'}
            </button>

            {/* Add Task Button */}
            <button
              disabled={isReadOnly}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isReadOnly
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-800 text-white hover:bg-slate-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Milestone Filter */}
          {milestones.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={milestoneFilter || ''}
                onChange={(e) => setMilestoneFilter(e.target.value || null)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Milestones</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Assignee Filter */}
          {taskAssignees.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <select
                value={assigneeFilter || ''}
                onChange={(e) => setAssigneeFilter(e.target.value || null)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Assignees</option>
                {taskAssignees.map(m => (
                  <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {totalTasks === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 bg-white rounded-xl border-2 border-dashed border-slate-200 max-w-md">
              <Sparkles className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">No Tasks Yet</h3>
              <p className="text-slate-500 mb-4">
                {project.implementationPlan
                  ? 'Click "Extract Tasks from Plan" to automatically generate tasks from your implementation plan.'
                  : 'Create an implementation plan in Specs Mode first, then come back to extract tasks.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 h-full min-w-max">
            {/* To Do Column */}
            <KanbanColumn
              title="To Do"
              status="todo"
              tasks={tasksByStatus.todo}
              milestones={milestones}
              teamMemberMap={teamMemberMap}
              icon={<Clock className="w-4 h-4" />}
              color="slate"
              isReadOnly={isReadOnly}
              draggedTaskId={draggedTaskId}
              isDragOver={dragOverStatus === 'todo'}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, 'todo')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'todo')}
              onTaskClick={handleTaskClick}
            />

            {/* In Progress Column */}
            <KanbanColumn
              title="In Progress"
              status="in_progress"
              tasks={tasksByStatus.in_progress}
              milestones={milestones}
              teamMemberMap={teamMemberMap}
              icon={<AlertCircle className="w-4 h-4" />}
              color="blue"
              isReadOnly={isReadOnly}
              draggedTaskId={draggedTaskId}
              isDragOver={dragOverStatus === 'in_progress'}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, 'in_progress')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'in_progress')}
              onTaskClick={handleTaskClick}
            />

            {/* In Review Column */}
            <KanbanColumn
              title="In Review"
              status="in_review"
              tasks={tasksByStatus.in_review}
              milestones={milestones}
              teamMemberMap={teamMemberMap}
              icon={<Search className="w-4 h-4" />}
              color="amber"
              isReadOnly={isReadOnly}
              draggedTaskId={draggedTaskId}
              isDragOver={dragOverStatus === 'in_review'}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, 'in_review')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'in_review')}
              onTaskClick={handleTaskClick}
            />

            {/* Done Column */}
            <KanbanColumn
              title="Done"
              status="done"
              tasks={tasksByStatus.done}
              milestones={milestones}
              teamMemberMap={teamMemberMap}
              icon={<CheckCircle2 className="w-4 h-4" />}
              color="emerald"
              isReadOnly={isReadOnly}
              draggedTaskId={draggedTaskId}
              isDragOver={dragOverStatus === 'done'}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, 'done')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'done')}
              onTaskClick={handleTaskClick}
            />
          </div>
        )}
      </div>

      {/* Milestone Bar */}
      {milestones.length > 0 && (
        <MilestoneBar
          milestones={milestones}
          tasks={tasks}
        />
      )}
    </div>
  );
};

// KanbanColumn component
interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  milestones: Milestone[];
  teamMemberMap: Record<string, TeamMember>;
  icon: React.ReactNode;
  color: 'slate' | 'blue' | 'amber' | 'emerald';
  isReadOnly: boolean;
  draggedTaskId: string | null;
  isDragOver: boolean;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onTaskClick: (task: Task) => void;
}

const colorClasses = {
  slate: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-600', badge: 'bg-slate-200', dropHighlight: 'bg-slate-200' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100', dropHighlight: 'bg-blue-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100', dropHighlight: 'bg-amber-100' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', badge: 'bg-emerald-100', dropHighlight: 'bg-emerald-100' },
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tasks,
  milestones,
  teamMemberMap,
  icon,
  color,
  isReadOnly,
  draggedTaskId,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onTaskClick,
}) => {
  const colors = colorClasses[color];

  // Create milestone lookup map
  const milestoneMap = useMemo(() => {
    const map: Record<string, { name: string; colorIndex: number }> = {};
    milestones.forEach((m, index) => {
      map[m.id] = { name: m.name, colorIndex: index % milestoneColors.length };
    });
    return map;
  }, [milestones]);

  return (
    <div
      className={`w-72 shrink-0 rounded-xl border flex flex-col transition-all duration-200 ${
        isDragOver
          ? `${colors.dropHighlight} border-2 border-dashed ${colors.border}`
          : `${colors.bg} ${colors.border}`
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className={`px-4 py-3 border-b ${colors.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={colors.text}>{icon}</span>
          <span className={`font-semibold ${colors.text}`}>{title}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.badge} ${colors.text}`}>
          {tasks.length}
        </span>
      </div>

      {/* Tasks List */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[100px]">
        {tasks.map(task => {
          const milestone = task.milestoneId ? milestoneMap[task.milestoneId] : null;
          return (
            <TaskCard
              key={task.id}
              task={task}
              milestoneName={milestone?.name || null}
              milestoneColor={milestone ? milestoneColors[milestone.colorIndex].border : ''}
              teamMemberMap={teamMemberMap}
              isReadOnly={isReadOnly}
              isDragging={draggedTaskId === task.id}
              onDragStart={() => onDragStart(task.id)}
              onDragEnd={onDragEnd}
              onClick={() => onTaskClick(task)}
            />
          );
        })}
        {tasks.length === 0 && (
          <div className={`text-center py-8 text-sm ${isDragOver ? colors.text : 'text-slate-400'}`}>
            {isDragOver ? 'Drop here' : 'No tasks'}
          </div>
        )}
      </div>
    </div>
  );
};

// TaskCard component
interface TaskCardProps {
  task: Task;
  milestoneName: string | null;
  milestoneColor: string;
  teamMemberMap: Record<string, TeamMember>;
  isReadOnly: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}

const priorityColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

// Distinct colors for milestones
const milestoneColors = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-l-violet-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-l-cyan-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-l-rose-500' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-l-teal-500' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-l-orange-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-l-indigo-500' },
  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-l-pink-500' },
  { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-l-lime-500' },
];

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  milestoneName,
  milestoneColor,
  teamMemberMap,
  isReadOnly,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}) => {
  const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'done';
  const isDueSoon = task.dueDate &&
    task.dueDate > Date.now() &&
    task.dueDate < Date.now() + 2 * 24 * 60 * 60 * 1000 && // 2 days
    task.status !== 'done';

  // Get assignee info with dynamic photo lookup
  const assignees = useMemo(() => {
    if (!task.assigneeIds || task.assigneeIds.length === 0) return [];
    return task.assigneeIds.map((uid, i) => {
      const member = teamMemberMap[uid];
      return {
        uid,
        name: member?.displayName || task.assigneeNames?.[i] || 'Unknown',
        photo: member?.photoURL || task.assigneeAvatars?.[i] || null,
      };
    });
  }, [task.assigneeIds, task.assigneeNames, task.assigneeAvatars, teamMemberMap]);

  return (
    <div
      draggable={!isReadOnly}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-lg border p-3 cursor-pointer transition-all ${
        milestoneName ? `border-l-4 ${milestoneColor}` : ''
      } ${
        isDragging
          ? 'opacity-50 scale-95 shadow-lg ring-2 ring-indigo-400'
          : 'hover:shadow-md'
      } ${
        isOverdue
          ? 'border-red-300 bg-red-50/50'
          : isDueSoon
          ? 'border-amber-300 bg-amber-50/30'
          : 'border-slate-200'
      }`}
    >
      {/* Milestone Badge */}
      {milestoneName && (
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 truncate">
          {milestoneName}
        </div>
      )}

      {/* Overdue Banner */}
      {isOverdue && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded -mx-1 -mt-1 mb-2">
          <AlertTriangle className="w-3 h-3" />
          OVERDUE
        </div>
      )}

      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        {!isReadOnly && (
          <div className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-slate-800 line-clamp-2">{task.title}</h4>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              {/* Assignee Avatars */}
              {assignees.length > 0 && (
                <div className="flex -space-x-1.5">
                  {assignees.slice(0, 3).map((assignee) => (
                    assignee.photo ? (
                      <img
                        key={assignee.uid}
                        src={assignee.photo}
                        alt={assignee.name}
                        title={assignee.name}
                        className="w-5 h-5 rounded-full border-2 border-white object-cover"
                      />
                    ) : (
                      <div
                        key={assignee.uid}
                        title={assignee.name}
                        className="w-5 h-5 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600"
                      >
                        {assignee.name.charAt(0).toUpperCase()}
                      </div>
                    )
                  ))}
                  {assignees.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              )}
              {task.dueDate && (
                <span className={`flex items-center gap-1 ${
                  isOverdue ? 'text-red-500 font-semibold' :
                  isDueSoon ? 'text-amber-600 font-semibold' : ''
                }`}>
                  <Clock className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
            {task.estimatedHours != null && (
              <span className="flex items-center gap-1">
                {task.loggedHours}/{task.estimatedHours}h
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPane;
