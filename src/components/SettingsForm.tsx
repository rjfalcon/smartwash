'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Settings {
  notifyEmails: string;
  parkName: string;
  appName: string;
  baseUrl: string;
  tuyaAutoOff: boolean;
  emailOnPayment: boolean;
}

interface Props {
  settings: Settings | null;
}

export default function SettingsForm({ settings }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Settings>({
    notifyEmails: settings?.notifyEmails ?? '',
    parkName: settings?.parkName ?? 'Ons Park',
    appName: settings?.appName ?? 'SmartWash',
    baseUrl: settings?.baseUrl ?? '',
    tuyaAutoOff: settings?.tuyaAutoOff ?? true,
    emailOnPayment: settings?.emailOnPayment ?? true,
  });
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function setField<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload: Record<string, unknown> = { ...form };

    if (newPin) {
      if (newPin !== confirmPin) {
        setError('PINs komen niet overeen');
        setSaving(false);
        return;
      }
      if (newPin.length < 4) {
        setError('PIN moet minimaal 4 cijfers zijn');
        setSaving(false);
        return;
      }
      payload.adminPin = newPin;
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { success: boolean; error?: string };

      if (data.success) {
        setMessage('Instellingen opgeslagen!');
        setNewPin('');
        setConfirmPin('');
        router.refresh();
      } else {
        setError(data.error ?? 'Opslaan mislukt');
      }
    } catch {
      setError('Verbindingsfout');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* General */}
      <Section title="Algemeen">
        <Field label="Parknaam" description="Wordt getoond op de gebruikerspagina">
          <input
            type="text"
            value={form.parkName}
            onChange={(e) => setField('parkName', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="App naam">
          <input
            type="text"
            value={form.appName}
            onChange={(e) => setField('appName', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Base URL" description="Volledige URL van je app (zonder slash aan het einde)">
          <input
            type="url"
            value={form.baseUrl}
            onChange={(e) => setField('baseUrl', e.target.value)}
            placeholder="https://wash.jouwpark.nl"
            className={inputClass}
          />
        </Field>
      </Section>

      {/* Notifications */}
      <Section title="E-mail notificaties">
        <Field label="Beheerder e-mailadressen" description="Kommagescheiden, ontvangt een melding bij elke betaling">
          <input
            type="text"
            value={form.notifyEmails}
            onChange={(e) => setField('notifyEmails', e.target.value)}
            placeholder="admin@park.nl, eigenaar@park.nl"
            className={inputClass}
          />
        </Field>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="emailOnPayment"
            checked={form.emailOnPayment}
            onChange={(e) => setField('emailOnPayment', e.target.checked)}
            className="w-4 h-4 rounded accent-sky-500"
          />
          <label htmlFor="emailOnPayment" className="text-sm text-slate-700">
            Stuur klant een bevestigingsmail bij geslaagde betaling (als ze een e-mailadres invullen)
          </label>
        </div>
      </Section>

      {/* Tuya */}
      <Section title="Tuya instellingen">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="tuyaAutoOff"
            checked={form.tuyaAutoOff}
            onChange={(e) => setField('tuyaAutoOff', e.target.checked)}
            className="w-4 h-4 rounded accent-sky-500"
          />
          <label htmlFor="tuyaAutoOff" className="text-sm text-slate-700">
            Schakel Tuya stekker automatisch uit na afloop van de sessie
          </label>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
          <p className="font-medium text-slate-700">SMTP en Tuya API instellingen</p>
          <p>Stel dit in via omgevingsvariabelen in je <code className="bg-slate-200 px-1 rounded">.env</code> bestand:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-xs mt-2">
            <li>TUYA_CLIENT_ID, TUYA_CLIENT_SECRET, TUYA_BASE_URL</li>
            <li>SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM</li>
            <li>MOLLIE_API_KEY</li>
          </ul>
        </div>
      </Section>

      {/* Security */}
      <Section title="Beveiliging">
        <Field label="Nieuwe PIN" description="Laat leeg om de huidige PIN te behouden">
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="Nieuwe PIN"
            maxLength={8}
            className={inputClass}
          />
        </Field>
        {newPin && (
          <Field label="PIN bevestigen">
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="PIN herhalen"
              maxLength={8}
              className={inputClass}
            />
          </Field>
        )}
      </Section>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm">
          ✅ {message}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
      >
        {saving ? 'Opslaan...' : 'Instellingen opslaan'}
      </button>
    </form>
  );
}

const inputClass =
  'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {description && <p className="text-xs text-slate-500 mb-1.5">{description}</p>}
      {children}
    </div>
  );
}
