import { Link } from 'react-router-dom';
import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: boolean;
}

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

export const Breadcrumb = forwardRef(function Breadcrumb(
  { className, items, ...props }: BreadcrumbProps,
  _ref: any,
) {
  return (
    <nav
      className={cn('flex items-center gap-1 text-caption', className)}
      aria-label="breadcrumb"
      {...props}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="w-3 h-3 text-text-tertiary rtl:-scale-x-100" />}
            {item.href ? (
              <Link
                to={item.href}
                className={cn(
                  'text-text-secondary hover:text-text-primary transition-colors',
                  'decoration-2 underline-offset-2 hover:underline',
                  index === items.length - 1 && 'text-text-primary font-medium',
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'text-text-secondary',
                  index === items.length - 1 && 'text-text-primary font-medium',
                )}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
});
Breadcrumb.displayName = 'Breadcrumb';
