import React, { useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { TimeEntry } from '../types';

interface TimeLogFormProps {
  taskId: string;
  timeEntries: TimeEntry[];
  totalLoggedHours: number;
  onLogTime: (taskId: string, hours: number, description: string) => void;
  onDeleteEntry: (entryId: string) => void;
  isReadOnly: boolean;
}

const TimeLogForm: React.FC<TimeLogFormProps> = ({
  taskId,
  timeEntries,
  totalLoggedHours,
  onLogTime,
  onDeleteEntry,
  isReadOnly,
}) => {
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours || parseFloat(hours) <= 0) return;

    onLogTime(taskId, parseFloat(hours), description.trim());
    setHours('');
    setDescription('');
  };

  const taskEntries = timeEntries.filter(e => e.taskId === taskId);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-sm text-slate-700">Time Tracking</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-indigo-600">{totalLoggedHours}h logged</span>
          <span className="text-slate-400">{isExpanded ? '−' : '+'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Log Time Form */}
          {!isReadOnly && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="number"
                value={hours}
                onChange={e => setHours(e.target.value)}
                min="0.25"
                step="0.25"
                placeholder="Hours"
                className="w-20 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What did you work on?"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!hours || parseFloat(hours) <= 0}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Time Entries List */}
          {taskEntries.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {taskEntries
                .sort((a, b) => b.loggedAt - a.loggedAt)
                .map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg group"
                  >
                    {entry.userAvatar ? (
                      <img
                        src={entry.userAvatar}
                        alt={entry.userName}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {entry.userName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-indigo-600">{entry.hours}h</span>
                        <span className="text-xs text-slate-400">
                          by {entry.userName} • {new Date(entry.loggedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-slate-600 truncate">{entry.description}</p>
                      )}
                    </div>
                    {!isReadOnly && (
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">No time logged yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeLogForm;
