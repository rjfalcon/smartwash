'use client';

import { useState } from 'react';
import QRCode from 'qrcode';

interface Machine {
  id: string;
  name: string;
  type: string;
}

interface Props {
  machines: Machine[];
  baseUrl: string;
}

export default function QrCodeSection({ machines, baseUrl }: Props) {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState(false);

  async function generateQrCodes() {
    const codes: Record<string, string> = {};
    for (const machine of machines) {
      const url = `${baseUrl}/machine/${machine.id}`;
      codes[machine.id] = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    }
    setQrCodes(codes);
    setGenerated(true);
  }

  function printQrCodes() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = machines
      .map((machine) => {
        const icon = machine.type === 'WASHER' ? '🫧' : '🌀';
        const url = `${baseUrl}/machine/${machine.id}`;
        return `
          <div style="break-inside:avoid; text-align:center; padding:40px; border:2px solid #e2e8f0; border-radius:16px; margin-bottom:24px;">
            <div style="font-size:48px; margin-bottom:8px;">${icon}</div>
            <h2 style="font-size:24px; font-weight:bold; color:#1e293b; margin:0 0 8px;">${machine.name}</h2>
            <p style="color:#64748b; font-size:14px; margin:0 0 20px;">Scan om te betalen en te starten</p>
            <img src="${qrCodes[machine.id]}" style="width:200px; height:200px; margin:0 auto;" />
            <p style="font-size:11px; color:#94a3b8; margin-top:12px; word-break:break-all;">${url}</p>
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartWash QR Codes</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1 style="text-align:center; color:#0ea5e9; margin-bottom:32px;">SmartWash QR Codes</h1>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800">QR Codes</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Print deze QR codes en plak ze op de machines
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateQrCodes}
            className="text-sm bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600"
          >
            Genereren
          </button>
          {generated && (
            <button
              onClick={printQrCodes}
              className="text-sm bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
            >
              🖨️ Printen
            </button>
          )}
        </div>
      </div>

      {generated && (
        <div className="grid gap-4 md:grid-cols-2">
          {machines.map((machine) => {
            const icon = machine.type === 'WASHER' ? '🫧' : '🌀';
            const url = `${baseUrl}/machine/${machine.id}`;
            return (
              <div key={machine.id} className="border border-slate-200 rounded-xl p-4 text-center">
                <div className="text-3xl mb-1">{icon}</div>
                <h4 className="font-semibold text-slate-800 mb-2">{machine.name}</h4>
                {qrCodes[machine.id] && (
                  <img
                    src={qrCodes[machine.id]}
                    alt={`QR code ${machine.name}`}
                    className="w-40 h-40 mx-auto rounded-lg"
                  />
                )}
                <p className="text-xs text-slate-400 mt-2 break-all">{url}</p>
              </div>
            );
          })}
        </div>
      )}

      {!generated && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Klik op &quot;Genereren&quot; om QR codes te maken
        </div>
      )}
    </div>
  );
}
