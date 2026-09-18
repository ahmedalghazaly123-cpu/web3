import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { api } from '../../../shared/services/api';
import { KeyRound } from 'lucide-react';

interface InviteCode {
  id: string;
  code: string;
  label: string | null;
  role: string;
  maxUses: number;
  uses: number;
  active: boolean;
  expiresAt: string | null;
  usable: boolean;
  createdAt: string;
}

interface AdminWithCode {
  id: string;
  email: string;
  name: string;
  inviteCode: { id: string; code: string; label: string | null } | null;
  securityCodeHash: string | null;
}

/**
 * Owner-only: issue / revoke the invite (=security) codes Admins must enter when
 * they sign up and on every sign-in. Backed by /api/v1/owner/invite-codes.
 */
export function InviteCodesCard() {
  const { t } = useTranslation('owner');
  const toast = useToast();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [admins, setAdmins] = useState<AdminWithCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.owner.inviteCodes() as { codes?: InviteCode[]; admins?: AdminWithCode[] };
      setCodes(res.codes ?? []);
      setAdmins(res.admins ?? []);
      setError('');
    } catch {
      setError(t('access.noCodes'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.owner.createInviteCode({
        ...(newCode.trim() ? { code: newCode.trim() } : {}),
        ...(newLabel.trim() ? { label: newLabel.trim() } : {}),
        maxUses: Number(maxUses) || 0,
      }) as { invite?: InviteCode };
      setNewCode(''); setNewLabel(''); setMaxUses('1');
      await load();
      toast({ variant: 'success', title: t('access.create'), description: res.invite?.code });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast({ variant: 'error', title: /code-taken/i.test(msg) ? t('access.codeTaken') : t('access.create') });
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (code: InviteCode) => {
    setBusy(true);
    try {
      await api.owner.updateInviteCode(code.id, { active: !code.active });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (code: InviteCode) => {
    setBusy(true);
    try {
      await api.owner.deleteInviteCode(code.id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ variant: 'success', title: t('access.copied'), description: code });
    } catch {
      toast({ variant: 'info', title: t('access.copy'), description: code });
    }
  };

  const stateOf = (c: InviteCode) =>
    !c.active ? t('access.disabled')
      : c.expiresAt && new Date(c.expiresAt).getTime() < Date.now() ? t('access.expired')
      : c.maxUses > 0 && c.uses >= c.maxUses ? t('access.exhausted')
      : t('access.usable');

  return (
    <Card variant="outlined" padding="md" className="space-y-4">
      <div className="flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-text-primary">{t('access.inviteCodes')}</p>
          <p className="text-caption text-text-secondary">{t('access.inviteCodesDesc')}</p>
        </div>
      </div>

      <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <Input label={t('access.codeLabel')} value={newCode} onChange={(e) => setNewCode(e.target.value)}
          placeholder="Ahmed" autoComplete="off" />
        <Input label={t('access.codeLabelPh')} value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
          autoComplete="off" />
        <Input label={t('access.maxUses')} type="number" min={0} value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)} />
        <Button type="submit" variant="warning" isLoading={busy}>{t('access.create')}</Button>
      </form>

      {error && <p role="alert" className="text-sm text-error">{error}</p>}

      {loading ? (
        <p className="text-sm text-text-secondary">{t('access.newCode')}…</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('access.noCodes')}</p>
      ) : (
        <ul className="space-y-2">
          {codes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-border p-3">
              <code className="font-mono text-sm font-semibold text-text-primary">{c.code}</code>
              <Badge variant={c.usable ? 'success' : 'outline'} size="sm">{stateOf(c)}</Badge>
              {c.label && <span className="text-caption text-text-tertiary">{c.label}</span>}
              <span className="text-caption text-text-secondary ms-auto">
                {t('access.uses')}: {c.uses}/{c.maxUses === 0 ? t('access.unlimited') : c.maxUses}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => copy(c.code)}>{t('access.copy')}</Button>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => toggleActive(c)}>
                {c.active ? t('access.deactivate') : t('access.activate')}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => remove(c)}>
                {t('access.deleteCode')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <p className="text-sm font-semibold text-text-primary">{t('access.adminsTitle')}</p>
        <p className="text-caption text-text-secondary mb-2">{t('access.adminsDesc')}</p>
        {admins.length === 0 ? (
          <p className="text-caption text-text-tertiary">{t('access.emptyDesc')}</p>
        ) : (
          <ul className="space-y-1.5">
            {admins.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-text-primary">{a.name}</span>
                <span className="text-caption text-text-tertiary">{a.email}</span>
                <Badge variant={a.inviteCode ? 'info' : 'outline'} size="sm">
                  {a.inviteCode ? `${t('access.boundCode')}: ${a.inviteCode.code}` : t('access.legacyNoCode')}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export default InviteCodesCard;