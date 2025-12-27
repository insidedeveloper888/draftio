import React, { useState } from 'react';
import { MessageSquare, Send, Trash2, Edit2, X, Check } from 'lucide-react';
import { TaskComment } from '../types';

interface CommentThreadProps {
  taskId: string;
  comments: TaskComment[];
  currentUserId: string;
  onAddComment: (taskId: string, content: string) => void;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  isReadOnly: boolean;
}

const CommentThread: React.FC<CommentThreadProps> = ({
  taskId,
  comments,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  isReadOnly,
}) => {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const taskComments = comments
    .filter(c => c.taskId === taskId)
    .sort((a, b) => a.createdAt - b.createdAt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    onAddComment(taskId, newComment.trim());
    setNewComment('');
  };

  const startEditing = (comment: TaskComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = () => {
    if (!editContent.trim() || !editingId) return;
    onEditComment(editingId, editContent.trim());
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-sm text-slate-700">Comments</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{taskComments.length}</span>
          <span className="text-slate-400">{isExpanded ? '−' : '+'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Comments List */}
          {taskComments.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {taskComments.map(comment => (
                <div key={comment.id} className="flex gap-3 group">
                  {comment.userAvatar ? (
                    <img
                      src={comment.userAvatar}
                      alt={comment.userName}
                      className="w-8 h-8 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {comment.userName?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-700">
                        {comment.userName}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(comment.createdAt).toLocaleString()}
                        {comment.updatedAt && ' (edited)'}
                      </span>
                    </div>

                    {editingId === comment.id ? (
                      <div className="flex gap-2">
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={saveEdit}
                            className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    )}
                  </div>

                  {/* Actions - only for own comments */}
                  {!isReadOnly && comment.userId === currentUserId && editingId !== comment.id && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 transition-opacity">
                      <button
                        onClick={() => startEditing(comment)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">No comments yet</p>
          )}

          {/* Add Comment Form */}
          {!isReadOnly && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-3 self-end py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
