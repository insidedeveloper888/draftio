import React, { useState, useMemo } from 'react';
import { BarChart3, Clock, AlertTriangle, CheckCircle2, Users, X, ExternalLink, FolderOpen } from 'lucide-react';
import { SavedProject, Task, TeamMember, TaskStatus } from '../types';

interface DashboardPaneProps {
  projects: SavedProject[];
  teamMembers: TeamMember[];
  currentUserId?: string;
  onTaskClick?: (task: Task, projectId: string) => void;
  onProjectClick?: (projectId: string) => void;
}

interface TeamMemberStats {
  uid: string;
  displayName: string;
  photoURL: string | null;
  tasksByStatus: Record<TaskStatus, number>;
  totalTasks: number;
  overdueCount: number;
  estimatedHours: number;
  loggedHours: number;
}

const statusColors: Record<TaskStatus, { dot: string; bg: string; text: string }> = {
  todo: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-600' },
  in_progress: { dot: 'bg-blue-500', bg: 'bg-blue-100', text: 'text-blue-600' },
  in_review: { dot: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-600' },
  done: { dot: 'bg-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-600' },
};

const statusLabels: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const DashboardPane: React.FC<DashboardPaneProps> = ({
  projects,
  teamMembers,
  currentUserId,
  onTaskClick,
  onProjectClick,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Filter projects first if a project is selected
  const activeProjects = useMemo(() => {
    if (!selectedProjectId) return projects;
    return projects.filter(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Aggregate all tasks from filtered projects
  const allTasks = useMemo(() => {
    return activeProjects.flatMap(p =>
      (p.tasks || []).map(t => ({ ...t, projectId: p.id, projectName: p.projectName }))
    );
  }, [activeProjects]);

  // Aggregate all time entries from filtered projects
  const allTimeEntries = useMemo(() => {
    return activeProjects.flatMap(p => p.timeEntries || []);
  }, [activeProjects]);

  // Calculate stats for each team member
  const memberStats = useMemo(() => {
    const stats: TeamMemberStats[] = [];

    teamMembers.forEach(member => {
      const memberTasks = allTasks.filter(t => t.assigneeIds?.includes(member.uid));
      const memberTimeEntries = allTimeEntries.filter(te => te.userId === member.uid);

      const tasksByStatus: Record<TaskStatus, number> = {
        todo: 0,
        in_progress: 0,
        in_review: 0,
        done: 0,
      };

      let overdueCount = 0;
      let estimatedHours = 0;

      memberTasks.forEach(task => {
        tasksByStatus[task.status]++;
        if (task.dueDate && task.dueDate < Date.now() && task.status !== 'done') {
          overdueCount++;
        }
        if (task.estimatedHours) {
          estimatedHours += task.estimatedHours;
        }
      });

      const loggedHours = memberTimeEntries.reduce((sum, te) => sum + te.hours, 0);

      if (memberTasks.length > 0) {
        stats.push({
          uid: member.uid,
          displayName: member.displayName || member.email || 'Unknown',
          photoURL: member.photoURL,
          tasksByStatus,
          totalTasks: memberTasks.length,
          overdueCount,
          estimatedHours,
          loggedHours,
        });
      }
    });

    // Sort by total tasks descending
    return stats.sort((a, b) => b.totalTasks - a.totalTasks);
  }, [teamMembers, allTasks, allTimeEntries]);

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    const tasksToCount = selectedMemberId
      ? allTasks.filter(t => t.assigneeIds?.includes(selectedMemberId))
      : allTasks;

    const timeEntriesToCount = selectedMemberId
      ? allTimeEntries.filter(te => te.userId === selectedMemberId)
      : allTimeEntries;

    const totalTasks = tasksToCount.length;
    const inProgress = tasksToCount.filter(t => t.status === 'in_progress').length;
    const overdue = tasksToCount.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done').length;
    const estimatedHours = tasksToCount.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const loggedHours = timeEntriesToCount.reduce((sum, te) => sum + te.hours, 0);

    return { totalTasks, inProgress, overdue, estimatedHours, loggedHours };
  }, [allTasks, allTimeEntries, selectedMemberId]);

  // Filter tasks based on selected member
  const filteredTasks = useMemo(() => {
    let tasks = selectedMemberId
      ? allTasks.filter(t => t.assigneeIds?.includes(selectedMemberId))
      : allTasks;

    // Sort: overdue first, then by due date, then by status
    return tasks.sort((a, b) => {
      const aOverdue = a.dueDate && a.dueDate < Date.now() && a.status !== 'done';
      const bOverdue = b.dueDate && b.dueDate < Date.now() && b.status !== 'done';

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Done tasks go to the end
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;

      // Sort by due date
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return 0;
    });
  }, [allTasks, selectedMemberId]);

  const selectedMemberName = selectedMemberId
    ? memberStats.find(m => m.uid === selectedMemberId)?.displayName || 'Selected Member'
    : null;

  // Create project name lookup
  const projectNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach(p => { map[p.id] = p.projectName; });
    return map;
  }, [projects]);

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Projects Yet</h2>
          <p className="text-slate-500">Create a project and add tasks to see the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
      {/* Summary Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-slate-500" />
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="text-sm font-semibold text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-6"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectName}</option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-800">{aggregateStats.totalTasks}</span>
              <span className="text-slate-500">tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-bold text-slate-800">{aggregateStats.inProgress}</span>
              <span className="text-slate-500">in progress</span>
            </div>
            {aggregateStats.overdue > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold">{aggregateStats.overdue}</span>
                <span>overdue</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-800">{aggregateStats.loggedHours}h</span>
              <span className="text-slate-500">logged /</span>
              <span className="font-bold text-slate-800">{aggregateStats.estimatedHours}h</span>
              <span className="text-slate-500">estimated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Member Cards */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Team Workload</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* All Team Card */}
          <button
            onClick={() => setSelectedMemberId(null)}
            className={`shrink-0 w-40 sm:w-48 p-3 rounded-xl border-2 transition-all text-left ${
              selectedMemberId === null
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-sm">All Team</span>
            </div>
            <div className="text-xs text-slate-500">
              {allTasks.length} tasks{selectedProjectId ? '' : ` across ${projects.length} projects`}
            </div>
          </button>

          {/* Individual Member Cards */}
          {memberStats.map(member => {
            const isSelected = selectedMemberId === member.uid;
            const isCurrentUser = member.uid === currentUserId;
            const progressPercent = member.estimatedHours > 0
              ? Math.min(100, Math.round((member.loggedHours / member.estimatedHours) * 100))
              : 0;

            return (
              <button
                key={member.uid}
                onClick={() => setSelectedMemberId(isSelected ? null : member.uid)}
                className={`shrink-0 w-40 sm:w-48 p-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } ${isCurrentUser ? 'ring-2 ring-indigo-200 ring-offset-1' : ''}`}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt={member.displayName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">
                      {member.displayName}
                      {isCurrentUser && <span className="text-indigo-500 ml-1">(you)</span>}
                    </div>
                  </div>
                </div>

                {/* Task counts by status */}
                <div className="grid grid-cols-2 gap-1 text-[10px] mb-2">
                  {(['todo', 'in_progress', 'in_review', 'done'] as TaskStatus[]).map(status => (
                    <div key={status} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusColors[status].dot}`} />
                      <span className="text-slate-600">{member.tasksByStatus[status]} {statusLabels[status]}</span>
                    </div>
                  ))}
                </div>

                {/* Overdue warning */}
                {member.overdueCount > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-red-600 mb-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="font-bold">{member.overdueCount} overdue</span>
                  </div>
                )}

                {/* Hours progress */}
                <div className="text-[10px] text-slate-500 mb-1">
                  {member.loggedHours}h / {member.estimatedHours}h
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Filter indicator */}
        {(selectedMemberName || selectedProjectId) && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-600">
              Showing <span className="font-bold">{filteredTasks.length} tasks</span>
              {selectedMemberName && (
                <> for <span className="font-bold">{selectedMemberName}</span></>
              )}
              {selectedProjectId && (
                <> in <span className="font-bold">{projects.find(p => p.id === selectedProjectId)?.projectName}</span></>
              )}
            </span>
            <button
              onClick={() => { setSelectedMemberId(null); setSelectedProjectId(null); }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
            >
              Clear Filters <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No tasks found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Table Header - Desktop */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <div className="col-span-3">Task</div>
              <div className="col-span-2">Assignees</div>
              <div className="col-span-2">Project</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Due</div>
              <div className="col-span-1">Hours</div>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-slate-100">
              {filteredTasks.map(task => {
                const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'done';
                const isDueSoon = task.dueDate &&
                  task.dueDate > Date.now() &&
                  task.dueDate < Date.now() + 2 * 24 * 60 * 60 * 1000 &&
                  task.status !== 'done';
                const isDone = task.status === 'done';

                // Get assignee details from teamMembers
                const assignees = (task.assigneeIds || []).map((uid, idx) => {
                  const member = teamMembers.find(m => m.uid === uid);
                  return {
                    uid,
                    name: member?.displayName || task.assigneeNames?.[idx] || 'Unknown',
                    photo: member?.photoURL || task.assigneeAvatars?.[idx] || null,
                  };
                });

                return (
                  <div
                    key={`${task.projectId}-${task.id}`}
                    onClick={() => onTaskClick?.(task, task.projectId)}
                    className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 cursor-pointer transition-colors ${
                      isDone ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'
                    } ${isOverdue ? 'bg-red-50/50' : ''}`}
                  >
                    {/* Task Title */}
                    <div className="sm:col-span-3 flex items-start gap-2">
                      {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                      <span className={`font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </span>
                    </div>

                    {/* Assignees */}
                    <div className="sm:col-span-2 flex items-center">
                      {assignees.length === 0 ? (
                        <span className="text-xs text-slate-400">Unassigned</span>
                      ) : (
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {assignees.slice(0, 3).map((assignee) => (
                              assignee.photo ? (
                                <img
                                  key={assignee.uid}
                                  src={assignee.photo}
                                  alt={assignee.name}
                                  title={assignee.name}
                                  className="w-6 h-6 rounded-full border-2 border-white object-cover"
                                />
                              ) : (
                                <div
                                  key={assignee.uid}
                                  title={assignee.name}
                                  className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600"
                                >
                                  {assignee.name.charAt(0).toUpperCase()}
                                </div>
                              )
                            ))}
                            {assignees.length > 3 && (
                              <div
                                className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600"
                                title={assignees.slice(3).map(a => a.name).join(', ')}
                              >
                                +{assignees.length - 3}
                              </div>
                            )}
                          </div>
                          {assignees.length === 1 && (
                            <span className="ml-2 text-xs text-slate-600 truncate max-w-[80px]">
                              {assignees[0].name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Project */}
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <span className="text-xs sm:text-sm text-slate-600 truncate">
                        {(task as any).projectName || projectNameMap[task.projectId] || 'Unknown'}
                      </span>
                      {onProjectClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onProjectClick(task.projectId);
                          }}
                          className="text-slate-400 hover:text-indigo-500 p-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Status */}
                    <div className="sm:col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status].bg} ${statusColors[task.status].text}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${statusColors[task.status].dot}`} />
                        {statusLabels[task.status]}
                      </span>
                    </div>

                    {/* Due Date */}
                    <div className="sm:col-span-2">
                      {task.dueDate ? (
                        <span className={`text-xs sm:text-sm ${
                          isOverdue ? 'text-red-600 font-bold' :
                          isDueSoon ? 'text-amber-600 font-semibold' :
                          'text-slate-600'
                        }`}>
                          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No due date</span>
                      )}
                    </div>

                    {/* Hours */}
                    <div className="sm:col-span-1 text-xs text-slate-600">
                      {task.loggedHours > 0 && (
                        <span className="font-medium">{task.loggedHours}/</span>
                      )}
                      {task.estimatedHours ? (
                        <span>{task.estimatedHours}h</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPane;
