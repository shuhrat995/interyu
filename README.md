# interyu

AI Intervyu — bilim sinash platformasi (Next.js 14 + Prisma + Gemini AI).

- **Asosiy sayt (`/`)** — nomzod uchun landing: imkoniyatlar, qamrab olingan mavzular, "O'z darajangizni aniqlash" CTA
- **Nomzod intervyusi (`/interview`)** — yo'nalish tanlash (front-end/back-end), start, savol, javob, adaptiv daraja, AI baholash, yakuniy verdict
- **Admin panel (`/qw` → `/admin`)** — TZ §4: Auth + RBAC, Savollar CRUD (versiyalar bilan), Mavzular, Import/Export, AI yordamchi, Audit log, Dashboard (real tashrif analitikasi bilan), Intervyu natijalari, Analitika

## Vercelga deploy

1. **Baza:** SQLite Vercel serverless'da ishlamaydi (filesystem vaqtinchalik). Bepul/arith PostgreSQL oling — [Neon](https://neon.tech) yoki [Supabase](https://supabase.com) — va `DATABASE_URL` ni o'sha connection string'ga yo'naltiring. Keyin `prisma/schema.prisma` da `provider = "sqlite"` ni `"postgresql"` ga o'zgartiring.
2. **Schema yuborish:** lokaldan `DATABASE_URL=<postgres-url> npx prisma db push` (bir marta), keyin seed: `npm run db:seed` (ixtiyoriy, PDF seed ham).
3. **Vercel:** repo'ni import qiling (framework: Next.js, avtomatik). Environment Variables:

   | Kalit | Qiymat |
   |---|---|
   | `DATABASE_URL` | Postgres connection string (Neon/Supabase) |
   | `JWT_SECRET` | uzun tasodifiy satr (`openssl rand -hex 32`) |
   | `BOOTSTRAP_ADMIN_EMAIL` | birinchi admin email |
   | `GEMINI_API_KEY` | Gemini kalit (AI baholash uchun) |
   | `GEMINI_MODEL` | `gemini-3.1-flash-lite` |
   | `GEMINI_MODELS` | `gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.6-flash` |

   `OPENAI_API_KEY`/`OPENAI_MODEL` ixtiyoriy (fallback).
4. **Birinchi admin:** deploy'dan keyin `https://<sizning-sayt>/qw` ga o'ting — baza bo'sh bo'lsa Bootstrap formasi chiqadi, super_admin yaratiladi.
5. **Prisma Postgres'da:** `package.json`dagi build skripti allaqachon `prisma generate && next build` — Vercel buni avtomatik ishlatadi, alohida Build Command kerak emas.

**Muhim (serverless):** SQLite fayli Vercel'da saqlanmaydi — albatta Postgres ulang. AICallLog/VisitorEvent jadvallari o'sishini cheklash uchun eski yozuvlarni davriy o'chirish tavsiya etiladi.

## Lokal ishga tushirish

> **Push qilish (birinchi marta):** commit tayyor (`git log` da ko'rinadi). Faqat:
> ```bash
> git push -u origin main
> ```
> GitHub username/token so'rsa — [Personal Access Token](https://github.com/settings/tokens) yarating (scope: `repo`) va parol o'rniga shuni kiriting.

## Ishga tushirish

```bash
npm install
npx prisma db push      # baza yaratish
npm run db:seed         # 59 asosiy savol + 6 mavzu + 2 prompt
npx tsx prisma/seed-pdf.ts  # PDF'dagi 80 frontend savoli (append, takror himoyasi)
npm run dev             # http://localhost:3000
```

Baza bo'sh bo'lsa `/login` avtomatik **Bootstrap** formasini ko'rsatadi — birinchi super_admin shu yerda yaratiladi.

> Dev kirim: `admin@example.com` / `2008.07`. O'z kirim uchun `.env` ni to'ldiring.

## Kirim ma'lumotlari

| Ro'l | Kirim |
|---|---|
| super_admin | admin@example.com / 2008.07 |
| Boshqalar | bootstrap yoki super_admin yaratadi |

Kirim **email + parol** asosida (`POST /api/auth/login`); sessiya JWT httpOnly cookie (8 soat). Email+IP bo'yicha 3 xato → 5 daqiqa, 6 xato → 10 daqiqa, 9 xato → 1 hafta blok. To'g'ri parol blok holatida ham kirishga ruxsat beradi. >2FA ataylab olib tashlangan — keyinroq qayta qo'shish mumkin.

## Texnologiyalar

- Next.js 14 (App Router) + TypeScript
- Prisma + **SQLite** (vaqtincha; TZ'da Supabase/Neon PostgreSQL — `schema.prisma` da `provider` ni o'zgartirish kifoya)
- Tailwind (dark admin tema)
- Auth: JWT (jose, httpOnly cookie, 8 soat), bcrypt parol xeshi
- AI: **Gemini modellar zanjiri** (`GEMINI_MODELS`, masalan `gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.6-flash`) → OpenAI fallback → mock/heuristik (kalit bo'lmasa). Har chaqiruv `AICallLog`ga yoziladi (token, latensiya, xato).
  - **Tezlik:** `thinkingBudget: 0` ("o'ylash" o'chirilgan), javob uzunligi cheklangan, **429 (kvota) → kutmasdan keyingi modelga o'tiladi**, 5xx/timeout → 1 marta retry. Yozma javob bahosi odatda **1.5–3 soniya**; byudjet (9s) tugasa heuristik baho ishlatiladi — nomzod hech qachon kutib qolmaydi.

## Modullar

- **Auth**: bootstrap (baza bo'sh bo'lsa) → login (email + parol), email+IP bo'yicha bosqichli blok; RBAC 5 rol
- **Dashboard**: savollar/mavzular/adminlar/audit sonlari, daraja taqsimoti, so'nggi harakatlar
- **Savollar**: MCQ (2–5 variant, 1 to'g'ri) + yozma (rubric ≥30 belgi, kalit so'zlar), daraja 0–5, vaqt limiti 30–900s
  - Ishlatilgan savol tahrirlansa **yangi versiya** yaratiladi (eski intervyular eski versiyaga bog'lanadi)
  - Soft delete + tiklash; har o'zgarish audit logda (before/after)
- **Mavzular**: CRUD, ichma-ich, rang; savol/bola bor-mavzu o'chirmaydi
- **Import/Export**: CSV/JSON (`|` ajratgich), qator-qator xato hisoboti, append/replace rejimlar
- **AI yordamchi**: rubric yozish, kalit so'zlar, distraktor taklifi
- **Audit log**: filtrlash, before/after ko'rish
- **Intervyular (TZ §6.1.2)**: natijalar ro'yxati (filtrlar, ball/daraja/tavsiya/teg), transkript sahifasi — har savol + javob + AI baho (score, strengths, gaps, misconceptions, intervyuer izohi, follow-up), anti-cheat loglari, rekruter izohlari va teglar

## Qabul mezonlari (TZ §4.12)

- [x] AC-A01 Login (+ parol almashtirish) va birinchi ishga tushirishda bootstrap
- [x] AC-A02 Rolga qarab menyu
- [x] AC-A03 Savol CRUD (MCQ + written)
- [x] AC-A04 Import/Export (CSV/JSON; XLSX keyingi qadam)
- [x] AC-A05 Ishlatilgan savol yangi versiya
- [ ] AC-A06 AI prompt versiyalar + A/B (promptlar seed qilingan, UI 1D bosqichi)
- [ ] AC-A07 Token sarf monitoring (1D)
- [x] AC-A08 Email+IP bo'yicha bosqichli login bloklash
- [x] AC-A09 Audit log
- [x] AC-A10 139 savol + 2 prompt
  - 59 asosiy (JavaScript/TS/React/API/DB/Algoritmlar, har darajada 9–11, MCQ+yozma)
  - 80 PDF'dan ("Intervyu savollari | Junior @frontend"): HTML, CSS, Integratsiya, Responsive, DOM, ES6+, Performans — hammasi rubric + kalit so'zlar bilan yozma tipda
  - Mavzular: HTML (25), CSS (35), JavaScript (25), TypeScript (6), React (10), Backend/API (10), DB (10), Algoritmlar (18)

## Asosiy sayt (`/`)

Nomzod uchun landing sahifa (server component — savol/mavzu sonlari bazadan olinadi):

- Hero: qisqa tavsif, **"O'z darajangizni aniqlash"** va "Qanday ishlaydi?" CTA
- Saytda **admin panelga havola yo'q** — admin kirish faqat `/qw` manzili orqali (`/login` shu yerga redirect qiladi)
- Statistika: savollar soni, mavzular, har suhbatdagi savol soni, adaptiv daraja oralig'i
- Qanday ishlaydi (3 qadam) va imkoniyatlar (adaptiv qiyinlik, AI baholash, vaqt chegarasi, yakuniy hisobot)
- Qamrab olingan mavzular — rangli chiplar savol soni bilan
- Footer: "Darajani aniqlash" va "Qanday ishlaydi" havolalari

`/` dan `/interview` ga o'tish bitta tugma bilan; intervyu oxirida va welcome ekranida orqaga havola bor.

## Admin panelga kirish (`/qw`)

Asosiy saytda admin havolasi ko'rinmaydi: panelga kirish uchun **`http://localhost:3000/qw`** manziliga o'tiladi (eski `/login` ham shu yerga yo'naltiradi). 2FA yo'q — email + parol.

## Nomzod sayti (/interview)

- `POST /api/interview/start` — ism + **yo'nalish (front-end / back-end)** bilan sessiya, 0 darajadan birinchi savol
- **Yo'nalish tanlovi:** nomzod avval ismini, keyin front-end yoki back-end ni tanlaydi; savollar faqat shu yo'nalish mavzularidan olinadi (`src/lib/tracks.ts`): front-end → HTML, CSS, JavaScript, TypeScript, React; back-end → JavaScript, Backend/API, DB, Algoritmlar. Yo'nalish `Interview.track` da saqlanadi va admin ro'yxatida "Yo'nalish" ustunida ko'rinadi.
- `POST /api/interview/answer` — serverda baholash: MCQ to'g'ri/noto'g'ri, yozma AI ball (≥60 = to'g'ri)
- `POST /api/interview/finish` — yakuniy hisobot: summary, **ustunlik va kamchiliklar**, **`critical_issues`** (ochiq tanqid, dalil va jiddiylik darajasi bilan), **`focus_areas`** (nimaga va qaysi ustuvorlikda focus qaratish + qanday mashq qilish), **`topic_stats`** (mavzular kesimida aniq hisob — AI'siz ham har doim hisoblanadi), tavsiya va keyingi qadamlar
- **Halollik:** AI xulosa bermasa ham lokal statistika asosida to'liq tanqidiy hisobot chiqadi (report'da `provider: "mock"` → "statistik tahlil" belgisi)
- `GET /api/interview/:id` — refresh'dan keyin sessiya tiklanadi
- **Xavfsizlik:** `correctIndex` clientga yuborilmaydi; baho faqat serverda; noto'g'ri savolga javob → 403; takroriy javob → 409; yozma min 15 belgi → 422; vaqt serverda nazorat qilinadi, tugasa avtomatik yuboriladi
- **Adaptiv:** ketma-ket 2 to'g'ri → +1 (maks 5), 1 xato → −1 (min 0)
- **Anti-cheat:** tab switch va paste loglanadi (Answer/Interview.antiCheatJson)
- **E2E test:** `bash scripts/test-interview.sh`

## Analitika (/admin/analytics)

`GET /api/analytics` bitta so'rovda barcha tahlil ma'lumotlarini beradi (Recharts bilan render qilinadi):

- **KPI:** jami/yakunlangan intervyu, tugatish %, o'rtacha ball, o'rtacha davomiylik, javoblar, AI chaqiruv va token
- **Intervyular dinamikasi** — oxirgi 30 kun, kunlik boshlangan/yakunlangan (Area)
- **Ball taqsimoti** — 0–100 oralig'idagi 10 ta savat (Bar, rang ball zonasiga mos)
- **Daraja taqsimoti** — junior → senior donut (Pie, foizli tooltip)
- **Mavzular bo'yicha xatolar** — har mavzu xato ulushi (gorizontal Bar) + jadval (javoblar, xatolar, xato %, o'rtacha AI ball)

Xato mezoni: MCQ `isCorrect === false` yoki yozma `aiScore < 40`.

## Keyingi qadamlar (TZ bosqichlari)

1. **1D** — AI Monitoring: prompt versiyalar UI, A/B, sarf/byudjet (AICallLog)
2. **1E** — Foydalanuvchilar boshqaruvi + Sozlamalar
3. **1F** — Kengaytirilgan dashboard
4. ~~2D — Admin'da intervyu natijalari ro'yxati va transkript ko'rinishi~~ ✅ (qilingan)
5. ~~2E — Analitika grafiklari (Recharts)~~ ✅ (qilingan)
6. **3-bosqich** — PDF eksport (analitika tayyor)

# interyu
