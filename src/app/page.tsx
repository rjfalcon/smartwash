import { db } from '@/lib/db';
import { getActiveSession } from '@/lib/session';
import MachineCard from '@/components/MachineCard';
import Link from 'next/link';

export const revalidate = 0;

export default async function HomePage() {
  const [machines, settings] = await Promise.all([
    db.machine.findMany({
      where: { isActive: true },
      include: {
        options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    db.appSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  const machinesWithSession = await Promise.all(
    machines.map(async (m) => ({
      ...m,
      currentSession: await getActiveSession(m.id),
    })),
  );

  const parkName = settings?.parkName ?? 'Ons Park';
  const appName = settings?.appName ?? 'SmartWash';

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-sky-600">{appName}</h1>
            <p className="text-xs text-slate-500">{parkName}</p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Beheer
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🫧</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Welkom bij {appName}
          </h2>
          <p className="text-slate-500">
            Selecteer een machine om te betalen en te starten
          </p>
        </div>

        {machinesWithSession.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🔧</div>
            <p>Geen machines beschikbaar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {machinesWithSession.map((machine) => (
              <MachineCard key={machine.id} machine={machine} />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">
          Betalen via iDEAL, creditcard of andere methoden
        </p>
      </div>
    </main>
  );
}
