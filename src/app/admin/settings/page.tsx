import { db } from '@/lib/db';
import SettingsForm from '@/components/SettingsForm';

export const revalidate = 0;

export default async function SettingsPage() {
  const settings = await db.appSettings.findUnique({ where: { id: 'singleton' } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Instellingen</h1>
      <SettingsForm settings={settings} />
      <SchedulerInfo />
    </div>
  );
}

function SchedulerInfo() {
  const secret = process.env.SCHEDULER_SECRET ?? 'smartwash-scheduler';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <h3 className="font-bold text-amber-800 mb-2">⏰ Automatische uitschakelaar (Scheduler)</h3>
      <p className="text-sm text-amber-700 mb-3">
        Om machines automatisch uit te schakelen na afloop, voeg dit toe aan je cronjob (bijv. elke minuut):
      </p>
      <code className="block bg-amber-100 rounded-lg px-3 py-2 text-xs font-mono text-amber-900 break-all">
        {`* * * * * curl -s "${baseUrl}/api/scheduler?secret=${secret}" > /dev/null`}
      </code>
      <p className="text-xs text-amber-600 mt-2">
        Of gebruik Vercel Cron Jobs als je op Vercel draait.
      </p>
    </div>
  );
}
