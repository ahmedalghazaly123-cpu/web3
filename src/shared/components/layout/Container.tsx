import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | '8xl' | 'full' | 'screen';
  padding?: boolean;
}

const maxWidthClasses: Record<NonNullable<ContainerProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  '8xl': 'max-w-8xl',
  full: 'max-w-full',
  screen: 'max-w-screen-2xl',
};

export const Container = forwardRef(function Container(
  { className, maxWidth = '7xl', padding = true, children, ...props }: ContainerProps,
  _ref: any,
) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        padding && 'px-[--content-padding-sm]]',
        className,
      )}
      style={{
        '--content-padding-sm': '1.5rem',
      } as any}
      {...props}
    >
      {children}
    </div>
  );
});
Container.displayName = 'Container';
