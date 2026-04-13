import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getActiveSession } from '@/lib/session';
import PaymentForm from '@/components/PaymentForm';
import Link from 'next/link';

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MachinePage({ params }: Props) {
  const { id } = await params;

  const machine = await db.machine.findUnique({
    where: { id, isActive: true },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!machine) notFound();

  const session = await getActiveSession(id);
  const settings = await db.appSettings.findUnique({ where: { id: 'singleton' } });

  const icon = machine.type === 'WASHER' ? '🫧' : '🌀';

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            ← Terug
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              {icon} {machine.name}
            </h1>
            <p className="text-xs text-slate-500">{settings?.parkName ?? 'SmartWash'}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {session ? (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h2 className="text-xl font-bold text-orange-800 mb-2">
              Machine is in gebruik
            </h2>
            <p className="text-orange-600">
              De {machine.name.toLowerCase()} is momenteel bezet.
              Nog ongeveer <strong>{session.minutesRemaining} minuten</strong>.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-sm text-orange-700 underline"
            >
              Terug naar overzicht
            </Link>
          </div>
        ) : (
          <PaymentForm machine={machine} />
        )}
      </div>
    </main>
  );
}
