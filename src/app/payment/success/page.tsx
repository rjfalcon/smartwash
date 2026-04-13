'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

interface PaymentData {
  id: string;
  status: string;
  machine: { name: string; type: string };
  amount: number;
  duration: number;
  optionLabel: string;
  startedAt: string | null;
  endsAt: string | null;
  secondsRemaining: number | null;
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('nl-NL', {
    timeStyle: 'short',
    dateStyle: 'long',
    timeZone: 'Europe/Amsterdam',
  });
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentRef = searchParams.get('ref');

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const fetchStatus = useCallback(async () => {
    if (!paymentRef) return;

    try {
      const res = await fetch(`/api/payment/status/${paymentRef}`);
      const data = await res.json() as { success: boolean; data?: PaymentData; error?: string };

      if (!data.success) {
        setError(data.error ?? 'Betaling niet gevonden');
        return;
      }

      setPayment(data.data ?? null);
      if (data.data?.secondsRemaining !== null && data.data?.secondsRemaining !== undefined) {
        setSecondsLeft(data.data.secondsRemaining);
      }
    } catch {
      setError('Verbindingsfout');
    } finally {
      setLoading(false);
    }
  }, [paymentRef]);

  // Poll payment status until it's ACTIVE
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (payment?.status === 'ACTIVE' || payment?.status === 'COMPLETED') return;
    if (pollCount >= 20) return; // Stop after 20 polls (~40 seconds)

    const timeout = setTimeout(() => {
      fetchStatus();
      setPollCount((c) => c + 1);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [payment, pollCount, fetchStatus]);

  // Live countdown
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((s) => (s !== null ? Math.max(0, s - 1) : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  if (!paymentRef) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-slate-600">Geen betalingsreferentie gevonden</p>
        <Link href="/" className="text-sky-500 underline mt-4 block">Terug naar home</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Betaling controleren...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-slate-600 mb-4">{error}</p>
        <Link href="/" className="text-sky-500 underline">Terug naar home</Link>
      </div>
    );
  }

  if (!payment) return null;

  const icon = payment.machine.type === 'WASHER' ? '🫧' : '🌀';

  const isPending = payment.status === 'PENDING';
  const isActive = payment.status === 'ACTIVE';
  const isPaid = payment.status === 'PAID'; // paid but Tuya failed
  const isCompleted = payment.status === 'COMPLETED';
  const isFailed = payment.status === 'FAILED' || payment.status === 'CANCELLED' || payment.status === 'EXPIRED';

  if (isFailed) {
    return (
      <div className="text-center animate-fade-in">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-red-700 mb-2">Betaling mislukt</h2>
        <p className="text-slate-500 mb-6">De betaling is niet geslaagd of geannuleerd.</p>
        <Link
          href={`/machine/${payment.id}`}
          className="bg-sky-500 text-white px-6 py-3 rounded-xl font-semibold inline-block"
        >
          Opnieuw proberen
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Status header */}
      {isActive && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-2xl font-bold text-green-800">Betaling geslaagd!</h2>
          <p className="text-green-600 mt-1">
            {icon} {payment.machine.name} is ingeschakeld
          </p>
        </div>
      )}

      {isPending && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 text-center">
          <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-xl font-bold text-yellow-800">Betaling verwerken...</h2>
          <p className="text-yellow-600 mt-1 text-sm">Even geduld, we controleren je betaling</p>
        </div>
      )}

      {(isPaid || isCompleted) && (
        <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">{isCompleted ? '✅' : '⚡'}</div>
          <h2 className="text-2xl font-bold text-sky-800">
            {isCompleted ? 'Sessie voltooid' : 'Betaling ontvangen'}
          </h2>
        </div>
      )}

      {/* Countdown timer */}
      {isActive && secondsLeft !== null && secondsLeft > 0 && (
        <div className={`rounded-2xl p-5 text-center ${
          secondsLeft <= 300
            ? 'bg-orange-50 border-2 border-orange-300'
            : 'bg-sky-50 border-2 border-sky-200'
        }`}>
          <p className={`text-sm mb-1 ${secondsLeft <= 300 ? 'text-orange-600' : 'text-sky-600'}`}>
            {secondsLeft <= 300 ? '⚠️ Machine stopt over' : 'Machine stopt over'}
          </p>
          <div className={`text-5xl font-bold font-mono ${
            secondsLeft <= 300 ? 'text-orange-700' : 'text-sky-700'
          }`}>
            {formatTime(secondsLeft)}
          </div>
          {payment.endsAt && (
            <p className="text-xs text-slate-500 mt-2">
              Stopt om {new Date(payment.endsAt).toLocaleTimeString('nl-NL', { timeStyle: 'short' })}
            </p>
          )}
        </div>
      )}

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm">Betalingsdetails</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <DetailRow label="Machine" value={`${icon} ${payment.machine.name}`} />
          <DetailRow label="Programma" value={payment.optionLabel} />
          <DetailRow label="Bedrag" value={formatEur(payment.amount)} />
          {payment.startedAt && (
            <DetailRow label="Gestart om" value={formatDateTime(payment.startedAt)} />
          )}
          {payment.endsAt && isActive && (
            <DetailRow label="Stopt om" value={formatDateTime(payment.endsAt)} />
          )}
          <DetailRow
            label="Status"
            value={
              isActive
                ? '🟢 Actief'
                : isPending
                ? '🟡 Verwerken'
                : isCompleted
                ? '✅ Voltooid'
                : '—'
            }
          />
        </div>
      </div>

      <Link
        href="/"
        className="block text-center text-slate-500 text-sm hover:text-slate-700 py-2"
      >
        ← Terug naar overzicht
      </Link>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-5 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-sky-600">SmartWash</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6">
        <Suspense fallback={
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </div>
    </main>
  );
}
