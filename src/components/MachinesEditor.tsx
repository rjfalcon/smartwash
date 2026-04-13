'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentOption {
  id: string;
  label: string;
  duration: number;
  price: number;
  isActive: boolean;
  sortOrder: number;
}

interface Machine {
  id: string;
  name: string;
  type: string;
  tuyaDeviceId: string;
  description: string;
  isActive: boolean;
  options: PaymentOption[];
}

interface Props {
  machines: Machine[];
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function MachinesEditor({ machines }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [editingMachine, setEditingMachine] = useState<string | null>(null);
  const [machineData, setMachineData] = useState<Record<string, Partial<Machine>>>({});
  const [newOption, setNewOption] = useState<Record<string, { label: string; duration: string; price: string }>>({});
  const [message, setMessage] = useState('');

  function getMachineEdit(id: string, machine: Machine): Partial<Machine> {
    return machineData[id] ?? {
      name: machine.name,
      tuyaDeviceId: machine.tuyaDeviceId,
      description: machine.description,
    };
  }

  async function saveMachine(machine: Machine) {
    setSaving(machine.id);
    const data = getMachineEdit(machine.id, machine);

    try {
      const res = await fetch('/api/admin/machines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: machine.id, ...data }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        setMessage('Machine opgeslagen!');
        setEditingMachine(null);
        router.refresh();
      } else {
        setMessage(json.error ?? 'Opslaan mislukt');
      }
    } catch {
      setMessage('Verbindingsfout');
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function addOption(machineId: string) {
    const opt = newOption[machineId];
    if (!opt?.label || !opt.duration || !opt.price) return;

    setSaving(`option-${machineId}`);
    try {
      const res = await fetch('/api/admin/machines/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          label: opt.label,
          duration: parseInt(opt.duration),
          price: parseFloat(opt.price),
        }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        setNewOption((p) => ({ ...p, [machineId]: { label: '', duration: '', price: '' } }));
        setMessage('Optie toegevoegd!');
        router.refresh();
      } else {
        setMessage(json.error ?? 'Mislukt');
      }
    } catch {
      setMessage('Verbindingsfout');
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function toggleOption(optionId: string, isActive: boolean) {
    await fetch('/api/admin/machines/options', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: optionId, isActive }),
    });
    router.refresh();
  }

  async function deleteOption(optionId: string) {
    if (!confirm('Optie verwijderen?')) return;
    await fetch('/api/admin/machines/options', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: optionId }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-sm">
          {message}
        </div>
      )}

      {machines.map((machine) => {
        const icon = machine.type === 'WASHER' ? '🫧' : '🌀';
        const isEditing = editingMachine === machine.id;
        const editData = getMachineEdit(machine.id, machine);
        const optNew = newOption[machine.id] ?? { label: '', duration: '', price: '' };

        return (
          <div key={machine.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Machine header */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{icon}</span>
                <h3 className="font-bold text-slate-800">{machine.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${machine.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {machine.isActive ? 'Actief' : 'Inactief'}
                </span>
              </div>
              <button
                onClick={() => setEditingMachine(isEditing ? null : machine.id)}
                className="text-sm text-sky-600 hover:text-sky-800"
              >
                {isEditing ? 'Annuleren' : 'Bewerken'}
              </button>
            </div>

            {/* Machine edit form */}
            {isEditing && (
              <div className="p-5 border-b border-slate-100 bg-sky-50/50 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Naam</label>
                  <input
                    type="text"
                    value={editData.name ?? machine.name}
                    onChange={(e) => setMachineData((p) => ({ ...p, [machine.id]: { ...getMachineEdit(machine.id, machine), name: e.target.value } }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tuya Device ID
                    <span className="ml-1 text-slate-400 font-normal">(vind je in de Tuya Developer Console)</span>
                  </label>
                  <input
                    type="text"
                    value={editData.tuyaDeviceId ?? machine.tuyaDeviceId}
                    onChange={(e) => setMachineData((p) => ({ ...p, [machine.id]: { ...getMachineEdit(machine.id, machine), tuyaDeviceId: e.target.value } }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Omschrijving</label>
                  <input
                    type="text"
                    value={editData.description ?? machine.description}
                    onChange={(e) => setMachineData((p) => ({ ...p, [machine.id]: { ...getMachineEdit(machine.id, machine), description: e.target.value } }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <button
                  onClick={() => saveMachine(machine)}
                  disabled={saving === machine.id}
                  className="bg-sky-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-sky-600 disabled:opacity-50"
                >
                  {saving === machine.id ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            )}

            {/* Payment options */}
            <div className="p-5">
              <h4 className="text-sm font-semibold text-slate-600 mb-3">Betaalopties</h4>
              <div className="space-y-2">
                {machine.options.map((opt) => (
                  <div key={opt.id} className={`flex items-center justify-between p-3 rounded-lg border ${opt.isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                    <div>
                      <span className="font-medium text-slate-800 text-sm">{opt.label}</span>
                      <span className="text-slate-400 text-xs ml-2">{opt.duration} min</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sky-600 text-sm">{formatEur(opt.price)}</span>
                      <button
                        onClick={() => toggleOption(opt.id, !opt.isActive)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        {opt.isActive ? 'Uitzetten' : 'Aanzetten'}
                      </button>
                      <button
                        onClick={() => deleteOption(opt.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new option */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-600 mb-2">Nieuwe optie toevoegen</p>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Label (bijv. 45 minuten)"
                    value={optNew.label}
                    onChange={(e) => setNewOption((p) => ({ ...p, [machine.id]: { ...optNew, label: e.target.value } }))}
                    className="flex-1 min-w-[140px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <input
                    type="number"
                    placeholder="Minuten"
                    value={optNew.duration}
                    onChange={(e) => setNewOption((p) => ({ ...p, [machine.id]: { ...optNew, duration: e.target.value } }))}
                    className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <input
                    type="number"
                    placeholder="Prijs €"
                    step="0.50"
                    value={optNew.price}
                    onChange={(e) => setNewOption((p) => ({ ...p, [machine.id]: { ...optNew, price: e.target.value } }))}
                    className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    onClick={() => addOption(machine.id)}
                    disabled={saving === `option-${machine.id}` || !optNew.label || !optNew.duration || !optNew.price}
                    className="bg-green-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    + Toevoegen
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
