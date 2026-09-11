import { useState, type ReactNode, useEffect } from 'react';
import { Sidebar } from '../../shared/components/layout/Sidebar';
import { Header } from '../../shared/components/layout/Header';
import { MobileNav } from '../../shared/components/layout/MobileNav';

export interface DesktopShellProps {
  children?: ReactNode;
}

/**
 * Application shell — desktop: sticky sidebar + sticky header; mobile:
 * top bar + slide-in drawer + bottom navigation (self-contained in MobileNav).
 */
export function DesktopShell({ children }: DesktopShellProps) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024,
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <MobileNav>{children}</MobileNav>;
  }

  return (
    <div className="flex h-screen bg-surface-secondary">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
          <div className="max-w-[var(--max-content-width)] mx-auto px-[var(--content-padding-sm)] py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
