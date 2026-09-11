import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface SectionProps extends HTMLAttributes<HTMLDivElement> {
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
}

const spacingClasses: Record<NonNullable<SectionProps['spacing']>, string> = {
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-16',
  xl: 'py-20',
};

export const Section = forwardRef(function Section(
  { className, spacing = 'md', centered = false, children, ...props }: SectionProps,
  _ref: any,
) {
  return (
    <section
      className={cn(
        'w-full',
        spacingClasses[spacing],
        centered && 'flex flex-col items-center',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
});
Section.displayName = 'Section';

export interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  centered?: boolean;
}

export const SectionHeader = forwardRef(function SectionHeader(
  { className, title, subtitle, eyebrow, centered = false, ...props }: SectionHeaderProps,
  _ref: any,
) {
  return (
    <div
      className={cn(
        'mb-10',
        centered && 'text-center',
        className,
      )}
      {...props}
    >
      {eyebrow && <p className="text-caption text-text-secondary font-medium uppercase tracking-wider mb-2">{eyebrow}</p>}
      <h2 className="h2 text-text-primary mb-3">{title}</h2>
      {subtitle && <p className="body text-text-secondary max-w-2xl">{subtitle}</p>}
    </div>
  );
});
SectionHeader.displayName = 'SectionHeader';
