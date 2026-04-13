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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://jouwapp.vercel.app';

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
      <h3 className="font-bold text-amber-800">⏰ Automatische uitschakelaar</h3>

      <div>
        <p className="text-sm text-amber-700 mb-2">
          Machines worden automatisch uitgeschakeld zodra iemand de successpagina in de browser open heeft
          (de timer loopt client-side en triggert de server). Voor extra zekerheid — ook als niemand
          de browser open heeft — gebruik een externe cronjob:
        </p>

        <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">
              ① Maak een gratis account op{' '}
              <a
                href="https://cron-job.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 underline"
              >
                cron-job.org
              </a>
            </p>
            <p className="text-xs font-semibold text-slate-700 mb-1">
              ② Voeg een nieuwe cronjob toe met deze URL:
            </p>
            <code className="block bg-slate-100 rounded px-3 py-2 text-xs font-mono text-slate-800 break-all">
              {`${baseUrl}/api/scheduler?secret=${secret}`}
            </code>
            <p className="text-xs text-slate-500 mt-1">
              Interval: elke minuut | Methode: GET
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-amber-600">
        ℹ️ Vercel Hobby Plan ondersteunt geen minutecrons. cron-job.org is gratis en betrouwbaar.
      </p>
    </div>
  );
}
