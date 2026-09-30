import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedQ = {
  topic: string;
  type: "mcq" | "written";
  d: number;
  text: string;
  options?: string[];
  correct?: number;
  rubric?: string;
  keys?: string[];
};

const NEW_TOPICS = [
  { name: "Python", slug: "python", color: "#3776AB" },
  { name: "Node.js", slug: "nodejs", color: "#339933" },
  { name: "Java", slug: "java", color: "#ED8B00" },
  { name: "Go", slug: "go", color: "#00ADD8" }
];

const Q: SeedQ[] = [
  // ================= PYTHON (14) =================
  { topic: "python", type: "mcq", d: 0, text: "Python'da ro'yxat (list) qaysi qavs bilan yoziladi?", options: ["[]", "{}", "()", "<>"], correct: 0 },
  { topic: "python", type: "mcq", d: 0, text: 'len("salom") natijasi nima?', options: ["5", "4", "6", "Xato beradi"], correct: 0 },
  { topic: "python", type: "written", d: 0, text: "Python'da list va tuple farqi nima? Qachon qaysi birini ishlatasiz?", rubric: "list o'zgaruvchan (mutable), tuple o'zgarmas (immutable) ekani aytilishi kerak. O'zgarmas kalit/parametr uchun tuple, o'zgaradigan to'plam uchun list tanlanishi zikr etilsa yaxshi.", keys: ["o'zgarmas", "immutable", "list", "tuple"] },
  { topic: "python", type: "mcq", d: 1, text: "Lug'atdan (dict) qiymatni xavfsiz olish usuli qaysi?", options: ["get()", "[] — har doim xavfsiz", "remove()", "pop() — shart"], correct: 0 },
  { topic: "python", type: "mcq", d: 1, text: "range(3) nimani beradi?", options: ["0, 1, 2", "1, 2, 3", "0, 1, 2, 3", "3"], correct: 0 },
  { topic: "python", type: "written", d: 1, text: "List comprehension nima? Oddiy sikl bilan bitta misolda solishtiring.", rubric: "Bir qatorda yangi ro'yxat hosil qilish sintaksisi ([x for x in ...]) va uning sikl ekvivalenti ko'rsatilishi kerak. O'qilishi va tezligi eslatilsa yaxshi.", keys: ["comprehension", "bir qator", "yangi ro'yxat", "for"] },
  { topic: "python", type: "mcq", d: 2, text: "`*args` nima?", options: ["Ixtiyoriy pozitsion argumentlar to'plami", "Kalit so'zli argumentlar", "Majburiy bitta argument", "Dekorator turi"], correct: 0 },
  { topic: "python", type: "written", d: 2, text: "Python'da `==` va `is` farqi nima? Misol bilan tushuntiring.", rubric: "`==` qiymat tengligi, `is` esa bir xil ob'ekt (xotira manzili) ekani aytilishi kerak. Kichik int/string keshlanishi misoli keltirilsa kuchli javob.", keys: ["qiymat", "xotira", "ob'ekt", "identifikator"] },
  { topic: "python", type: "written", d: 2, text: "Decorator nima va qachon ishlatiladi? Oddiy misol keltiring.", rubric: "Funksiyani o'rovchi (wrapper) funksiya ekani, @ belgisi bilan qo'llanishi va loglash/keshlash kabi misol keltirilishi kerak.", keys: ["funksiya", "o'rash", "wrapper", "@"] },
  { topic: "python", type: "mcq", d: 3, text: "GIL nima?", options: ["Bir paytda bitta thread Python baytkodini bajarishi", "Garbage collector turi", "Virtual muhit", "Kutubxona nomi"], correct: 0 },
  { topic: "python", type: "written", d: 3, text: "Generator va iterator farqi nima? `yield` qanday ishlaydi?", rubric: "yield qiymatni dangasa (lazy) qaytarishi, xotirani tejashi va ketma-ketlikni to'xtatib-davom ettirishi tushuntirilishi kerak.", keys: ["yield", "lazy", "xotira", "ketma-ket"] },
  { topic: "python", type: "written", d: 3, text: "Shallow copy va deep copy (`copy` moduli) farqi nima? Qachon xato chiqadi?", rubric: "Shallow faqat tashqi ob'ektni, deep esa ichki ob'ektlarni ham nusxalashi, havola bilan bo'lishish muammosi misolda ko'rsatilishi kerak.", keys: ["copy", "deepcopy", "ichki ob'ekt", "havola"] },
  { topic: "python", type: "written", d: 4, text: "Context manager (`with`) qanday ishlaydi? `__enter__`/`__exit__` ni tushuntiring.", rubric: "Resursni ochish-yopishni kafolatlashi, with blokidan chiqishda __exit__ chaqirilishi va fayl/ulash misoli bo'lishi kerak.", keys: ["with", "__enter__", "__exit__", "resurs"] },
  { topic: "python", type: "written", d: 5, text: "Asyncio event loop nimaligi va thread'dan farqi: I/O-bound vazifada nima uchun asyncio tanlanadi?", rubric: "Bitta oqimda event loop, await bilan kutish payti boshqa vazifaga o'tish, thread xarajatlari yo'qligi va I/O-bound misol bo'lishi kerak.", keys: ["asyncio", "event loop", "await", "I/O"] },

  // ================= NODE.JS (14) =================
  { topic: "nodejs", type: "mcq", d: 0, text: "Node.js nima?", options: ["JavaScript'ni serverda ishga tushiruvchi muhit", "Brauzer", "Ma'lumotlar bazasi", "CSS freymvorki"], correct: 0 },
  { topic: "nodejs", type: "mcq", d: 0, text: "`npm install` nima qiladi?", options: ["Bog'liqliklarni o'rnatadi", "Serverni ishga tushiradi", "Kod yozadi", "Test o'tkazadi"], correct: 0 },
  { topic: "nodejs", type: "written", d: 0, text: "Node.js'da `require` va `import` farqi (CommonJS vs ES module)?", rubric: "require sinxron CommonJS (module.exports), import ES module sintaksisi ekani va fayl kengaytmasi/package.json type maydoni eslatilsa yaxshi.", keys: ["require", "import", "module", "exports"] },
  { topic: "nodejs", type: "mcq", d: 1, text: "`fs.readFile` qanday ishlaydi?", options: ["Asinxron — callback/promise bilan", "Faqat sinxron", "Har doim bloklovchi", "Bazaga yozadi"], correct: 0 },
  { topic: "nodejs", type: "mcq", d: 1, text: "Express'da `app.get('/x', handler)` nima qiladi?", options: ["GET so'roviga ishlovchi ro'yxatdan o'tkazadi", "Baza jadvali yaratadi", "Middleware o'chiradi", "Fayl o'qiydi"], correct: 0 },
  { topic: "nodejs", type: "written", d: 1, text: "EventEmitter nima? `on`/`emit` bilan misol keltiring.", rubric: "Hodisa nomiga tinglovchi (listener) bog'lash va emit bilan chaqirish mexanizmi misolda ko'rsatilishi kerak.", keys: ["emit", "on", "hodisa", "tinglovchi"] },
  { topic: "nodejs", type: "mcq", d: 2, text: "Middleware nima?", options: ["So'rov-javob zanjiridagi oraliq funksiya", "Baza indeksi", "CSS qatlami", "Test turi"], correct: 0 },
  { topic: "nodejs", type: "written", d: 2, text: "Node.js bitta oqimda minglab ulanishni qanday ko'taradi?", rubric: "Event loop, bloklanmaydigan (non-blocking) I/O va navbat mexanizmi tushuntirilishi kerak. Sinxron bloklash xavfi eslatilsa yaxshi.", keys: ["event loop", "non-blocking", "I/O", "navbat"] },
  { topic: "nodejs", type: "written", d: 2, text: "`POST /users` ikki marta yuborilsa nima bo'ladi? Idempotentlik bilan bog'lang.", rubric: "POST idempotent emas — takroriy so'rov ikki yozuv yaratishi, shuning uchun Idempotency-Key kerakligi aytilishi kerak.", keys: ["POST", "takror", "ikki yozuv", "idempotent"] },
  { topic: "nodejs", type: "mcq", d: 3, text: "`process.nextTick` va `setImmediate` farqi?", options: ["nextTick joriy operatsiyadan keyin darhol, setImmediate keyingi iteratsiyada", "Bir xil narsa", "Ikkalasi ham bir xil navbat", "Farqi yo'q"], correct: 0 },
  { topic: "nodejs", type: "written", d: 3, text: "Stream nima va katta faylni o'qishda nima uchun kerak? `pipe` misoli.", rubric: "Ma'lumotni bo'laklab (chunk) uzatish, xotirani tejash va readable.pipe(writable) misoli bo'lishi kerak.", keys: ["stream", "pipe", "xotira", "chunk"] },
  { topic: "nodejs", type: "written", d: 3, text: "JWT bilan sessiya (cookie) autentifikatsiyasini solishtiring: qayerda qaysi?", rubric: "JWT stateless (server xotira talab qilmaydi, bekor qilish qiyin), sessiya stateful (xotira kerak, bekor qilish oson) — tanlash mezoni bilan aytilishi kerak.", keys: ["JWT", "cookie", "stateless", "sessiya"] },
  { topic: "nodejs", type: "written", d: 4, text: "Cluster moduli va worker_threads farqi: qachon qaysi birini tanlaysiz?", rubric: "Cluster — jarayonlar (har biri event loop), worker — iplar (xotira bo'lishadi); CPU-bound uchun worker/cluster, I/O uchun bitta jarayon yetishi aytilishi kerak.", keys: ["cluster", "worker", "jarayon", "CPU"] },
  { topic: "nodejs", type: "written", d: 5, text: "Backpressure nima? Tez producer + sekin consumer holatida stream'da qanday boshqariladi?", rubric: "Bufer to'lib ketishi muammosi, pause/resume yoki pipe avtomatik boshqaruvi va yuqori suv belgisi (highWaterMark) eslatilishi kerak.", keys: ["backpressure", "buffer", "pause", "oqim"] },

  // ================= JAVA (14) =================
  { topic: "java", type: "mcq", d: 0, text: "Java'da `main` metod imzosi qaysi?", options: ["public static void main(String[] args)", "void main()", "int main()", "main()"], correct: 0 },
  { topic: "java", type: "mcq", d: 0, text: "`int` tipi necha bit?", options: ["32 bit", "16 bit", "64 bit", "8 bit"], correct: 0 },
  { topic: "java", type: "written", d: 0, text: "JDK, JRE, JVM farqini bir gapdan ayting.", rubric: "JDK — kompilyator+asboblar, JRE — ishga tushirish muhiti, JVM — baytkodni bajaruvchi virtual mashina ekani aytilishi kerak.", keys: ["kompilyator", "ishlash muhiti", "virtual mashina"] },
  { topic: "java", type: "mcq", d: 1, text: "Java'da `String` nima uchun immutable?", options: ["Xavfsizlik + keshlash + thread-xavfsizlik", "O'zgaruvchan bo'lgani uchun", "Faqat raqam saqlaydi", "Sababi yo'q"], correct: 0 },
  { topic: "java", type: "mcq", d: 1, text: "`ArrayList` massivdan nimasi bilan farq qiladi?", options: ["Dinamik o'lcham", "Faqat primitiv saqlaydi", "O'zgarmas", "Har doim tezroq"], correct: 0 },
  { topic: "java", type: "written", d: 1, text: "Java'da `==` va `.equals()` farqi nima?", rubric: "`==` havolalarni, `.equals()` mazmunni solishtirishi, String uchun equals ishlatish kerakligi misolda bo'lishi kerak.", keys: ["havola", "mazmun", "equals", "qiymat"] },
  { topic: "java", type: "mcq", d: 2, text: "`static` kalit so'zi nimani anglatadi?", options: ["Sinifga tegishli — ob'ektsiz ishlaydi", "Doimiy o'zgaruvchi", "Faqat metod", "Interfeys belgisi"], correct: 0 },
  { topic: "java", type: "written", d: 2, text: "Inheritance vs composition: qachon meros, qachon kompozitsiya? Misol keltiring.", rubric: "is-a uchun meros, has-a uchun kompozitsiya; merosning qattiq bog'liqlik kamchiligi misol bilan aytilishi kerak.", keys: ["meros", "kompozitsiya", "is-a", "has-a"] },
  { topic: "java", type: "written", d: 2, text: "Checked vs unchecked exception farqi va `try-with-resources` nima?", rubric: "Checked kompilyatsiya vaqtida majburiy ushlanishi, unchecked RuntimeException ekani va resursni avtomatik yopish sintaksisi bo'lishi kerak.", keys: ["checked", "unchecked", "try", "resurs"] },
  { topic: "java", type: "mcq", d: 3, text: "`HashMap` ichki tuzilishi qanday?", options: ["Massiv + bucket (ro'yxat/daraxt)", "Faqat daraxt", "Faqat massiv", "Graf"], correct: 0 },
  { topic: "java", type: "written", d: 3, text: "Interface va abstract class farqi va tanlash mezoni.", rubric: "Interface — xulq shartnomasi (ko'p meros mumkin, holat yo'q), abstract — umumiy asos + holat; Java 8 default metodlar eslatilsa yaxshi.", keys: ["interface", "abstract", "meros", "holat"] },
  { topic: "java", type: "written", d: 3, text: "Garbage Collector asoslari: young/old generation va GC pauzasi nima?", rubric: "Heap bo'linishi, yangi ob'ektlar young'da, yashaganlar old'ga ko'chishi va tozalash pauzasi tushuntirilishi kerak.", keys: ["GC", "heap", "young", "pauza"] },
  { topic: "java", type: "written", d: 4, text: "Stream API: oraliq va terminal operatsiyalar farqi, lazy baholashni misolda ko'rsating.", rubric: "filter/map oraliq (lazy), collect/forEach terminal; terminal chaqirilmasdan hisob bajarilmasligi misolda bo'lishi kerak.", keys: ["stream", "filter", "collect", "lazy"] },
  { topic: "java", type: "written", d: 5, text: "Spring'da IoC/DI nima? Bean lifecycle'ni qisqacha tushuntiring.", rubric: "Ob'ektlarni konteyner yaratib injection qilishi, bean yaratish-sozlash-yo'q qilish bosqichlari bo'lishi kerak.", keys: ["IoC", "DI", "bean", "konteyner"] },

  // ================= GO (14) =================
  { topic: "go", type: "mcq", d: 0, text: "Go'da o'zgaruvchi e'lon qilishning qisqa usuli?", options: ["x := 5", "let x = 5", "x = 5 (e'lonsiz)", "dim x = 5"], correct: 0 },
  { topic: "go", type: "mcq", d: 0, text: "Go fayl kengaytmasi qaysi?", options: [".go", ".gol", ".g", ".goo"], correct: 0 },
  { topic: "go", type: "written", d: 0, text: "Go'da `package main` va `func main` nima uchun kerak?", rubric: "Bajariladigan dasturning kirish nuqtasi ekani, main paketsiz binary hosil bo'lmasligi aytilishi kerak.", keys: ["kirish nuqtasi", "bajariladigan", "main"] },
  { topic: "go", type: "mcq", d: 1, text: "Slice massivdan nimasi bilan farq qiladi?", options: ["Dinamik uzunlikdagi ko'rinish", "Bir xil narsa", "Slice o'zgarmas", "Massiv dinamik"], correct: 0 },
  { topic: "go", type: "mcq", d: 1, text: "`map` da yo'q kalit so'ralsa nima bo'ladi?", options: ["Zero value + ok=false", "Panic", "null", "Exception"], correct: 0 },
  { topic: "go", type: "written", d: 1, text: "Go'da xatolar qanday qaytariladi? `error` interfeysi va `if err != nil` pattern.", rubric: "Funksiya error qaytarishi, chaqiruvchi darhol tekshirishi va xatoni o'rash (%w) eslatilsa yaxshi.", keys: ["error", "nil", "tekshirish", "qaytarish"] },
  { topic: "go", type: "mcq", d: 2, text: "Goroutine qanday ishga tushiriladi?", options: ["go f()", "thread f()", "async f()", "new f()"], correct: 0 },
  { topic: "go", type: "written", d: 2, text: "Channel nima? Buffered va unbuffered farqi misol bilan.", rubric: "Goroutine'lar orasida qiymat uzatish, unbuffered'da jo'natuvchi-qabul qiluvchi uchrashishi, buffered'da sig'im borligi misolda bo'lishi kerak.", keys: ["channel", "buffer", "bloklanish", "uzatish"] },
  { topic: "go", type: "written", d: 2, text: "`defer` nima va bir nechta defer qanday tartibda ishlaydi?", rubric: "Funksiya oxirida bajarilishi (resurs yopish) va LIFO tartibi misolda ko'rsatilishi kerak.", keys: ["defer", "LIFO", "oxirida", "yopish"] },
  { topic: "go", type: "mcq", d: 3, text: "`select` nima uchun ishlatiladi?", options: ["Bir nechta channel'dan tayyorini kutish", "Saralash", "Menyu tanlash", "Switch o'rniga har doim"], correct: 0 },
  { topic: "go", type: "written", d: 3, text: "Race condition Go'da: misol + aniqlash va yechim.", rubric: "Ikkita goroutine bir xotiraga sinxronsiz yozishi misoli, `go run -race` va mutex/channel yechimi bo'lishi kerak.", keys: ["race", "mutex", "parallel", "sinxron"] },
  { topic: "go", type: "written", d: 3, text: "Go'da interface: implicit implementation nima? `any` nima?", rubric: "Metodlar to'plamini avtomatik qanoatlantirish (implements yozilmaydi) va bo'sh interface har qanday tip ekani aytilishi kerak.", keys: ["interface", "implicit", "any", "metod"] },
  { topic: "go", type: "written", d: 4, text: "Context (`context.Context`): bekor qilish va timeout qanday uzatiladi?", rubric: "So'rov chegarasida bekor qilish signali, WithTimeout/WithCancel va HTTP handler misoli bo'lishi kerak.", keys: ["context", "cancel", "timeout", "deadline"] },
  { topic: "go", type: "written", d: 5, text: "GMP scheduler qisqacha: goroutine'lar OS thread'lariga qanday taqsimlanadi? `GOMAXPROCS` roli.", rubric: "G (goroutine), M (thread), P (kontekst) va parallelizm chegarasi tushuntirilishi kerak.", keys: ["scheduler", "GOMAXPROCS", "thread", "navbat"] },

  // ================= HTML MCQ (4) =================
  { topic: "html", type: "mcq", d: 0, text: "Sarlavha uchun qaysi teg ishlatiladi?", options: ["<h1>", "<p>", "<div>", "<span>"], correct: 0 },
  { topic: "html", type: "mcq", d: 1, text: "`<a>` tegida manzil qaysi atributda beriladi?", options: ["href", "src", "link", "to"], correct: 0 },
  { topic: "html", type: "mcq", d: 2, text: "Qaysi biri semantik teg?", options: ["<article>", "<div>", "<span>", "<b>"], correct: 0 },
  { topic: "html", type: "mcq", d: 3, text: "Forma yuborish metodi qaysi atributda ko'rsatiladi?", options: ["method", "type", "send", "action-type"], correct: 0 },

  // ================= CSS MCQ (4) =================
  { topic: "css", type: "mcq", d: 0, text: "Matn rangini beruvchi xususiyat qaysi?", options: ["color", "background", "font-color", "text-color"], correct: 0 },
  { topic: "css", type: "mcq", d: 1, text: "Flex konteyner qanday yoqiladi?", options: ["display: flex", "flex: on", "position: flex", "float: flex"], correct: 0 },
  { topic: "css", type: "mcq", d: 2, text: "Qaysi selektor klassni tanlaydi?", options: [".btn", "#btn", "btn", "*btn"], correct: 0 },
  { topic: "css", type: "mcq", d: 3, text: "`position: absolute` nimaga nisbatan joylashadi?", options: ["Eng yaqin positionlangan ajdodga", "Har doim body'ga", "Har doim viewport'ga", "O'zining o'ziga"], correct: 0 }
];

async function main() {
  console.log("Stack savollari seed boshlandi...");
  let order = 100;
  const topicMap = new Map<string, string>();
  for (const t of NEW_TOPICS) {
    let topic = await prisma.topic.findUnique({ where: { slug: t.slug } });
    if (!topic) {
      topic = await prisma.topic.create({
        data: { name: t.name, slug: t.slug, color: t.color, order: order++ }
      });
      console.log(`+ topic: ${t.slug}`);
    }
    topicMap.set(t.slug, topic.id);
  }
  // Mavjud topic'lar (html/css) uchun ham id kerak
  for (const slug of ["html", "css"]) {
    const topic = await prisma.topic.findUnique({ where: { slug } });
    if (!topic) throw new Error(`Topic topilmadi: ${slug}`);
    topicMap.set(slug, topic.id);
  }

  let added = 0;
  let skipped = 0;
  for (const s of Q) {
    const topicId = topicMap.get(s.topic);
    if (!topicId) throw new Error(`Noma'lum mavzu: ${s.topic}`);
    const exists = await prisma.question.findFirst({
      where: { topicId, text: s.text, deletedAt: null }
    });
    if (exists) {
      skipped++;
      continue;
    }
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
        timeLimit: s.type === "mcq" ? 90 : 300
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
          rubric: s.rubric ?? null, keywords: s.keys ?? []
        })
      }
    });
    added++;
  }
  console.log(`✅ ${added} savol qo'shildi, ${skipped} tasi allaqachon bor edi`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
