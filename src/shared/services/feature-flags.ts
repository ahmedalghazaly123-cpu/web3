// ━━━─ Feature Flag Service (runtime) ━━━─
// Owner/Admin can toggle flags. Frontend guards new features through this
// service, never through hardcoded booleans scattered across the app.

import type { FeatureFlag, FeatureFlagConfig, PlatformRole } from '@shared/domain';

const STORE_KEY = 'lp-feature-flags';

const DEFAULTS: FeatureFlagConfig[] = [
  { key: 'ai_gateway', enabled: true },
  { key: 'ai_safety', enabled: true },
  { key: 'ai_eval', enabled: true },
  { key: 'voice_ai', enabled: true },
  { key: 'adaptive_learning', enabled: true },
  { key: 'dynamic_paths', enabled: true },
  { key: 'spaced_repetition', enabled: true },
  { key: 'mistake_notebook', enabled: true },
  { key: 'prerequisite_checker', enabled: true },
  { key: 'semantic_search', enabled: true },
  { key: 'study_partner', enabled: true },
  { key: 'mind_map', enabled: true },
  { key: 'audio_to_notes', enabled: true },
  { key: 'micro_learning', enabled: true },
  { key: 'goal_to_mastery', enabled: true },
  { key: 'recovery_plan', enabled: true },
  { key: 'gamification', enabled: true },
  { key: 'study_rooms', enabled: true },
  { key: 'live_battles', enabled: true },
  { key: 'attention_tracker', enabled: true },
  { key: 'attention_camera', enabled: false },
  { key: 'pwa_offline', enabled: true },
  { key: 'certificates', enabled: true },
  { key: 'focus_mode', enabled: true },
  { key: 'smart_bookmarks', enabled: true },
  { key: 'peer_learning', enabled: true },
  { key: 'virtual_classroom', enabled: true },
  { key: 'team_challenges', enabled: true },
  { key: 'parent_dashboard', enabled: true },
  { key: 'ai_career', enabled: true },
  { key: 'code_sandbox', enabled: true },
  { key: 'learning_dna', enabled: true },
  { key: 'early_warning', enabled: true },
  { key: 'auto_recovery', enabled: true },
  { key: 'ai_content_gen', enabled: true },
  { key: 'teacher_copilot', enabled: true },
];

function readStored(): FeatureFlagConfig[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStored(value: FeatureFlagConfig[]) {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    // storage unavailable — ignore
  }
}

const storedDefaults = readStored();
const DEFAULT_MAP = {} as Record<FeatureFlag, FeatureFlagConfig>;
for (const d of DEFAULTS) {
  const override = storedDefaults.find((s) => s.key === d.key);
  DEFAULT_MAP[d.key] = override ?? d;
}

/** Runtime state. Reload from storage on cross-tab changes. */
let current = [...DEFAULTS.map((d) => DEFAULT_MAP[d.key])];

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORE_KEY) {
      const next = readStored();
      current = DEFAULTS.map((d) => {
        const override = next.find((s) => s.key === d.key);
        return (override ?? d) as FeatureFlagConfig;
      });
    }
  });
}

export const featureFlags = {
  get: (key: FeatureFlag): FeatureFlagConfig => current.find((c) => c.key === key) ?? DEFAULT_MAP[key] as FeatureFlagConfig,

  isEnabled: (
    key: FeatureFlag,
    role?: PlatformRole,
    env?: 'dev' | 'staging' | 'prod'
  ): boolean => {
    const cfg = current.find((c) => c.key === key) ?? (DEFAULT_MAP as Record<string, FeatureFlagConfig>)[key];
    if (!cfg || !cfg.enabled) return false;
    if (cfg.roles && role && !cfg.roles.includes(role)) return false;
    if (cfg.minEnv && env) {
      const order = ['dev', 'staging', 'prod'] as const;
      if (order.indexOf(env) < order.indexOf(cfg.minEnv)) return false;
    }
    return true;
  },

  /** Admin/Owner toggle. In production this goes through the backend. */
  toggle: (key: FeatureFlag, enabled: boolean, roles?: PlatformRole[]): FeatureFlagConfig | undefined => {
    const next = current.find((c) => c.key === key);
    if (!next) return undefined;
    const updated: FeatureFlagConfig = { ...next, enabled, roles: roles ?? next.roles };
    current = current.map((c) => (c.key === key ? updated : c));
    writeStored(current);
    return updated;
  },

  /** Snapshot for admin UI. */
  list: (): FeatureFlagConfig[] => current.slice(),

  /** Reset to defaults. */
  reset: (): FeatureFlagConfig[] => {
    const fresh = DEFAULTS.map((d) => ({ ...d }));
    current = fresh;
    writeStored([]);
    return fresh;
  },
};
