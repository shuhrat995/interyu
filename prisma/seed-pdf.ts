// PDF'dan ("Intervyu savollari | Junior @frontend") 100 savolni bazaga qo'shish (append)
// Har bir savol: rubric (min 30 belgi) + kalit so'zlar + daraja (junior fokus: 0-2)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Seed = { topic: string; d: number; text: string; rubric: string; keys: string[] };

const TOPICS: { name: string; slug: string; color: string }[] = [
  { name: "HTML", slug: "html", color: "#e34f26" },
  { name: "CSS", slug: "css", color: "#1572b6" }
];

const Q: Seed[] = [
  // ===== HTML (15) =====
  { topic: "html", d: 0, text: "HTML nima?", rubric: "Javobda HTML — veb-sahifalar strukturasini yaratuvchi markup (belgilash) tili ekanligi, elementlar va teglar orqali mazmun va tuzilish berilishi aytilishi kerak. HTML programmalash tili emasligi ta'kidlangan kuchli javob hisoblanadi.", keys: ["markup", "struktura", "teg", "veb-sahifa"] },
  { topic: "html", d: 0, text: "HTML'da DOCTYPE nimani anglatadi?", rubric: "Javobda DOCTYPE brauzerga hujjat HTML versiyasini e'lon qilishi, HTML5'da <!DOCTYPE html> soddalashgani va standartlar rejimi (standards mode) yoqilishi kerak. Quirks mode haqida eslatma bonus.", keys: ["DOCTYPE", "e'lon", "standards mode", "HTML5"] },
  { topic: "html", d: 0, text: "<meta> tegining maqsadi nimada?", rubric: "Javobda meta teg hujjat haqida metama'lumot berishi (charset, viewport, description, author) aytilishi kerak. SEO va viewport misollari keltirilsa kuchli javob.", keys: ["meta", "metama'lumot", "charset", "viewport", "description"] },
  { topic: "html", d: 1, text: "HTML va XHTML o'rtasidagi farq nimada?", rubric: "Javobda XHTML XML qoidalariga asoslangan qattiq sintaksis (barcha teglar yopilishi, kichik harf, atributlar qo'shtirnoqda) va HTML nisbatan erkin sintaksis farqi aytilishi kerak.", keys: ["XHTML", "XML", "sintaksis", "qattiq qoidalar"] },
  { topic: "html", d: 1, text: "Semantik HTML nima?", rubric: "Javobda semantik HTML — mazmun ma'nosini ifodlovchi teglar ishlatish (header, nav, article, section, footer) aytilishi kerak. SEO va accessibility (a11y) foydalari zikr etilsa yuqori ball.", keys: ["semantik", "header", "nav", "article", "SEO", "accessibility"] },
  { topic: "html", d: 0, text: "<div> va <span> o'rtasidagi farqni tavsiflang.", rubric: "Javobda div blok darajadagi (block-level), span satr ichidagi (inline) konteyner ekanligi aytilishi kerak. Semantik ma'no bermasligi ta'kidlangan kuchli javob.", keys: ["div", "span", "block", "inline", "konteyner"] },
  { topic: "html", d: 2, text: "<canvas> elementidan foydalanishni tushuntiring.", rubric: "Javobda canvas — JavaScript orqali dinamik grafika chizish uchun raster maydon ekanligi, 2D context yoki WebGL ishlatilishi aytilishi kerak. Animatsiya, o'yin, diagramma misollari va canvas qayta chizilishi (redraw) eslatilsa yuqori ball.", keys: ["canvas", "2d context", "WebGL", "grafika", "raster"] },
  { topic: "html", d: 1, text: "HTML5'dagi ma'lumot atributlari (data-*) nima?", rubric: "Javobda data-* atributlari elementga maxsus ma'lumot biriktirish uchun, dataset API orqali o'qilishi aytilishi kerak. CSS [data-x] selektori va JS misoli keltirilsa kuchli javob.", keys: ["data-*", "dataset", "maxsus atribut", "ma'lumot"] },
  { topic: "html", d: 0, text: "<img> tegidagi alt atributi qanday maqsadda ishlatiladi?", rubric: "Javobda alt — rasm yuklanmasa yoki foydalanuvchi ko'rmasa (ekran o'quvchi) matn muqova taqdim etishi aytilishi kerak. Accessibility va SEO foydasi eslatilsa yuqori ball.", keys: ["alt", " accessibility", "ekran o'quvchi", "muqova matn"] },
  { topic: "html", d: 0, text: "HTML'da gipermurojaatni (havola) qanday yaratish mumkin?", rubric: "Javobda <a> tegi va href atributi ishlatilishi, ichki/tashqi havolalar, target=\"_blank\" misollari ko'rsatilishi kerak. rel=\"noopener\" xavfsizligi eslatilsa bonus.", keys: ["a", "href", "havola", "target", "noopener"] },
  { topic: "html", d: 0, text: "HTML'da <head> tegi qanday maqsadda ishlatiladi?", rubric: "Javobda head — hujjat metama'lumotlari (title, meta, link, style, script) konteyneri, sahifada ko'rinmasligi aytilishi kerak. body bilan farqi ta'kidlangan kuchli javob.", keys: ["head", "metama'lumot", "title", "link", "body"] },
  { topic: "html", d: 0, text: "<ol> va <ul> elementlari o'rtasidagi farqni tushuntiring.", rubric: "Javobda ol tartiblangan (raqamli), ul tartibsiz (belgili) ro'yxat ekanligi, li elementlari bilan ishlatilishi aytilishi kerak.", keys: ["ol", "ul", "ro'yxat", "raqamli", "belgili"] },
  { topic: "html", d: 1, text: "HTML'da lang atributining ahamiyati nimada?", rubric: "Javobda lang hujjat tilini belgilashi, ekran o'quvchilar talaffuz, imlo tekshiruvi va tarjima, SEO uchun muhimligi aytilishi kerak. lang=\"uz\" misoli kuchli javob.", keys: ["lang", "til", "accessibility", "SEO", "tarjima"] },
  { topic: "html", d: 0, text: "HTML'da <form> elementining maqsadi nimada?", rubric: "Javobda form — foydalanuvchi kiritgan ma'lumotlarni yig'ib serverga yuborish konteyneri, action va method atributlari aytilishi kerak. Input turlari va validatsiya eslatilsa yuqori ball.", keys: ["form", "action", "method", "input", "yuborish"] },
  { topic: "html", d: 1, text: "HTML formalarida target atributi qanday ishlaydi?", rubric: "Javobda target javob qayerda ochilishini belgilashi (_self, _blank, _parent, _top yoki iframe nomi) aytilishi kerak. _blank'da rel=\"noopener\" xavfsizligi zikr etilsa bonus.", keys: ["target", "_self", "_blank", "iframe", "noopener"] },

  // ===== CSS (15) =====
  { topic: "css", d: 0, text: "CSS nima va u nimani anglatadi?", rubric: "Javobda CSS — Cascading Style Sheets, HTML elementlariga uslub (rang, shrift, joylashuv) beruvchi til ekanligi aytilishi kerak. Kaskad tushunchasi eslatilsa kuchli javob.", keys: ["Cascading Style Sheets", "uslub", "kaskad", "HTML"] },
  { topic: "css", d: 1, text: "Inline, block va inline-block elementlari o'rtasidagi farqni tushuntiring.", rubric: "Javobda block butun satrni egallashi va o'lcham qabul qilishi, inline faqat mazmun kengligida va o'lcham qabul qilmasligi, inline-block satr ichida qolib o'lcham qabul qilishi aytilishi kerak. Misollar (div, span, img) keltirilsa yuqori ball.", keys: ["block", "inline", "inline-block", "satr", "o'lcham"] },
  { topic: "css", d: 1, text: "CSS'da box modelini tavsiflang.", rubric: "Javobda box model — content, padding, border, margin qatlamlari aytilishi kerak. box-sizing: border-box bilan umumiy kenglik hisoblash farqi tushuntirilsa yuqori ball.", keys: ["content", "padding", "border", "margin", "box-sizing"] },
  { topic: "css", d: 2, text: "CSS'da clear xususiyatining maqsadi nimada?", rubric: "Javobda clear — float qilingan elementlardan keyin elementni pastga tushirish (left/right/both) aytilishi kerak. Modern yechim (clearfix, display: flow-root) eslatilsa bonus.", keys: ["clear", "float", "clearfix", "flow-root"] },
  { topic: "css", d: 1, text: "position: relative va position: absolute o'rtasidagi farqni tushuntiring.", rubric: "Javobda relative — element o'z o'rniga nisbatan siljiydi va oqimda qoladi, absolute — eng yaqin pozitsiyalangan ajdodga nisbatan joylashadi va oqimdan chiqadi aytilishi kerak. z-index va top/left misollari kuchli javob.", keys: ["relative", "absolute", "pozitsiya", "oqim", "ajdod"] },
  { topic: "css", d: 2, text: "CSS selektorining aniqlovchiligi (specificity) nima va u qanday hisoblanadi?", rubric: "Javobda specificity — qaysi qoida g'alaba qozonishini belgilovchi og'irlik: inline (1000), id (100), class/attr/pseudo-class (10), element/pseudo-element (1) aytilishi kerak. !important va takroriy class misollari bonus.", keys: ["specificity", "id", "class", "inline", "!important"] },
  { topic: "css", d: 1, text: "CSS yordamida elementni gorizontal va vertikal ravishda qanday markazlash mumkin?", rubric: "Javobda kamida ikki usul kerak: flex (justify-content + align-items: center), grid (place-items: center), yoki absolute + transform: translate(-50%,-50%) aytilishi kerak. Margin: auto holati eslatilsa bonus.", keys: ["flex", "grid", "transform", "justify-content", "align-items", "place-items"] },
  { topic: "css", d: 1, text: "CSS'da float xususiyatining maqsadi nimada?", rubric: "Javobda float — elementni chapga/o'ngga surib matn atrofini o'rash uchun yaratilgani, tarixda layout'da ishlatilgani aytilishi kerak. Flex/Grid kelishi bilan layout'da foydalanish kamaygani bonus.", keys: ["float", "o'rash", "layout", "flex", "grid"] },
  { topic: "css", d: 0, text: "Padding va margin o'rtasidagi farqni tavsiflang.", rubric: "Javobda padding — element ichidagi bo'shliq (content va border orasida, fon rangi ichida), margin — tashqi bo'shliq (element va qo'shni elementlar orasida) aytilishi kerak. Margin collapse eslatilsa bonus.", keys: ["padding", "margin", "ichki", "tashqi", "collapse"] },
  { topic: "css", d: 1, text: "display: none; xususiyati visibility: hidden; dan qanday farq qiladi?", rubric: "Javobda display: none — element oqimdan butunlay chiqadi (joy egallamaydi), visibility: hidden — ko'rinmas lekin joyi saqlanadi aytilishi kerak. Transition/re-render ta'siri eslatilsa bonus.", keys: ["display: none", "visibility: hidden", "oqim", "joy"] },
  { topic: "css", d: 2, text: "CSS oldindan ishlovchi (preprocessor) nima va uni nima uchun ishlatish mumkin?", rubric: "Javobda preprocessor (Sass/SCSS, Less, Stylus) — CSS'ga o'zgaruvchi, ichma-ichlik (nesting), mixin, funksiya qo'shuvchi vosita, kompilyatsiya bilan oddiy CSS'ga aylanishi aytilishi kerak. Qayta ishlatish va izchillik foydalari bonus.", keys: ["Sass", "SCSS", "Less", "o'zgaruvchi", "mixin", "nesting"] },
  { topic: "css", d: 1, text: "CSS'da box-sizing xususiyati nima?", rubric: "Javobda box-sizing — kenglik/balandlik hisobiga padding va border kiritilsinmi degan savolga javob berishi: content-box (default) vs border-box aytilishi kerak. Universal border-box reset misoli kuchli javob.", keys: ["box-sizing", "content-box", "border-box", "kenglik"] },
  { topic: "css", d: 0, text: "Tashqi CSS fayllarni HTML'ga qanday kiritish mumkin?", rubric: "Javobda <link rel=\"stylesheet\" href=\"...\"> head ichida ishlatilishi, @import alternativasi (sekinroq) aytilishi kerak. Inline style va style tegi bilan farqi bonus.", keys: ["link", "stylesheet", "@import", "head", "inline"] },
  { topic: "css", d: 1, text: "CSS'da em va rem o'lchov birligi o'rtasidagi farq nima?", rubric: "Javobda em — ota element shriftiga nisbatan, rem — ildiz (html) shriftiga nisbatan aytilishi kerak. Rem izchillik afzalligi va responsive foydasi eslatilsa yuqori ball.", keys: ["em", "rem", "shrift", "nisbatan", "ildiz"] },
  { topic: "css", d: 1, text: "CSS'da z-index xususiyati qanday ishlaydi?", rubric: "Javobda z-index — pozitsiyalangan (relative/absolute/fixed/sticky) elementlarning ustma-ust tushish tartibini belgilashi, katta qiymat yuqorida turishi aytilishi kerak. Stacking context tushunchasi bonus.", keys: ["z-index", "pozitsiya", "stacking context", "ustma-ust"] },

  // ===== Integratsiya (10) =====
  { topic: "css", d: 0, text: "JavaScript faylini HTML fayliga qanday bog'lash mumkin?", rubric: "Javobda <script src=\"...\"> tegi (head yoki body oxirida) ishlatilishi aytilishi kerak. defer/async atributlari va inline script farqi eslatilsa yuqori ball.", keys: ["script", "src", "defer", "async", "inline"] },
  { topic: "css", d: 1, text: "Skript tegida defer atributining maqsadi nima?", rubric: "Javobda defer — skript HTML parse bo'lib bo'lgach, DOMContentLoaded'dan oldin tartib bilan bajarilishi, parse bloklanmasligi aytilishi kerak. async bilan farqi ta'kidlangan kuchli javob.", keys: ["defer", "parse", "DOMContentLoaded", "tartib", "async"] },
  { topic: "css", d: 0, text: "Tashqi CSS faylini HTML hujjatiga qanday kiritish mumkin?", rubric: "Javobda <link rel=\"stylesheet\"> orqali head'da kiritilishi aytilishi kerak. @import va bir nechta fayl ketma-ketligi eslatilsa bonus.", keys: ["link", "rel", "stylesheet", "href", "@import"] },
  { topic: "css", d: 0, text: "Dizaynda viewport meta tegining ahamiyati nimada?", rubric: "Javobda viewport meta (width=device-width, initial-scale=1) mobil brauzerga sahifa kengligini qurilma ekraniga moslashni buyurishi, responsive dizayn uchun majburiy ekanligi aytilishi kerak.", keys: ["viewport", "device-width", "initial-scale", "responsive", "mobil"] },
  { topic: "css", d: 1, text: "CSS'da @media qoidasining maqsadi nimada?", rubric: "Javobda @media — ekran kengligi, orientatsiya, rezolyutsiya shartlariga qarab turli uslublar qo'llash (responsive breakpoints) aytilishi kerak. min-width/max-width misoli kuchli javob.", keys: ["@media", "media query", "breakpoint", "responsive", "min-width"] },
  { topic: "css", d: 1, text: "Tashqi JavaScript kutubxonalarini loyihangizga qanday kiritish mumkin?", rubric: "Javobda CDN script tegi, npm install + bundler import, yoki module import usullari aytilishi kerak. Kiritish tartibi va versioning eslatilsa bonus.", keys: ["CDN", "npm", "import", "bundler", "script"] },
  { topic: "css", d: 0, text: "HTML5'da <!DOCTYPE html> e'lonining maqsadi nimada?", rubric: "Javobda DOCTYPE — brauzerga standartlar rejimida render qilishni buyurish, eski quirks mode'dan saqlanish aytilishi kerak. Hujjatning birinchi qatori bo'lishi kerakligi bonus.", keys: ["DOCTYPE", "standards mode", "quirks", "render"] },
  { topic: "css", d: 2, text: "CSS va JavaScript yordamida veb-saytning ishlash samaradorligini qanday optimallashtirish mumkin?", rubric: "Javobda fayllarni minimallashtirish/gzip, kritik CSS inline, defer/async scriptlar, rasm optimizatsiya, keshlash, kam DOM manipulyatsiya (batch), will-change/transform bilan animatsiya usullaridan kamida 3 tasi aytilishi kerak. O'lchash (Lighthouse) eslatilsa yuqori ball.", keys: ["minimallashtirish", "defer", "keshlash", "rasm", "reflow", "Lighthouse"] },
  { topic: "css", d: 1, text: "<script> tegida lang atributining maqsadi nimada?", rubric: "Javobda lang — skript ichidagi matnlarning tili haqida metama'lumot (kechirim, bu amalda kam ishlatiladi, asosan accessibility uchun) aytilishi kerak. type atributi bilan farqi eslatilsa bonus.", keys: ["lang", "til", "metama'lumot", "accessibility"] },
  { topic: "css", d: 2, text: "CSS va JavaScript'da brauzerlar o'rtasidagi mos kelmaslik muammolarini qanday hal qilish mumkin?", rubric: "Javobda reset/normalize.css, vendor prefixlar (-webkit-), feature detection (@supports, Modernizr), transpile/polyfill (Babel, core-js), caniuse tekshiruvi usullaridan kamida 3 tasi aytilishi kerak. Browserslist eslatilsa bonus.", keys: ["normalize", "vendor prefix", "@supports", "polyfill", "Babel", "caniuse"] },

  // ===== Responsive dizayn (10) =====
  { topic: "css", d: 0, text: "Responsive dizayn nima?", rubric: "Javobda responsive dizayn — sahifa turli ekran o'lchamlariga (telefon, planshet, desktop) moslashuvchi yondashuv: flex grid, media query, mos rasm aytilishi kerak. Mobile-first eslatilsa bonus.", keys: ["responsive", "moslashuv", "media query", "ekran", "breakpoint"] },
  { topic: "css", d: 1, text: "Adaptive va responsive dizayn o'rtasidagi farqni tushuntiring.", rubric: "Javobda responsive — bir layout suyuq o'zgaradi (proportional), adaptive — aniq breakpoint'larda alohida qattiq layoutlar tanlanishi aytilishi kerak. Afzallik/kamchilik tahlili bonus.", keys: ["adaptive", "responsive", "breakpoint", "suyuq", "qattiq"] },
  { topic: "css", d: 0, text: "CSS'da media so'rovlari (@media queries) maqsadi nimada?", rubric: "Javobda media query — qurilma xususiyatlariga (kenglik, balandlik, orientatsiya) qarab shartli uslublar qo'llash aytilishi kerak. min-width breakpoint misoli kuchli javob.", keys: ["@media", "shartli", "kenglik", "breakpoint", "orientatsiya"] },
  { topic: "css", d: 1, text: "CSS framework nima va uni nima uchun ishlatish mumkin?", rubric: "Javobda framework (Bootstrap, Tailwind) — tayyor uslublar/grid/komponentlar to'plami, tez prototiplash va izchillik uchun aytilishi kerak. Kamchilik (shishgan CSS, o'xshash dizayn) eslatilsa yuqori ball.", keys: ["Bootstrap", "Tailwind", "grid", "komponent", "izchillik"] },
  { topic: "css", d: 1, text: "CSS grid tizimi responsive dizaynda qanday ishlaydi?", rubric: "Javobda grid — ikki o'lchamli (qator+ustun) layout tizimi, repeat/minmax/auto-fit bilan moslashuvchi panjara, fr birlik aytilishi kerak. grid-template misoli kuchli javob.", keys: ["grid", "qator", "ustun", "minmax", "auto-fit", "fr"] },
  { topic: "css", d: 1, text: "Veb-ishlab chiqishda mobile-first yondashuvi tushunchasini tushuntiring.", rubric: "Javobda mobile-first — baza uslublar kichik ekranga yozilib, min-width media query bilan kattaroq ekranlar kuchaytirilishi aytilishi kerak. Afzallik (performance, kontent fokus) eslatilsa yuqori ball.", keys: ["mobile-first", "min-width", "progressive", "kichik ekran"] },
  { topic: "css", d: 0, text: "Javobgar (responsive) dizaynda viewport meta tegining ahamiyati nimada?", rubric: "Javobda viewport meta'siz mobil brauzer desktop kengligida render qilib kichraytiradi, meta bilan device-width moslashadi aytilishi kerak. width=device-width, initial-scale=1 misoli kuchli javob.", keys: ["viewport", "device-width", "mobil", "kichraytirish", "scale"] },
  { topic: "css", d: 2, text: "Veb-saytni nogironlikka ega foydalanuvchilar uchun qanday qilib qulay qilish mumkin?", rubric: "Javobda semantik HTML, alt matnlar, aria atributlari, klaviatura navigatsiya, kontrast (WCAG AA), focus holati, form label'lar usullaridan kamida 4 tasi aytilishi kerak. Ekran o'quvchi sinovi bonus.", keys: ["aria", "alt", "klaviatura", "kontrast", "WCAG", "focus", "label"] },
  { topic: "css", d: 1, text: "Responsive dizaynda rem o'lchov birligi maqsadi nimada?", rubric: "Javobda rem — ildiz shriftga nisbatan birlik, butun sahifa o'lchamlarini bir joydan (html font-size) masshtablash imkonini berishi aytilishi kerak. Media query bilan ildizni o'zgartirish misoli bonus.", keys: ["rem", "ildiz", "masshtab", "font-size", "proportional"] },
  { topic: "css", d: 1, text: "Responsive dizaynda max-width xususiyatining roli nimada?", rubric: "Javobda max-width — elementning maksimal kenglik chegarasi (masalan img { max-width: 100% } konteynerdan chiqmasligi, konteyner max-width + margin auto markazlash) aytilishi kerak. Media query'dagi roli ham eslatilsa bonus.", keys: ["max-width", "chegara", "img 100%", "konteyner", "markazlash"] },

  // ===== DOM va hodisalar (10) =====
  { topic: "html", d: 0, text: "DOM nima?", rubric: "Javobda DOM — hujjat obyekt modeli, HTML'ning daraxt ko'rinishidagi obyekt representation, JavaScript orqali o'zgartiriladigan interfeys aytilishi kerak. Node va element farqi bonus.", keys: ["DOM", "daraxt", "obyekt", "interfeys", "node"] },
  { topic: "html", d: 0, text: "JavaScript'da DOM'da elementlarni qanday tanlash mumkin?", rubric: "Javobda getElementById, querySelector/querySelectorAll, getElementsByClassName usullari aytilishi kerak. querySelector'ning CSS selektorlarni qo'llashi va static NodeList farqi bonus.", keys: ["getElementById", "querySelector", "querySelectorAll", "selektor"] },
  { topic: "html", d: 1, text: "innerHTML va textContent o'rtasidagi farqni tushuntiring.", rubric: "Javobda innerHTML — HTML'ni parse qilib ishlaydi (XSS xavfi), textContent — faqat matn, tezroq va xavfsiz aytilishi kerak. innerText bilan farqi (render) bonus.", keys: ["innerHTML", "textContent", "XSS", "parse", "xavfsiz"] },
  { topic: "html", d: 1, text: "JavaScript'da hodisalar delegatsiyasi qanday ishlaydi?", rubric: "Javobda delegatsiya — har bir bolaga alohida listener o'rniga ota elementga bitta listener, event.target bilan kim bosilganini aniqlash, bubbling'dan foydalanish aytilishi kerak. Dinamik elementlar uchun foydasi yuqori ball.", keys: ["delegatsiya", "event.target", "bubbling", "ota", "dinamik"] },
  { topic: "html", d: 0, text: "addEventListener metodining maqsadi nimada?", rubric: "Javobda addEventListener — elementga hodisa tinglovchi biriktirish (click, keydown, submit), bir elementga bir nechta listener qo'shish imkonini berishi aytilishi kerak. options (once, passive) bonus.", keys: ["addEventListener", "hodisa", "listener", "click", "once"] },
  { topic: "html", d: 1, text: "JavaScript'da hodisaning standart xatti-harakatini qanday to'xtatish mumkin?", rubric: "Javobda event.preventDefault() — standart harakatni (havola o'tish, forma yuborish) bekor qilish aytilishi kerak. stopPropagation bilan farqi ta'kidlangan kuchli javob.", keys: ["preventDefault", "standart", "havola", "forma", "stopPropagation"] },
  { topic: "html", d: 1, text: "focus va blur hodisalari o'rtasidagi farqni tavsiflang.", rubric: "Javobda focus — element fokus olganda, blur — yo'qotganda ishlaydi aytilishi kerak. focusin/focusout (bubble qiladi) farqi eslatilsa bonus.", keys: ["focus", "blur", "fokus", "focusin", "focusout"] },
  { topic: "html", d: 1, text: "event.stopPropagation() metodining maqsadi nimada?", rubric: "Javobda stopPropagation — hodisa bubbling/capturing bo'ylab ajdodlarga tarqalishini to'xtatish aytilishi kerak. preventDefault bilan farqi va delegatsiyaga ta'siri bonus.", keys: ["stopPropagation", "bubbling", "tarqalish", "preventDefault"] },
  { topic: "html", d: 1, text: "JavaScript yordamida DOM'da dinamik tarzda elementlarni qanday yaratish mumkin?", rubric: "Javobda createElement, textContent/innerHTML to'ldirish, appendChild/append bilan qo'shish aytilishi kerak. Fragment bilan batch qo'shish (performance) eslatilsa yuqori ball.", keys: ["createElement", "appendChild", "fragment", "batch", "performance"] },
  { topic: "html", d: 1, text: "HTML5'da data-* atributlari maqsadi nima?", rubric: "Javobda data-* — elementga maxsus ma'lumot biriktirish, dataset API (el.dataset.userId) orqali o'qish/yozish aytilishi kerak. CSS va JS misollari kuchli javob.", keys: ["data-*", "dataset", "maxsus", "ma'lumot"] },

  // ===== ES6+ (10) =====
  { topic: "javascript", d: 1, text: "JavaScript'da arrow functions nima?", rubric: "Javobda arrow funksiya — qisqa sintaksis va o'z this'i bo'lmagan (lex this — tashqi muhitdan oladi) funksiya aytilishi kerak. Oddiy funksiya bilan this farqi va arguments yo'qligi ta'kidlangan kuchli javob.", keys: ["arrow", "this", "lex", "sintaksis", "arguments"] },
  { topic: "javascript", d: 0, text: "ES6'da taqdim etilgan let va const kalit so'zlarni tavsiflang.", rubric: "Javobda let — blok doirali qayta tayinlanadigan, const — blok doirali qayta tayinlanmaydigan o'zgaruvchi aytilishi kerak. const'da obyekt muzlashi (Object.freeze) va TDZ eslatilsa yuqori ball.", keys: ["let", "const", "blok doira", "TDZ", "freeze"] },
  { topic: "javascript", d: 1, text: "JavaScript'da tuzilishni ajratish (destructuring assignment) nima?", rubric: "Javobda destructuring — obyekt/massivdan qiymatlarni ajratib olish sintaksisi ({a, b} = obj, [x, y] = arr), default qiymat va rest bilan birga aytilishi kerak. Funksiya parametrlarida ishlatish misoli kuchli javob.", keys: ["destructuring", "obyekt", "massiv", "default", "rest"] },
  { topic: "javascript", d: 0, text: "ES6'da shablon literal (template literals) maqsadi nimada?", rubric: "Javobda template literal — backtick ichida ${} orqali ifoda qo'yish, ko'p qatorli matn yozish imkonini berishi aytilishi kerak. Tagged templates bonus.", keys: ["template literal", "backtick", "${}", "ko'p qator"] },
  { topic: "javascript", d: 0, text: "ES6'da let va const kalit so'zlari nima?", rubric: "Javobda ikkalasi blok doirali o'zgaruvchi e'loni: let qayta tayinlanadi, const bo'lmaydi (lekin obyekt mazmuni o'zgarishi mumkin) aytilishi kerak. var bilan farqi (hoisting, TDZ) ta'kidlangan kuchli javob.", keys: ["let", "const", "blok", "var", "TDZ"] },
  { topic: "javascript", d: 1, text: "ES6'da import va export bayonotlaridan qanday foydalanish mumkin?", rubric: "Javobda named export/import, default export, re-export misollari ko'rsatilishi kerak. Dynamic import() va CommonJS bilan farqi bonus.", keys: ["import", "export", "default", "named", "module"] },
  { topic: "javascript", d: 1, text: "JavaScript'da tarqatish operatori (...) maqsadi nimada?", rubric: "Javobda spread — massiv/obyektni tarqatish ([...arr], {...obj}), funksiya chaqiruvda argument tarqatish; rest — parametrlarda yig'ish aytilishi kerak. Sayoz nusxalash (shallow copy) eslatilsa bonus.", keys: ["spread", "rest", "nusxalash", "argument", "shallow"] },
  { topic: "javascript", d: 2, text: "ES6'da class sintaksisi va uning ob'ektga yo'naltirilgan dasturlash bilan bog'liqligini tavsiflang.", rubric: "Javobda class — prototip merosi ustidagi sintaktik shakar, constructor, extends (meros), super, statik metodlar aytilishi kerak. Prototipga tushishi (syntactic sugar) ta'kidlangan yuqori ball.", keys: ["class", "constructor", "extends", "super", "prototip", "sintaktik shakar"] },
  { topic: "javascript", d: 1, text: "JavaScript'da promises va async/await tushuntiring.", rubric: "Javobda promise — kelajakdagi qiymat (pending/fulfilled/rejected), then/catch zanjiri; async/await — asinxron kodni sinxron ko'rinishda yozish, try/catch bilan xato ushlash aytilishi kerak. Promise.all eslatilsa bonus.", keys: ["promise", "async", "await", "then", "catch", "try/catch"] },
  { topic: "javascript", d: 1, text: "JavaScript'da rest parameters nima?", rubric: "Javobda rest parametr — funksiya argumentlarini massiv sifatida yig'ish (...args), arguments obyektidan farqi (haqiqiy massiv) aytilishi kerak. Destructuring'dagi rest ham eslatilsa bonus.", keys: ["rest", "massiv", "arguments", "yig'ish"] },

  // ===== Performans (10) =====
  { topic: "algorithms", d: 2, text: "Veb-sahifaning yuklanish vaqtini qanday optimallashtirish mumkin?", rubric: "Javobda rasm optimizatsiya (webp, lazy), fayl minimallashtirish/gzip/brotli, CDN, keshlash, kritik CSS, defer script, kam HTTP so'rov usullaridan kamida 4 tasi aytilishi kerak. Core Web Vitals bilan o'lchash bonus.", keys: ["lazy", "minimallashtirish", "CDN", "kesh", "kritik CSS", "defer", "Web Vitals"] },
  { topic: "algorithms", d: 1, text: "Veb-ishlab chiqishda lazy loading (kechiktirilgan yuklash) tushunchasini tushuntiring.", rubric: "Javobda lazy loading — rasm/komponentni kerak bo'lganda (viewport'ga yaqinlashganda) yuklash, loading=\"lazy\" atributi va IntersectionObserver aytilishi kerak. Initial bundle kamayishi foydasi bonus.", keys: ["lazy", "loading=lazy", "IntersectionObserver", "viewport", "bundle"] },
  { topic: "algorithms", d: 2, text: "Veb-ishlab chiqishda guruhlash (bundling) va minimallashtirish (minification) maqsadi nimada?", rubric: "Javobda bundling — ko'p faylni birlashtirib HTTP so'rov kamaytirish, minification — bo'shliq/izoh o'chirib hajm kichraytirish (Webpack/Vite/esbuild) aytilishi kerak. Source map bilan debug bonus.", keys: ["bundle", "minify", "HTTP so'rov", "Webpack", "Vite", "source map"] },
  { topic: "algorithms", d: 2, text: "Veb-sahifada HTTP so'rovlarining sonini qanday kamaytirish mumkin?", rubric: "Javobda fayllarni birlashtirish (bundle), sprite/ikon shrift, data URI, HTTP/2 multiplexing, kesh eslatilishi kerak. HTTP/2 bilan birleshtirish ahamiyati kamaygani bonus.", keys: ["bundle", "sprite", "data URI", "HTTP/2", "kesh"] },
  { topic: "algorithms", d: 2, text: "Kontent yetkazib berish tarmog'i (CDN) ishlatishning ahamiyatini tavsiflang.", rubric: "Javobda CDN — geografik taqsimlangan serverlar, foydalanuvchiga eng yaqinidan kontent berish (past latency), origin yukini kamaytirish, DDoS himoyasi aytilishi kerak. Kesh invalidatsiya bonus.", keys: ["CDN", "latency", "geografik", "kesh", "origin", "DDoS"] },
  { topic: "algorithms", d: 2, text: "JavaScript va guruhlash kontekstida tree shaking nima?", rubric: "Javobda tree shaking — bundler'ning ishlatilmagan exportlarni yakuniy bundle'dan chiqarib tashlashi (ES module statik tahlil asosida) aytilishi kerak. sideEffects flag eslatilsa bonus.", keys: ["tree shaking", "dead code", "ES module", "statik tahlil", "sideEffects"] },
  { topic: "algorithms", d: 1, text: "Skriptlarning sinxron va asinxron yuklanishi o'rtasidagi farqni tushuntiring.", rubric: "Javobda sinxron (default) script — parse bloklaydi; async — yuklash parallel, bajarish darhol (tartib kafolat yo'q); defer — parse'dan keyin tartib bilan aytilishi kerak. Qaysi holatda qaysi mosligi yuqori ball.", keys: ["async", "defer", "bloklash", "tartib", "parse"] },
  { topic: "algorithms", d: 1, text: "Veb-sahifada tasvirlarni qanday optimallashtirish mumkin?", rubric: "Javobda format tanlash (WebP/AVIF), siqish, to'g'ri o'lcham/srcset, lazy loading, responsive picture element usullaridan kamida 4 tasi aytilishi kerak. LCP ta'siri eslatilsa bonus.", keys: ["WebP", "AVIF", "srcset", "picture", "lazy", "siqish"] },
  { topic: "algorithms", d: 2, text: "rel=\"preload\" atributidan foydalanishning ahamiyatini tavsiflang.", rubric: "Javobda preload — brauzerga kritik resursni (shrif, CSS, rasm) erta, yuqori ustuvorlikda yuklashni buyurish, FOUT/FOIT kamaytirish aytilishi kerak. preload vs prefetch farqi bonus.", keys: ["preload", "kritik", "ustuvorlik", "shrift", "prefetch"] },
  { topic: "algorithms", d: 1, text: "Skript tegida defer atributi maqsadi nimada va bu sahifa yuklanishiga qanday ta'sir qiladi?", rubric: "Javobda defer — skript fondda parallel yuklanadi, HTML parse tugagach DOMContentLoaded oldin tartib bilan bajariladi; sahifa bloklanmaydi, FCP tezlashadi aytilishi kerak. async bilan solishtirish yuqori ball.", keys: ["defer", "parallel", "tartib", "bloklanmaydi", "FCP", "async"] }
];

async function main() {
  console.log("PDF savollari seed boshlandi...");
  const topicMap = new Map<string, string>();
  const allSlugs = Array.from(new Set([...TOPICS.map((t) => t.slug), ...Q.map((s) => s.topic)]));
  for (const slug of allSlugs) {
    const preset = TOPICS.find((t) => t.slug === slug);
    let topic = await prisma.topic.findUnique({ where: { slug } });
    if (!topic) {
      topic = await prisma.topic.create({
        data: { name: preset?.name ?? slug, slug, color: preset?.color ?? "#6d8cff" }
      });
      console.log(`Yangi mavzu: ${topic.name}`);
    }
    topicMap.set(slug, topic.id);
  }

  let added = 0;
  const skipped: string[] = [];
  for (const s of Q) {
    const topicId = topicMap.get(s.topic);
    if (!topicId) throw new Error(`Noma'lum mavzu: ${s.topic}`);
    // takrorlanmaslik: xuddi shu matnli savol bo'lsa o'tkazib yubor
    const exists = await prisma.question.findFirst({ where: { text: s.text, deletedAt: null } });
    if (exists) {
      skipped.push(s.text.slice(0, 50));
      continue;
    }
    const q = await prisma.question.create({
      data: {
        topicId,
        type: "written",
        difficulty: s.d,
        text: s.text,
        rubric: s.rubric,
        keywords: s.keys.join(","),
        timeLimit: 240
      }
    });
    await prisma.questionVersion.create({
      data: {
        questionId: q.id,
        version: 1,
        action: "create",
        snapshotJson: JSON.stringify({
          topicId, type: "written", difficulty: s.d, text: s.text,
          options: [], correctIndex: null, rubric: s.rubric,
          keywords: s.keys, timeLimit: 240
        })
      }
    });
    added++;
  }

  const byLevel: Record<number, number> = {};
  Q.forEach((s) => (byLevel[s.d] = (byLevel[s.d] ?? 0) + 1));
  console.log(`✅ ${added} savol qo'shildi, ${skipped.length} takror o'tkazib yuborildi`);
  console.log("Darajalar:", byLevel);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
