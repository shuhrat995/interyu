#!/usr/bin/env bash
# Intervyu API E2E smoke test
set -e
BASE="${1:-http://localhost:3000}"

echo "=== 1. Start ==="
START=$(curl -s -X POST "$BASE/api/interview/start" -H "Content-Type: application/json" -d '{"name":"Test Nomzod"}')
echo "$START" | head -c 300; echo
IID=$(echo "$START" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).interviewId))")
QID=$(echo "$START" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const q=JSON.parse(d).question;console.log(q.id)})")

echo "=== 2. correctIndex leak tekshiruvi ==="
if echo "$START" | grep -q "correctIndex"; then echo "❌ LEAK: correctIndex clientga yuborilgan!"; exit 1; else echo "✅ correctIndex yo'q"; fi

echo "=== 3. Noto'g'ri savolga javob (403 kutamiz) ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/interview/answer" -H "Content-Type: application/json" \
  -d "{\"interviewId\":\"$IID\",\"questionId\":\"bogus-id\",\"answerText\":\"test javob matni yetarli uzunlikda\"}")
echo "status: $CODE (403 bo'lishi kerak)"

echo "=== 4. Qisqa javob (422 kutamiz) ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/interview/answer" -H "Content-Type: application/json" \
  -d "{\"interviewId\":\"$IID\",\"questionId\":\"$QID\",\"answerText\":\"qisqa\"}")
echo "status: $CODE (422 bo'lishi kerak)"

echo "=== 5. To'g'ri javob ==="
QTYPE=$(echo "$START" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).question.type))")
echo "savol turi: $QTYPE"
if [ "$QTYPE" = "mcq" ]; then
  PAYLOAD5='"selectedIndex":0'
  PAYLOAD6='"selectedIndex":1'
else
  PAYLOAD5='"answerText":"Bu savolga batafsil javob: JavaScript event loop call stack va task navbatlarini boshqaradi, microtasklar macrotaskdan oldin bajariladi."'
  PAYLOAD6='"answerText":"Bu savolga batafsil javob: yana bir bor javob berishga harakat qilyapman yetarli uzunlikda matn bilan"'
fi
ANS=$(curl -s -X POST "$BASE/api/interview/answer" -H "Content-Type: application/json" \
  -d "{\"interviewId\":\"$IID\",\"questionId\":\"$QID\",$PAYLOAD5}")
echo "$ANS" | head -c 400; echo

echo "=== 6. Xuddi shu savolga qayta javob (409 kutamiz) ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/interview/answer" -H "Content-Type: application/json" \
  -d "{\"interviewId\":\"$IID\",\"questionId\":\"$QID\",$PAYLOAD6}")
echo "status: $CODE (409 bo'lishi kerak)"

echo "=== 7. Resume (GET /api/interview/:id) ==="
curl -s "$BASE/api/interview/$IID" | head -c 300; echo

echo "=== 8. Qolgan savollarga javob (cikl) ==="
for i in $(seq 1 20); do
  STATE=$(curl -s "$BASE/api/interview/$IID")
  FINISHED=$(echo "$STATE" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.status!=='in_progress'||!j.question?'yes':'no')})")
  if [ "$FINISHED" = "yes" ]; then echo "sessiya tugadi yoki savol yo'q (iteration $i)"; break; fi
  QID=$(echo "$STATE" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).question.id))")
  QTYPE2=$(echo "$STATE" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).question.type))")
  if [ "$QTYPE2" = "mcq" ]; then
    LOOP_PAYLOAD='"selectedIndex":0'
  else
    LOOP_PAYLOAD='"answerText":"Test javob: bu yerda mavzu boyicha asosiy tushunchalar, misollar va chegara holatlari korib chiqiladi, event loop, promise, closure, rendering kabi atamalar qamrab olinadi."'
  fi
  ANS=$(curl -s -X POST "$BASE/api/interview/answer" -H "Content-Type: application/json" \
    -d "{\"interviewId\":\"$IID\",\"questionId\":\"$QID\",$LOOP_PAYLOAD}")
  EVAL=$(echo "$ANS" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.finished?'FINISHED':(j.next?'next':'?'))})")
  if [ "$EVAL" = "FINISHED" ]; then echo "✅ Barcha savollar javoblandi ($i savoldan keyin)"; break; fi
done

echo "=== 9. Finish (yakuniy hisobot) ==="
curl -s -X POST "$BASE/api/interview/finish" -H "Content-Type: application/json" -d "{\"interviewId\":\"$IID\"}" | head -c 500; echo

echo "=== 10. Tozalash ==="
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.answer.deleteMany({ where: { interviewId: '$IID' } })
  .then(()=>p.interview.delete({ where: { id: '$IID' } }))
  .then(()=>console.log('test sessiyasi o\\'chirildi'))
  .finally(()=>p.\$disconnect());
"
echo "=== DONE ==="
