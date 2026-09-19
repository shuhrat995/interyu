import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Seed = {
  topic: string;
  type: "mcq" | "written";
  d: number; // difficulty 0..5
  text: string;
  options?: string[];
  correct?: number;
  rubric?: string;
  keys?: string[];
  time?: number;
};

const TOPICS = [
  { name: "JavaScript", slug: "javascript", color: "#f7df1e" },
  { name: "TypeScript", slug: "typescript", color: "#3178c6" },
  { name: "React", slug: "react", color: "#61dafb" },
  { name: "Backend va API", slug: "api", color: "#8b5cf6" },
  { name: "Ma'lumotlar bazasi", slug: "database", color: "#34d399" },
  { name: "Algoritmlar", slug: "algorithms", color: "#fb923c" }
];

const Q: Seed[] = [
  // ============ Daraja 0 (9 ta) ============
  { topic: "javascript", type: "mcq", d: 0, text: "JavaScript'da o'zgaruvchi e'lon qilishning qaysi usuli blok doirasiga (block scope) ega?", options: ["let", "var", "function", "global"], correct: 0 },
  { topic: "javascript", type: "mcq", d: 0, text: "Massiv oxiriga yangi element qo'shish uchun qaysi metod ishlatiladi?", options: ["push()", "shift()", "slice()", "join()"], correct: 0 },
  { topic: "javascript", type: "mcq", d: 0, text: "\"5\" == 5 natijasi qanday bo'ladi?", options: ["true", "false", "NaN", "TypeError"], correct: 0 },
  { topic: "javascript", type: "mcq", d: 0, text: "\"5\" === 5 natijasi qanday bo'ladi?", options: ["false", "true", "undefined", "NaN"], correct: 0 },
  { topic: "react", type: "mcq", d: 0, text: "JSX nima?", options: ["JavaScript'ni HTMLga o'xshash yozish imkonini beruvchi sintaksis kengaytmasi", "Yangi dasturlash tili", "CSS freymvorki", "Brauzer API'si"], correct: 0 },
  { topic: "react", type: "written", d: 0, text: "React'da komponent nima? Oddiy tilda tushuntirib bering.", rubric: "Javobda komponent qayta ishlatiladigan UI bloki ekanligi, props qabul qilishi va JSX qaytarishi aytilishi kerak. Funksiya/klass bo'lishi mumkinligi va UI'ni mustaqil qismlarga bo'lishi zikr etilsa kuchli javob hisoblanadi.", keys: ["komponent", "props", "JSX", "qayta ishlatish"] },
  { topic: "api", type: "mcq", d: 0, text: "HTTP GET metodi nima uchun ishlatiladi?", options: ["Ma'lumot o'qish uchun", "Ma'lumot yozish uchun", "Fayl o'chirish uchun", "Serverni o'chirish uchun"], correct: 0 },
  { topic: "database", type: "mcq", d: 0, text: "SQL qaysi turdagi bazalar bilan ishlaydi?", options: ["Relatsion", "Faqat graf", "Faqat kalit-qiymat", "Fayl tizimi"], correct: 0 },
  { topic: "algorithms", type: "written", d: 0, text: "Massivdagi eng katta sonni topish algoritmini tavsiflab bering.", rubric: "Javobda bitta sikl (loop) bilan elementlarni ko'rib chiqish, birinchi elementni boshlang'ich maksimum deb olish va qolganlar bilan solishtirish mantiqi bo'lishi kerak. Vaqt murakkabligi O(n) deb aytilsa kuchli javob.", keys: ["sikl", "maksimum", "solishtirish", "O(n)"] },
  { topic: "typescript", type: "mcq", d: 0, text: "TypeScript'ning JavaScript'dan asosiy farqi nima?", options: ["Statik tiplar", "Tezroq ishlashi", "Brauzerda to'g'ridan-to'g'ri ishlaydi", "Kutubxonalar ko'p"], correct: 0 },

  // ============ Daraja 1 (9 ta) ============
  { topic: "javascript", type: "mcq", d: 1, text: "Closure nima?", options: ["Tashqi funksiya o'zgaruvchilarini eslab qoladigan ichki funksiya", "Ikkala funksiyaning yig'indisi", "Funksiyani o'chirish", "Global o'zgaruvchi turi"], correct: 0 },
  { topic: "javascript", type: "written", d: 1, text: "Event loop qisqacha qanday ishlaydi? Call stack va callback queue o'rtasidagi munosabatni tushuntiring.", rubric: "Javobda JavaScript bitta ipda (single-threaded) ishlashi, call stack bo'shashini kutib callback'larni navbatma-navbat bajarishi, event loop stack va navbatni kuzatib turishi aytilishi kerak. Bloklanmagan (non-blocking) I/O eslatilsa yaxshi.", keys: ["event loop", "call stack", "callback", "navbat", "single-threaded"] },
  { topic: "javascript", type: "mcq", d: 1, text: "Promise nima holatda 'resolved' hisoblanadi?", options: ["fulfilled yoki rejected bo'lganda", "faqat fulfilled bo'lganda", "pending bo'lganda", "createElement chaqirilganda"], correct: 0 },
  { topic: "react", type: "mcq", d: 1, text: "useState hook'i nima qiladi?", options: ["Funksional komponentga holat (state) beradi", "DOM'ni to'g'ridan-to'g'ri o'zgartiradi", "CSS qo'shadi", "Router yaratadi"], correct: 0 },
  { topic: "react", type: "mcq", d: 1, text: "Props nima?", options: ["Ota komponentdan bolaga o'tadigan ma'lumot", "Komponentning ichki holati", "Global o'zgaruvchi", "HTTP so'rovi"], correct: 0 },
  { topic: "api", type: "mcq", d: 1, text: "REST API'da yangi resurs yaratish uchun qaysi metod ishlatiladi?", options: ["POST", "GET", "HEAD", "OPTIONS"], correct: 0 },
  { topic: "database", type: "mcq", d: 1, text: "Primary key nima?", options: ["Jadvaldagi har bir yozuvni noyob aniqlaydigan ustun", "Eng katta ustun", "Birinchi ustun", "Faqat raqamli ustun"], correct: 0 },
  { topic: "algorithms", type: "mcq", d: 1, text: "O(n) murakkabligi nimani anglatadi?", options: ["Ishlash vaqti elementlar soniga chiziqli bog'liq", "Doim vaqt", "Kvadratik o'sish", "Logarifmik o'sish"], correct: 0 },
  { topic: "typescript", type: "mcq", d: 1, text: "TypeScript'da 'interface' asosan nima uchun ishlatiladi?", options: ["Obyekt shaklini (strukturasi) tavsiflash", "Server yaratish", "CSS yozish", "DOM'ni o'zgartirish"], correct: 0 },

  // ============ Daraja 2 (9 ta) ============
  { topic: "javascript", type: "written", d: 2, text: "Promise zanjiri va async/await o'rtasidagi farqlarni tushuntiring. Qaysi birida xatolarni ushlash qulayroq va nima uchun?", rubric: "Javobda async/await asinxron kodni sinxron ko'rinishda yozish imkonini berishi, try/catch bilan xatolarni ushlash qulayligi, promise zanjirida .catch ishlatilishi aytilishi kerak. Ikkalasi bir xil asosda (microtask) ishlashini ta'kidlasha kuchli javob belgisi.", keys: ["async/await", "try/catch", "then/catch", "microtask"] },
  { topic: "javascript", type: "mcq", d: 2, text: "Hoisting nima?", options: ["O'zgaruvchi va funksiya e'lonlari doiraning boshiga 'ko'tarilishi'", "Kodni yuqoriga surish", "Serverni ko'tarish", "CSS xususiyati"], correct: 0 },
  { topic: "react", type: "mcq", d: 2, text: "useEffect'da bo'sh massiv [] ikkinchi argument sifatida berilsa, effect qachon ishlaydi?", options: ["Faqat mountda bir marta", "Har renderda", "Hech qachon", "Faqat unmountda"], correct: 0 },
  { topic: "react", type: "mcq", d: 2, text: "Ro'yxat renderida 'key' prop nima uchun kerak?", options: ["React elementlarni samarali farqlashi uchun", "CSS uchun", "SEO uchun", "Sarlavha uchun"], correct: 0 },
  { topic: "api", type: "written", d: 2, text: "Idempotent HTTP metodlar qaysilar va nima uchun muhim? PUT va POST misolida tushuntiring.", rubric: "Javobda idempotentlik — bir xil so'rovni takrorlash natijani o'zgartirimasligi, GET/PUT/DELETE idempotent, POST emasligi aytilishi kerak. Tarmoq xatolarida qayta urinish (retry) xavfsizligi misol keltirilsa kuchli javob.", keys: ["idempotent", "PUT", "POST", "retry", "GET/PUT/DELETE"] },
  { topic: "database", type: "mcq", d: 2, text: "Indeks (index) asosiy maqsadi nima?", options: ["Qidiruvni tezlashtirish", "Ma'lumot xavfsizligi", "Diskni tejash", "Jadvalni chiroyli qilish"], correct: 0 },
  { topic: "database", type: "written", d: 2, text: "INNER JOIN, LEFT JOIN va FULL JOIN farqini misollar bilan tushuntiring.", rubric: "Javobda INNER JOIN faqat mos keladigan qatorlar, LEFT JOIN chap jadvalning barcha qatorlari + mos kelmasa NULL, FULL JOIN ikkala tomondan ham qatorlarni olishi kerak. Kichik jadval misoli keltirilsa kuchli javob.", keys: ["INNER JOIN", "LEFT JOIN", "FULL JOIN", "NULL"] },
  { topic: "algorithms", type: "mcq", d: 2, text: "Binary search murakkabligi qanday va qanday shartda ishlaydi?", options: ["O(log n), faqat tartiblangan massivda", "O(n), istalgan massivda", "O(n log n), tartibsiz massivda", "O(1), istalgan holda"], correct: 0 },
  { topic: "typescript", type: "mcq", d: 2, text: "Generic (<T>) nima muammoni hal qiladi?", options: ["Tiplarni qayta ishlatish va tur xavfsizligini saqlash", "Kod tezligini oshirish", "Bundler sozlash", "CSS izolyatsiyasi"], correct: 0 },
  { topic: "api", type: "mcq", d: 2, text: "CORS nima?", options: ["Brauzerning turli origin'dan so'rovlarni cheklovchi mexanizmi", "Server load balanseri", "Shifrlash protokoli", "Ma'lumot turi"], correct: 0 },

  // ============ Daraja 3 (9 ta) ============
  { topic: "javascript", type: "written", d: 3, text: "JavaScript'dagi prototip merosi (prototypal inheritance) qanday ishlaydi? class kalit so'zi bilan bog'lab tushuntiring.", rubric: "Javobda har bir obyekt [[Prototype]] havolasiga ega bo'lishi, xususiyat topilmasa prototip zanjiri bo'ylab qidirilishi, class — bu prototip ustidagi sintaktik shakar ekani aytilishi kerak. Object.create yoki __proto__ misoli keltirilsa kuchli javob.", keys: ["prototip", "zanjir", "class", "sintaktik shakar", "Object.create"] },
  { topic: "javascript", type: "mcq", d: 3, text: "Microtask va macrotask navbati qanday bajariladi?", options: ["Har bir macrotask'dan keyin barcha microtask'lar bajariladi", "Microtask'lar oxirida", "Aralashtirib", "Faqat macrotask'lar"], correct: 0 },
  { topic: "javascript", type: "mcq", d: 3, text: "WeakMap'ning Map'dan asosiy farqi nima?", options: ["Kalitlar kuchli havolada ushlanmaydi va garbage collector o'chirishi mumkin", "Tezroq", "Faqat raqamli kalitlar", "Kattaroq hajm"], correct: 0 },
  { topic: "react", type: "written", d: 3, text: "useMemo va useCallback qanday farq qiladi va qachon ishlatish ma'qul? Ortiqcha ishlatishning kamchiliklari nimalar?", rubric: "Javobda useMemo qiymatni, useCallback funksiya havolasini eslab qolishi, qimmat hisob-kitoblar va referens tenglik kerak bo'lgan joylarda foydali ekanligi aytilishi kerak. Har renderda memoizatsiya xarajati va kod murakkabligi kamchilik sifatida zikr etilsa yuqori ball.", keys: ["useMemo", "useCallback", "referens tenglik", "xarajat", "optimizatsiya"] },
  { topic: "react", type: "mcq", d: 3, text: "Controlled input nima?", options: ["Qiymati React holati orqali boshqariladigan input", "Faqat o'qish mumkin bo'lgan input", "HTML'ning standart inputi", "Parol maydoni"], correct: 0 },
  { topic: "api", type: "mcq", d: 3, text: "JWT tokenni qayerda saqlash xavfsizroq va nima uchun?", options: ["httpOnly cookie — JS kirishi cheklangan, XSS xavfi past", "localStorage — oson", "URL parametrida — tez", "window.name — qulay"], correct: 0 },
  { topic: "api", type: "written", d: 3, text: "Rate limiting dizaynini tushuntiring: qaysi algoritmlarni bilasiz va qayerda qo'llaysiz?", rubric: "Javobda token bucket, sliding window yoki fixed window algoritmlaridan kamida bittasi, limitlarni IP yoki foydalanuvchi bo'yicha hisoblash, 429 status kodi qaytarilishi kerak. Redis kabi tez xotira do'konini eslatish kuchli javob belgisi.", keys: ["token bucket", "sliding window", "429", "Redis", "limit"] },
  { topic: "database", type: "mcq", d: 3, text: "ACID'dagi 'I' nimani anglatadi?", options: ["Isolation", "Index", "Integrity", "Iteration"], correct: 0 },
  { topic: "database", type: "written", d: 3, text: "N+1 muammosi nima va uni qanday aniqlash/hal qilish mumkin?", rubric: "Javobda bitta so'rov + har element uchun alohida so'rov patterni, ORM'da eager loading (include/join) yoki batch so'rov bilan yechim aytilishi kerak. APM yoki query log bilan aniqlash eslatilsa kuchli javob.", keys: ["N+1", "eager loading", "join", "batch", "query log"] },
  { topic: "algorithms", type: "written", d: 3, text: "Hash map qanday ishlaydi? To'qnashuvlar (collisions) qanday hal qilinadi?", rubric: "Javobda hash funksiya kalitni indeksga aylantirishi, to'qnashuvda chain (linked list) yoki open addressing usullari ishlatilishi, o'rtacha O(1) kirish/izlash murakkabligi aytilishi kerak. Load factor va rehashing eslatilsa yuqori ball.", keys: ["hash funksiya", "collision", "chaining", "open addressing", "O(1)"] },
  { topic: "typescript", type: "mcq", d: 3, text: "'unknown' tipi 'any'dan qanday farq qiladi?", options: ["unknown ishlatishdan oldin tekshirish (narrowing) talab qiladi", "unknown tezroq", "any faqat serverda", "Farqi yo'q"], correct: 0 },

  // ============ Daraja 4 (9 ta) ============
  { topic: "javascript", type: "written", d: 4, text: "Event loop'ni chuqur tushuntiring: microtask queue (Promise.then) va macrotask queue (setTimeout) navbati qanday? Kod misoli bilan natijani bashorat qiling.", rubric: "Javobda har bir macrotask tugagach microtask navbati to'liq bo'shatilishi, Promise/queueMicrotask microtask, setTimeout/setInterval macrotask bo'lishi kerak. console.log tartibi misoli (sync → microtasks → macrotasks) to'g'ri berilsa yuqori ball. Rendering (rAF) eslatilsa bonus.", keys: ["microtask", "macrotask", "setTimeout", "Promise.then", "rendering"] },
  { topic: "javascript", type: "mcq", d: 4, text: "V8'da hidden classes (shapes) nima maqsadda ishlaydi?", options: ["Obyekt xususiyatlariga kirishni optimallashtirish uchun", "Xavfsizlik uchun", "Garbage collection uchun", "JSON parse uchun"], correct: 0 },
  { topic: "react", type: "written", d: 4, text: "Katta React ilovasida re-render muammosini qanday tashxis qilasiz va hal qilasiz? Kamida 3 usulni bering.", rubric: "Javobda React DevTools Profiler bilan o'lchash, memo/React.memo, useMemo/useCallback, holatni pastga tushirish (state colocation), komponentlarni bo'lish, virtualizatsiya (react-window) usullaridan 3 tasi aytilishi kerak. Sabab-natija tahlili (nima renderga sabab bo'lyapti) bayon etilsa yuqori ball.", keys: ["Profiler", "React.memo", "useMemo", "state colocation", "virtualizatsiya"] },
  { topic: "api", type: "written", d: 4, text: "Idempotency Key mexanizmini to'liq dizayn qilib bering: POST so'rovlarida takroriy to'lovni (double charge) qanday oldini olasiz?", rubric: "Javobda klient noyob kalit generatsiya qilishi, server kalitni birinchi javob bilan saqlashi, takroriy so'rovda saqlangan javob qaytarilishi, kalitning TTL qo'llanilishi kerak. Qulflash (locking) va parallel so'rovlar holati ko'rib chiqilsa yuqori ball.", keys: ["Idempotency-Key", "saqlangan javob", "TTL", "lock", "double charge"] },
  { topic: "api", type: "mcq", d: 4, text: "WebSocket bilan HTTP long-polling asosiy farqi nima?", options: ["WebSocket doimiy ikki tomonlama kanal, polling har safar yangi so'rov", "WebSocket faqat o'qish uchun", "Polling tezroq", "Farqi yo'q"], correct: 0 },
  { topic: "database", type: "mcq", d: 4, text: "SERIALIZABLE isolation level nima kafolat beradi?", options: ["Parallel tranzaksiyalar ketma-ket bajarilgandek natija", "Faqat tezlik", "Ma'lumot yo'qolmasligi", "Backup kafolati"], correct: 0 },
  { topic: "database", type: "written", d: 4, text: "B-tree indeks qanday holatlarda ishlamaydi yoki samarasiz? Kamida 3 holat keltiring.", rubric: "Javobda leading wildcard LIKE '%x', indeks ustuniga funksiya qo'llash, past selektivlik (kam farqli qiymatlar), katta ORM'li yozuv yukida indeks parvozlari, tip o'zgarishi holatlaridan 3 tasi aytilishi kerak. EXPLAIN ANALYZE bilan tashxis eslatilsa yuqori ball.", keys: ["wildcard", "funksiya", "selektivlik", "EXPLAIN", "tip o'zgarishi"] },
  { topic: "algorithms", type: "mcq", d: 4, text: "Quicksort'ning eng yomon holati (worst case) qachon va murakkabligi qanday?", options: ["Tartiblangan massivda + yomon pivot → O(n²)", "Har doim O(n log n)", "Faqat bo'sh massivda O(1)", "Tartibsizda O(n²)"], correct: 0 },
  { topic: "typescript", type: "written", d: 4, text: "Conditional types va infer kalit so'zini misol bilan tushuntiring. Qanday real muammoni hal qiladi?", rubric: "Javobda T extends U ? X : Y shakli, infer bilan tur ichidan tip chiqarib olish (masalan ReturnType, Awaited) ko'rsatilishi kerak. API javob tiplarini xaritalash yoki utility tip yozish real misoli keltirilsa yuqori ball.", keys: ["conditional", "infer", "ReturnType", "extends", "utility"] },
  { topic: "algorithms", type: "mcq", d: 4, text: "Consistent hashing asosiy afzalligi nima?", options: ["Node qo'shilganda/o'chirilganda faqat kichik qism kalitlar ko'chadi", "Har doim teng taqsimlaydi", "Tezroq hash funksiya", "Kichikroq xotira"], correct: 0 },

  // ============ Daraja 5 (9 ta) ============
  { topic: "javascript", type: "written", d: 5, text: "V8 JIT kompilyatsiyasini tushuntiring: interpreter, baseline va optimizing compiler bosqichlari, deoptimizatsiya sabablari va yozuvchi sifatida bunga qanday hissa qo'shasiz?", rubric: "Javobda Ignition interpreter, Sparkplug baseline, Maglev/TurboFan optimallashtiruvchi bosqichlari, inline caching va hidden classes, tur o'zgarishi yoki feedback'da deoptimizatsiya aytilishi kerak. Monomorf kod va barqaror obyekt shakllari yozish tavsiyasi keltirilsa yuqori ball.", keys: ["Ignition", "TurboFan", "deoptimizatsiya", "inline cache", "hidden classes"] },
  { topic: "react", type: "written", d: 5, text: "SSR, CSR va streaming SSR trade-off'larini tahlil qiling: SEO, TTFB, interaktivlik va server xarajati nuqtai nazaridan. Qanday holatda qaysi tanlanadi?", rubric: "Javobda CSR — boy interaktivlik lekin kutilgan FCP, SSR — tez FCP va SEO lekin server xarajati, streaming — TTFB yaxshilanishi lekin murakkablik aytilishi kerak. Dinamik/kontent/mixed sahifalar misolida tanlov mezonlari berilsa yuqori ball. RSC eslatilsa bonus.", keys: ["SSR", "CSR", "streaming", "TTFB", "SEO", "RSC"] },
  { topic: "api", type: "written", d: 5, text: "Public API uchun versiyalash strategiyasini baholang: URL path, header va date-based versiyalash. Migration davrini qanday boshqarasiz?", rubric: "Javobda path (/v1) soddaligi va keshlanish qulayligi, header versiyalash URL tozaligi lekin kashfiyat qiyinligi, date-based (Stripe uslubi) narxi aytilishi kerak. Deprecation siyosati, parallal ishga tushirish, usage monitoring va mijozlarga ogohlantirish jarayoni bayon etilsa yuqori ball.", keys: ["path", "header", "date-based", "deprecation", "migration", "monitoring"] },
  { topic: "api", type: "mcq", d: 5, text: "Swagger/OpenAPI asosiy qiymati nima?", options: ["API shartnomasini standartlashtirib, kod va hujjat/sinovlarni generatsiya qilish", "Faqat chiroyli UI", "Tezroq so'rov", "Log yig'ish"], correct: 0 },
  { topic: "database", type: "written", d: 5, text: "Tranzaksiya izolyatsiya darajalari (read committed, repeatable read, serializable) va ularning anomaliyalari (dirty read, phantom) munosabatini tushuntiring. PostgreSQL'da qaysi default va nega?", rubric: "Javobda har daraja qanday anomaliyani yopishi jadval shaklida bayon etilishi, PostgreSQL default Read Committed va MVCC asosi zikr etilishi kerak. Serializable Snapshot Isolation (SSI) va performans trade-off ko'rsatilsa yuqori ball.", keys: ["Read Committed", "Repeatable Read", "Serializable", "MVCC", "phantom", "SSI"] },
  { topic: "database", type: "mcq", d: 5, text: "Materialized view oddiy view'dan nimasi bilan farq qiladi?", options: ["Natijasi fizik saqlanadi va qayta hisoblash kerak", "Faqat nomlanadi", "Tezroq yozadi", "Tiplarni tekshiradi"], correct: 0 },
  { topic: "algorithms", type: "written", d: 5, text: "Distributed task queue (masalan: rasm qayta ishlash xizmati) dizaynini bayon eting: navbat, retry, idempotensiya, observability.", rubric: "Javobda broker (SQS/RabbitMQ/Redis), worker pull modeli, eksponensial backoff bilan retry, dead-letter queue, idempotent task'lar (job ID), odamlar uchun metrikalar (lag, success rate) komponentlari bayon etilishi kerak. Exactly-once vs at-least-once muhokamasi kiritilsa yuqori ball.", keys: ["broker", "retry", "dead-letter", "idempotent", "lag", "at-least-once"] },
  { topic: "algorithms", type: "mcq", d: 5, text: "Bloom filter nima ta'minlaydi?", options: ["\"Albatta yo'q\" javobini tez — false positive mumkin, false negative yo'q", "Aniq qiymatni qaytarish", "Tartiblash", "Shifrlash"], correct: 0 },
  { topic: "typescript", type: "written", d: 5, text: "TypeScript'da structural typing tizimi katta monorepo'larda qanday muammolarga olib keladi va branded/nominal tiplar bilan qanday yengillashtiriladi?", rubric: "Javobda bir xil shaklli obyektlarning o'zaro almashtirilishi (ID mixup), branded (brand xususiyati) yoki intersection bilan nominal o'xshash xulq berilishi kerak. Domain modeling (UserId vs OrderId) real misoli va template literal brand usullari ko'rsatilsa yuqori ball.", keys: ["structural", "branded", "nominal", "UserId", "monorepo"] }
];

async function main() {
  console.log("Seed boshlandi...");
  await prisma.answer.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.questionVersion.deleteMany();
  await prisma.question.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.promptVersion.deleteMany();

  const topicMap = new Map<string, string>();
  let order = 0;
  for (const t of TOPICS) {
    const created = await prisma.topic.create({
      data: { name: t.name, slug: t.slug, color: t.color, order: order++ }
    });
    topicMap.set(t.slug, created.id);
  }

  let qn = 0;
  for (const s of Q) {
    const topicId = topicMap.get(s.topic);
    if (!topicId) throw new Error(`Noma'lum mavzu: ${s.topic}`);
    const q = await prisma.question.create({
      data: {
        topicId,
        type: s.type,
        difficulty: s.d,
        text: s.text,
        optionsJson: s.type === "mcq" ? JSON.stringify(s.options ?? []) : null,
        correctIndex: s.type === "mcq" ? (s.correct ?? 0) : null,
        rubric: s.rubric ?? null,
        keywords: (s.keys ?? []).join(","),
        timeLimit: s.time ?? (s.type === "mcq" ? 90 : 300)
      }
    });
    await prisma.questionVersion.create({
      data: {
        questionId: q.id,
        version: 1,
        action: "create",
        snapshotJson: JSON.stringify({
          topicId, type: s.type, difficulty: s.d, text: s.text,
          options: s.options ?? [], correctIndex: s.correct ?? null,
          rubric: s.rubric ?? null, keywords: s.keys ?? [], timeLimit: s.time ?? 180
        })
      }
    });
    qn++;
  }

  // 2 ta aktiv prompt (TZ: kamida 2 ta prompt tayyor)
  await prisma.promptVersion.create({
    data: {
      kind: "evaluate_written",
      version: 2,
      isActive: true,
      template: `Siz tajribali texnik intervyuersiz. Quyidagi savol va nomzod javobini rubric asosida baholang.
Mavzu: {{topic}}. Daraja: {{difficulty}}/5. Rubric: """{{rubric}}"""
Kutilgan kalit tushunchalar: {{keywords}}
Savol: """{{question}}"""
Nomzod javobi: """{{answer}}"""
Javobni qisqa baholang: har ro'yxatda maksimum 3 element, interviewer_note 1-2 gap.
Faqat JSON qaytaring: {"score": 0-100, "verdict": "kuchli|o'rtacha|zaif", "strengths": ["..."], "gaps": ["..."], "misconceptions": ["..."], "interviewer_note": "...", "followup": "savol yoki null"}`
    }
  });
  await prisma.promptVersion.create({
    data: {
      kind: "final_report",
      version: 2,
      isActive: true,
      template: `Siz tajribali va ochiq gapiradigan texnik intervyuersiz. Quyidagi transkript bo'yicha nomzodga HALOL xulosa yozing.
Yo'nalish: {{track}}
Mavzular statistikasi (aniq hisoblangan): {{stats}}
Transkript: {{transcript}}
Talablar:
- critical_issues: nomzodning eng jiddiy muammolari, har biriga dalil (qaysi savolda qanday ball) ko'rsatilgan. Yumshoq gapirmang — aniq ayting.
- focus_areas: aynan nimaga focus qaratish kerak, priority 1 — eng muhim. Har biri uchun "why" (nima uchun) va "how" (qanday mashq qilish).
- strengths/weaknesses: dalilga asoslangan bo'lsin, umumiy gap emas.
- Mavzular statistikasiga zid xulosa yozmang.
Faqat JSON qaytaring: {"level": "junior|junior+|middle|middle+|senior", "overall_score": 0-100, "summary": "3-5 gap", "strengths": ["..."], "weaknesses": ["..."], "critical_issues": [{"issue": "...", "evidence": "...", "severity": "yuqori|o'rta|past"}], "focus_areas": [{"topic": "...", "priority": 1, "why": "...", "how": "..."}], "hiring_recommendation": "ha|yo'q|shartli", "culture_note": "...", "next_steps": ["..."]}`
    }
  });

  const byLevel: Record<number, number> = {};
  Q.forEach((s) => (byLevel[s.d] = (byLevel[s.d] ?? 0) + 1));
  console.log(`✅ ${qn} savol, ${TOPICS.length} mavzu, 2 prompt seed qilindi`);
  console.log("Darajalar bo'yicha:", byLevel);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
