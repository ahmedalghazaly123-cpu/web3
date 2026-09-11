import { type HTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '../../../shared/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | 'none';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  statusRing?: boolean;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-12 h-12 text-base',
  '2xl': 'w-16 h-16 text-xl',
};

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-success',
  offline: 'bg-text-disabled',
  away: 'bg-warning',
  busy: 'bg-error',
  none: 'hidden',
};

const statusSizeClasses: Record<AvatarSize, string> = {
  xs: 'w-1 h-1', sm: 'w-1.5 h-1.5', md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5', xl: 'w-3 h-3', '2xl': 'w-3.5 h-3.5',
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  { className, src, alt, name, size = 'md', status = 'none', statusRing, ...props }: AvatarProps,
  ref,
) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = name ? name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '';
  const showImage = src && !imgFailed;

  return (
    <div
      ref={ref}
      className={cn('relative inline-flex items-center justify-center rounded-full', sizeClasses[size], 'overflow-hidden', className)}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || ''}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-brand text-white font-semibold" aria-hidden="true">
          {initials || '?'}
        </div>
      )}
      {status !== 'none' && (
        <span
          className={cn(
            'absolute bottom-0 end-0 rounded-full border-2 border-surface',
            statusColors[status],
            statusSizeClasses[size],
            statusRing && 'ring-2 ring-surface',
          )}
        />
      )}
    </div>
  );
});
Avatar.displayName = 'Avatar';
