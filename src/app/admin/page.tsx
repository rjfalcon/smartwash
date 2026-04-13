import { db } from '@/lib/db';
import { getActiveSession } from '@/lib/session';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import Link from 'next/link';

export const revalidate = 0;

function formatEur(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Amsterdam',
  });
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'In behandeling', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Betaald', color: 'bg-blue-100 text-blue-800' },
  ACTIVE: { label: 'Actief', color: 'bg-green-100 text-green-800' },
  COMPLETED: { label: 'Voltooid', color: 'bg-slate-100 text-slate-600' },
  FAILED: { label: 'Mislukt', color: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Verlopen', color: 'bg-orange-100 text-orange-700' },
  CANCELLED: { label: 'Geannuleerd', color: 'bg-slate-100 text-slate-600' },
};

export default async function AdminDashboard() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const paidStatuses = ['PAID', 'ACTIVE', 'COMPLETED'];

  const [
    machines,
    totalRevenue,
    totalPayments,
    revenueToday,
    paymentsToday,
    revenueWeek,
    revenueMonth,
    recentPayments,
    settings,
  ] = await Promise.all([
    db.machine.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.payment.aggregate({
      where: { status: { in: paidStatuses } },
      _sum: { amount: true },
    }),
    db.payment.count({ where: { status: { in: paidStatuses } } }),
    db.payment.aggregate({
      where: { status: { in: paidStatuses }, createdAt: { gte: todayStart } },
      _sum: { amount: true },
    }),
    db.payment.count({
      where: { status: { in: paidStatuses }, createdAt: { gte: todayStart } },
    }),
    db.payment.aggregate({
      where: { status: { in: paidStatuses }, createdAt: { gte: weekStart } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: { in: paidStatuses }, createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    db.payment.findMany({
      where: { status: { in: paidStatuses } },
      include: { machine: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.appSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  const machinesWithSession = await Promise.all(
    machines.map(async (m) => ({
      ...m,
      session: await getActiveSession(m.id),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">{settings?.parkName ?? 'SmartWash'}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Vandaag" value={formatEur(revenueToday._sum.amount ?? 0)} sub={`${paymentsToday} betalingen`} color="sky" />
        <StatCard label="Deze week" value={formatEur(revenueWeek._sum.amount ?? 0)} color="violet" />
        <StatCard label="Deze maand" value={formatEur(revenueMonth._sum.amount ?? 0)} color="emerald" />
        <StatCard label="Totaal ooit" value={formatEur(totalRevenue._sum.amount ?? 0)} sub={`${totalPayments} betalingen`} color="slate" />
      </div>

      {/* Machine status */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Machine status</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {machinesWithSession.map((m) => {
            const icon = m.type === 'WASHER' ? '🫧' : '🌀';
            const isActive = m.session !== null;
            return (
              <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{icon}</span>
                    <span className="font-semibold text-slate-800">{m.name}</span>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isActive ? '🟢 In gebruik' : '⚪ Vrij'}
                  </span>
                </div>
                {isActive && m.session && (
                  <p className="text-sm text-slate-500">
                    Nog {m.session.minutesRemaining} min — stopt om{' '}
                    {new Date(m.session.endsAt).toLocaleTimeString('nl-NL', { timeStyle: 'short' })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-700">Recente betalingen</h2>
          <Link href="/admin/payments" className="text-sm text-sky-600 hover:underline">
            Alle betalingen →
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Machine</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Programma</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-medium">Bedrag</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.map((p) => {
                  const s = statusLabels[p.status] ?? { label: p.status, color: 'bg-slate-100 text-slate-600' };
                  const icon = p.machine.type === 'WASHER' ? '🫧' : '🌀';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{icon} {p.machine.name}</td>
                      <td className="px-4 py-3 text-slate-600">{p.optionLabel}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatEur(p.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  );
                })}
                {recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Nog geen betalingen
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: 'sky' | 'violet' | 'emerald' | 'slate';
}) {
  const colors = {
    sky: 'from-sky-500 to-sky-600',
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
    slate: 'from-slate-600 to-slate-700',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-4 text-white shadow-sm`}>
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}
