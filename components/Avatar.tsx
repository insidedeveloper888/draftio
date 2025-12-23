
import React, { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  size?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  photoURL,
  displayName,
  size = 7,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);

  // Generate initials from display name
  const getInitials = (name?: string | null): string => {
    if (!name || name.trim() === '') return 'U';

    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  };

  // Generate consistent color based on name hash
  const getColorFromName = (name?: string | null): string => {
    const colors = [
      'bg-indigo-600',
      'bg-blue-600',
      'bg-emerald-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-purple-600',
      'bg-cyan-600',
      'bg-pink-600',
    ];

    if (!name) return colors[0];

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const initials = getInitials(displayName);
  const bgColor = getColorFromName(displayName);
  const sizeClass = `w-${size} h-${size}`;

  // If we have a valid photo URL and no error, show the image
  if (photoURL && !imageError) {
    return (
      <img
        src={photoURL}
        alt={displayName || 'User'}
        className={`${sizeClass} rounded-full ${className}`}
        onError={() => setImageError(true)}
        title={displayName || 'User'}
      />
    );
  }

  // Otherwise, show initials fallback
  return (
    <div
      className={`${sizeClass} rounded-full ${bgColor} flex items-center justify-center text-white font-bold text-xs ${className}`}
      title={displayName || 'User'}
    >
      {initials}
    </div>
  );
};

export default Avatar;
