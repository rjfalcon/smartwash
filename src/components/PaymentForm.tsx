'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentOption {
  id: string;
  label: string;
  duration: number;
  price: number;
}

interface Machine {
  id: string;
  name: string;
  type: string;
  options: PaymentOption[];
}

interface Props {
  machine: Machine;
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export default function PaymentForm({ machine }: Props) {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(
    machine.options[0] ?? null,
  );
  const [email, setEmail] = useState('');
  const [wantsEmail, setWantsEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const icon = machine.type === 'WASHER' ? '🫧' : '🌀';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOption) return;
    if (wantsEmail && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Voer een geldig e-mailadres in');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: machine.id,
          optionId: selectedOption.id,
          customerEmail: wantsEmail ? email : undefined,
        }),
      });

      const data = await response.json() as {
        success: boolean;
        data?: { checkoutUrl?: string };
        error?: string;
      };

      if (!data.success || !data.data?.checkoutUrl) {
        setError(data.error ?? 'Betaling aanmaken mislukt');
        return;
      }

      // Redirect to Mollie checkout
      router.push(data.data.checkoutUrl);
    } catch {
      setError('Verbindingsfout. Controleer je internet en probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      {/* Machine info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">{icon}</span>
          <h2 className="text-xl font-bold text-slate-800">{machine.name}</h2>
        </div>
        <p className="text-sm text-slate-500 ml-12">Kies een tijdsduur en betaal</p>
      </div>

      {/* Duration options */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
          Kies tijdsduur
        </h3>
        <div className="space-y-3">
          {machine.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedOption(option)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                selectedOption?.id === option.id
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedOption?.id === option.id
                      ? 'border-sky-500 bg-sky-500'
                      : 'border-slate-300'
                  }`}
                >
                  {selectedOption?.id === option.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-800">{option.label}</div>
                  <div className="text-xs text-slate-500">{option.duration} minuten</div>
                </div>
              </div>
              <div className="text-lg font-bold text-sky-600">
                {formatEur(option.price)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Optional email */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <label className="flex items-center gap-3 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={wantsEmail}
            onChange={(e) => setWantsEmail(e.target.checked)}
            className="w-4 h-4 rounded accent-sky-500"
          />
          <span className="text-sm text-slate-700 font-medium">
            Stuur mij een bevestiging + herinnering per e-mail
          </span>
        </label>

        {wantsEmail && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jouw@email.nl"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            required={wantsEmail}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Summary + Pay button */}
      {selectedOption && (
        <div className="bg-sky-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sky-100 text-sm">{machine.name}</p>
              <p className="font-semibold">{selectedOption.label}</p>
            </div>
            <p className="text-2xl font-bold">{formatEur(selectedOption.price)}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-sky-600 font-bold py-3.5 rounded-xl text-base hover:bg-sky-50 active:bg-sky-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Doorsturen naar betaling...' : `Betalen ${formatEur(selectedOption.price)}`}
          </button>

          <p className="text-center text-xs text-sky-200 mt-3">
            Veilig betalen via iDEAL, creditcard en meer
          </p>
        </div>
      )}
    </form>
  );
}
