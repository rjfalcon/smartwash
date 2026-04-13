import { db } from '@/lib/db';
import Link from 'next/link';

export const revalidate = 0;

interface SearchParams {
  page?: string;
  machineId?: string;
  status?: string;
}

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

const LIMIT = 25;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? '1');
  const machineId = params.machineId;
  const status = params.status;

  const where: Record<string, unknown> = {};
  if (machineId) where.machineId = machineId;
  if (status) where.status = status;

  const [payments, total, machines] = await Promise.all([
    db.payment.findMany({
      where,
      include: { machine: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    db.payment.count({ where }),
    db.machine.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  const totalPages = Math.ceil(total / LIMIT);

  function buildUrl(p: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { page: '1', machineId, status, ...p };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    return `/admin/payments?${sp.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Betalingen</h1>
        <span className="text-sm text-slate-500">{total} resultaten</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Machine</label>
          <div className="flex gap-2 flex-wrap">
            <FilterLink href={buildUrl({ machineId: undefined })} active={!machineId} label="Alle" />
            {machines.map((m) => (
              <FilterLink
                key={m.id}
                href={buildUrl({ machineId: m.id })}
                active={machineId === m.id}
                label={m.name}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <div className="flex gap-2 flex-wrap">
            <FilterLink href={buildUrl({ status: undefined })} active={!status} label="Alle" />
            {Object.entries(statusLabels).map(([key, s]) => (
              <FilterLink
                key={key}
                href={buildUrl({ status: key })}
                active={status === key}
                label={s.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Machine</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Programma</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Bedrag</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Klant</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => {
                const s = statusLabels[p.status] ?? { label: p.status, color: 'bg-slate-100 text-slate-600' };
                const icon = p.machine.type === 'WASHER' ? '🫧' : '🌀';
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{icon} {p.machine.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.optionLabel}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatEur(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {p.customerEmail ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(p.createdAt)}</td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Geen betalingen gevonden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              Pagina {page} van {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  ← Vorige
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Volgende →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
        active
          ? 'bg-sky-500 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </Link>
  );
}
