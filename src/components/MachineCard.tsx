'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Machine, ActiveSession } from '@/types';

interface Props {
  machine: Machine & { currentSession: ActiveSession | null };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export default function MachineCard({ machine }: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number>(
    machine.currentSession?.secondsRemaining ?? 0,
  );
  const isActive = machine.currentSession !== null && secondsLeft > 0;

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const icon = machine.type === 'WASHER' ? '🫧' : '🌀';
  const lowestPrice = machine.options[0]?.price;

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-md transition-all ${
        isActive
          ? 'border-2 border-orange-300 bg-white'
          : 'border border-slate-200 bg-white hover:shadow-lg'
      }`}
    >
      {/* Status bar */}
      <div
        className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 ${
          isActive
            ? 'bg-orange-50 text-orange-700'
            : 'bg-green-50 text-green-700'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-orange-500 animate-pulse' : 'bg-green-500'
          }`}
        />
        {isActive ? 'In gebruik' : 'Beschikbaar'}
        {isActive && secondsLeft <= 300 && (
          <span className="ml-auto text-orange-600 font-bold text-xs">
            ⚠️ Bijna klaar!
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{icon}</span>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {machine.name}
              </h3>
              {machine.description && (
                <p className="text-sm text-slate-500">{machine.description}</p>
              )}
            </div>
          </div>
        </div>

        {isActive ? (
          <div className="bg-orange-50 rounded-xl p-4 text-center mb-4">
            <p className="text-xs text-orange-600 mb-1">Stopt over</p>
            <div className="text-3xl font-bold text-orange-700 font-mono">
              {formatTime(secondsLeft)}
            </div>
            <p className="text-xs text-orange-500 mt-1">
              Haal je was op tijd op!
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">Beschikbare opties:</p>
            <div className="flex flex-wrap gap-2">
              {machine.options.slice(0, 3).map((opt) => (
                <span
                  key={opt.id}
                  className="bg-sky-50 text-sky-700 text-xs font-medium px-3 py-1.5 rounded-full border border-sky-200"
                >
                  {opt.label} — {formatEur(opt.price)}
                </span>
              ))}
            </div>
          </div>
        )}

        {!isActive && (
          <Link
            href={`/machine/${machine.id}`}
            className="block w-full text-center bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
          >
            {lowestPrice ? `Starten vanaf ${formatEur(lowestPrice)}` : 'Starten'}
          </Link>
        )}

        {isActive && (
          <p className="text-center text-sm text-slate-500">
            Machine is momenteel in gebruik
          </p>
        )}
      </div>
    </div>
  );
}
