# SmartWash 🫧

Slim betaalsysteem voor was- en droogmachines op een camping of park.

## Features

- **QR code** per machine — scan en betaal direct
- **Mollie** betaalintegratie (iDEAL, creditcard, etc.)
- **Tuya smart plug** koppeling — automatisch aan/uit
- **Instelbare tijdsduren** + prijzen per machine
- **Afteltimer** op de gebruikerspagina
- **E-mail notificaties** bij betaling + 5-min waarschuwing
- **Admin dashboard** met omzetstatistieken
- **Printbare QR codes** voor op de machines

---

## Snelstart

### 1. Installeer dependencies

```bash
npm install
```

### 2. Configureer omgevingsvariabelen

```bash
cp .env.example .env
```

Vul het `.env` bestand in (zie hieronder voor details).

### 3. Database aanmaken

```bash
npm run db:push
npm run db:seed
```

### 4. Starten

```bash
npm run dev     # Development
npm run build && npm start  # Productie
```

Ga naar `http://localhost:3000/admin` (standaard PIN: **1234**)

---

## Omgevingsvariabelen

### App
```env
NEXT_PUBLIC_APP_URL="https://wash.jouwpark.nl"
DATABASE_URL="file:./smartwash.db"
```

### Mollie
1. Maak een account op [mollie.com](https://mollie.com)
2. Ga naar **Developers → API keys**
3. Kopieer de live of test API key

```env
MOLLIE_API_KEY="live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
# test_xxx voor testen zonder echte betalingen
```

### Tuya Smart Plug
1. Maak een account op [iot.tuya.com](https://iot.tuya.com)
2. Maak een Cloud project aan (selecteer "Smart Home")
3. Voeg je apparaten toe via de Tuya/Smart Life app
4. Ga naar **Cloud → Development → Open API** voor Client ID en Secret
5. Het Device ID vind je in de Tuya app of via de Cloud console

```env
TUYA_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxx"
TUYA_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TUYA_BASE_URL="https://openapi.tuyaeu.com"
# EU: tuyaeu.com | US: tuyaus.com
```

> **Tip**: Voer het Device ID in via het admin paneel → Machines

### E-mail (SMTP)

**Gmail instelling:**
1. Ga naar Google Account → Beveiliging → 2-staps verificatie
2. Maak een **App-wachtwoord** aan (niet je gewone wachtwoord)

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="jouw@gmail.com"
SMTP_PASS="jouw-app-wachtwoord"
SMTP_FROM="SmartWash <jouw@gmail.com>"
```

### Admin & Scheduler
```env
ADMIN_PIN="1234"          # Verander dit!
SCHEDULER_SECRET="geheim" # Willekeurige string
```

---

## Automatisch uitschakelen (Scheduler)

Om machines automatisch uit te schakelen voeg je een cronjob toe:

```bash
# Elke minuut controleren
* * * * * curl -s "https://wash.jouwpark.nl/api/scheduler?secret=geheim" > /dev/null
```

### Op Vercel
Pas `vercel.json` aan met jouw scheduler secret:
```json
{
  "crons": [
    {
      "path": "/api/scheduler?secret=geheim",
      "schedule": "* * * * *"
    }
  ]
}
```

---

## Deployment

### VPS / Raspberry Pi (aanbevolen voor camping)

SQLite werkt perfect voor een kleine omgeving.

```bash
# Build
npm run build

# Start als service (bijv. via PM2)
npm install -g pm2
pm2 start "npm start" --name smartwash
pm2 startup && pm2 save
```

Gebruik Nginx als reverse proxy:
```nginx
server {
    server_name wash.jouwpark.nl;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Vercel + PostgreSQL

Voor Vercel werkt SQLite niet. Gebruik Supabase of PlanetScale:

1. Maak database aan bij [supabase.com](https://supabase.com)
2. Pas `prisma/schema.prisma` aan:
   ```diff
   - provider = "sqlite"
   + provider = "postgresql"
   ```
3. Voeg PostgreSQL connection string toe aan Vercel environment variables
4. Deploy en run `npx prisma db push`

---

## Admin paneel

Ga naar `/admin` en log in met de PIN code (standaard: 1234, wijzig via Instellingen).

**Dashboard** — live machine status, omzet per dag/week/maand

**Betalingen** — alle transacties met filters op machine en status

**Machines** — Tuya Device IDs instellen, prijsopties beheren, QR codes genereren en printen

**Instellingen** — parknaam, notificatie e-mails, PIN wijzigen

---

## Architectuur

```
Gebruiker scant QR code
    ↓
/machine/[id] — kies tijdsduur
    ↓
POST /api/payment/create — Mollie betaling aanmaken
    ↓
Mollie checkout (iDEAL / creditcard)
    ↓
POST /api/payment/webhook — betaling bevestigd
    ↓
Tuya API — stekker aan
+ E-mail naar klant + admin
    ↓
Scheduler (elke minuut) — tijd verstreken?
    ↓
Tuya API — stekker uit
```

---

## Licentie

MIT
