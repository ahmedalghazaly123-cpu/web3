import { type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { type LucideProps } from 'lucide-react';

/**
 * A direction-aware icon that mirrors itself for directional icons
 * (back, forward, arrows) when in RTL mode.
 *
 * Semantic and media icons (play/pause, search, settings) are NOT mirrored.
 */
const directionalIcons = new Set([
  'ArrowLeft', 'ArrowRight', 'ChevronLeft', 'ChevronRight',
  'ArrowUpLeft', 'ArrowUpRight', 'ArrowDownLeft', 'ArrowDownRight',
  'CornerLeftUp', 'CornerLeftDown', 'CornerRightUp', 'CornerRightDown',
  'Shuffle', 'SkipBack', 'SkipForward',
  'CornerUpLeft', 'CornerUpRight', 'CornerDownLeft', 'CornerDownRight',
]);

export function isDirectionalIcon(iconName: string): boolean {
  return directionalIcons.has(iconName);
}

export type DirectionAwareIconProps = {
  icon: ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>;
  className?: string;
  alt?: boolean; // force no mirroring
  'aria-label'?: string;
};

export function DirectionAwareIcon({ icon: Icon, className, alt, 'aria-label': ariaLabel }: DirectionAwareIconProps) {
  const { i18n } = useTranslation();
  const iconName = (Icon as { displayName?: string }).displayName || '';
  const shouldMirror = !alt && isDirectionalIcon(iconName) && i18n.dir() === 'rtl';
  return (
    <Icon
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      style={shouldMirror ? { transform: 'scaleX(-1)' } : undefined}
    />
  );
}

// Re-export commonly used icons for convenience
export {
  BrainCircuit,
  ChevronLeft, ChevronRight,
  ArrowLeft, ArrowRight,
  Home, Search, Settings, Bell, User, HelpCircle,
  Calendar, Clock, BookOpen, BarChart3,
  Play, Pause, SkipForward, SkipBack,
  Check, X, AlertCircle, Info,
  Plus, Minus, Edit, Trash2, Save,
  Menu, MoreVertical, MoreHorizontal,
  TrendingUp, Activity, Shield, Key, Flag,
  Users, Building, CreditCard, FileText, ClipboardEdit,
  LayoutDashboard, CalendarClock, ClipboardCheck,
} from 'lucide-react';
