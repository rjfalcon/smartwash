import { db } from '@/lib/db';
import MachinesEditor from '@/components/MachinesEditor';
import QrCodeSection from '@/components/QrCodeSection';

export const revalidate = 0;

export default async function MachinesPage() {
  const [machines, settings] = await Promise.all([
    db.machine.findMany({
      include: { options: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    }),
    db.appSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  const baseUrl = settings?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Machines</h1>
      <MachinesEditor machines={machines} />
      <QrCodeSection machines={machines} baseUrl={baseUrl} />
    </div>
  );
}
