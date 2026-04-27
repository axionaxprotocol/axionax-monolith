import React from 'react';

// ============ Badge ============

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

const badgeVariants = {
  default: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const badgeSizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

const dotColors = {
  default: 'bg-gray-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
      inline-flex items-center gap-1.5 font-medium rounded-full
      ${badgeVariants[variant]}
      ${badgeSizes[size]}
      ${className}
    `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

// ============ Avatar ============

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusColors = {
  online: 'bg-green-400',
  offline: 'bg-gray-400',
  busy: 'bg-red-400',
  away: 'bg-yellow-400',
};

export function Avatar({ src, alt, name, size = 'md', status, className = '' }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className={`relative inline-block ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={`${avatarSizes[size]} rounded-full object-cover ring-2 ring-white dark:ring-slate-900`}
        />
      ) : (
        <div
          className={`
          ${avatarSizes[size]} 
          rounded-full 
          flex items-center justify-center 
          bg-blue-500 text-white font-medium
          ring-2 ring-white dark:ring-slate-900
        `}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={`
          absolute bottom-0 right-0 
          w-3 h-3 rounded-full 
          ${statusColors[status]}
          ring-2 ring-white dark:ring-slate-900
        `}
        />
      )}
    </div>
  );
}

// ============ Avatar Group ============

export interface AvatarGroupProps {
  avatars: Array<{ src?: string; name?: string }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarGroup({ avatars, max = 4, size = 'md', className = '' }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visible.map((avatar, i) => (
        <Avatar key={i} {...avatar} size={size} />
      ))}
      {remaining > 0 && (
        <div
          className={`
          ${avatarSizes[size]} 
          rounded-full 
          flex items-center justify-center 
          bg-gray-200 dark:bg-slate-700 
          text-gray-600 dark:text-gray-400
          font-medium
          ring-2 ring-white dark:ring-slate-900
        `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

// ============ Tooltip ============

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const tooltipPositions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
  return (
    <div className={`relative inline-block group ${className}`}>
      {children}
      <div
        className={`
        absolute ${tooltipPositions[position]}
        px-2 py-1 
        bg-gray-900 dark:bg-slate-700 
        text-white text-xs
        rounded shadow-lg
        opacity-0 invisible
        group-hover:opacity-100 group-hover:visible
        transition-all duration-200
        whitespace-nowrap
        z-50
      `}
      >
        {content}
      </div>
    </div>
  );
}

// ============ Divider ============

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children?: React.ReactNode;
}

export function Divider({ orientation = 'horizontal', className = '', children }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={`w-px bg-gray-200 dark:bg-slate-700 self-stretch ${className}`} />;
  }

  if (children) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
        <span className="px-3 text-sm text-gray-500 dark:text-gray-400">{children}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
      </div>
    );
  }

  return <hr className={`border-gray-200 dark:border-slate-700 ${className}`} />;
}
