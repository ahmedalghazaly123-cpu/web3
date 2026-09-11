import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CourseCoverProps {
  src?: string;
  alt: string;
  className?: string;
  /** Overlay content (badges, play buttons) positioned absolutely inside the cover */
  children?: React.ReactNode;
  /** Bottom gradient for legibility over cover art */
  overlay?: boolean;
}

/**
 * Course cover art with graceful fallback to a branded gradient.
 * Uses locally generated SVG covers (no network dependency).
 * Wrap parent with `group` to get the hover zoom effect.
 */
export function CourseCover({ src, alt, className, children, overlay = true }: CourseCoverProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('relative overflow-hidden bg-surface-tertiary', className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/10 via-transparent to-ai/10" aria-hidden="true">
          <BookOpen className="w-8 h-8 text-brand/30" />
        </div>
      )}
      {overlay && (
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" aria-hidden="true" />
      )}
      {children}
    </div>
  );
}
