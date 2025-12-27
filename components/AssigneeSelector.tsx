import React, { useState, useRef, useEffect } from 'react';
import { Users, X, Check, ChevronDown } from 'lucide-react';
import { TeamMember } from '../types';

interface AssigneeSelectorProps {
  teamMembers: TeamMember[];
  selectedIds: string[];
  onChange: (ids: string[], names: string[], avatars: (string | null)[]) => void;
  isReadOnly: boolean;
}

const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({
  teamMembers,
  selectedIds,
  onChange,
  isReadOnly,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredMembers = teamMembers.filter(m =>
    m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMembers = teamMembers.filter(m => selectedIds.includes(m.uid));

  const toggleMember = (member: TeamMember) => {
    if (isReadOnly) return;

    const isSelected = selectedIds.includes(member.uid);
    let newIds: string[];
    let newNames: string[];
    let newAvatars: (string | null)[];

    if (isSelected) {
      // Remove
      const index = selectedIds.indexOf(member.uid);
      newIds = selectedIds.filter((_, i) => i !== index);
      newNames = selectedMembers.filter(m => m.uid !== member.uid).map(m => m.displayName || 'Unknown');
      newAvatars = selectedMembers.filter(m => m.uid !== member.uid).map(m => m.photoURL);
    } else {
      // Add
      const newSelectedMembers = [...selectedMembers, member];
      newIds = [...selectedIds, member.uid];
      newNames = newSelectedMembers.map(m => m.displayName || 'Unknown');
      newAvatars = newSelectedMembers.map(m => m.photoURL);
    }

    onChange(newIds, newNames, newAvatars);
  };

  const removeAssignee = (uid: string) => {
    if (isReadOnly) return;
    const remaining = selectedMembers.filter(m => m.uid !== uid);
    onChange(
      remaining.map(m => m.uid),
      remaining.map(m => m.displayName || 'Unknown'),
      remaining.map(m => m.photoURL)
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
        <Users className="w-3 h-3 inline mr-1" />
        Assignees
      </label>

      {/* Selected Assignees */}
      <div className="min-h-[42px] p-2 border border-slate-200 rounded-lg bg-white">
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map(member => (
            <div
              key={member.uid}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 bg-indigo-50 border border-indigo-200 rounded-full"
            >
              {member.photoURL ? (
                <img
                  src={member.photoURL}
                  alt={member.displayName || ''}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-300 flex items-center justify-center text-[10px] font-bold text-white">
                  {member.displayName?.charAt(0) || '?'}
                </div>
              )}
              <span className="text-xs font-semibold text-indigo-700 max-w-[100px] truncate">
                {member.displayName || member.email || 'Unknown'}
              </span>
              {!isReadOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAssignee(member.uid);
                  }}
                  className="p-0.5 text-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add Button */}
          {!isReadOnly && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            >
              <Users className="w-3 h-3" />
              {selectedMembers.length === 0 ? 'Add assignee' : 'Add'}
              <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}

          {isReadOnly && selectedMembers.length === 0 && (
            <span className="text-xs text-slate-400 py-1">No assignees</span>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !isReadOnly && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {/* Members List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => {
                const isSelected = selectedIds.includes(member.uid);
                return (
                  <button
                    key={member.uid}
                    onClick={() => toggleMember(member)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-indigo-50' : ''
                    }`}
                  >
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName || ''}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-sm font-bold text-slate-600">
                        {member.displayName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        {member.displayName || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {member.email}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                {search ? 'No members found' : 'No team members yet'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssigneeSelector;
