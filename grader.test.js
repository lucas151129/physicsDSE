const fs = require("fs");
const vm = require("vm");
const path = require("path");

const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "grader.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "deepseek.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "grader.fixtures.js"), "utf8"), context);

const { QUESTIONS, CHAPTERS, parseNumber, gradeQuestion, interpretDeepseekGrade } = context;
const q = Object.fromEntries(QUESTIONS.map((item) => [item.id, item]));

function assert(name, condition) {
  if (!condition) {
    console.error("FAIL", name);
    process.exitCode = 1;
  } else {
    console.log("ok", name);
  }
}

assert("parse 900", parseNumber("900") === 900);
assert("parse scientific", parseNumber("9.00×10^2") === 900);
assert("parse superscript", parseNumber("5.40×10⁴") === 54000);
assert("parse fullwidth", parseNumber("９００") === 900);
assert("parse reject unit glued", parseNumber("900J") === null);

const boyleRight = gradeQuestion(q["q-boyle"], { choice: "B" });
assert("boyle right", boyleRight.earned === 1 && !boyleRight.error);
const boyleWrong = gradeQuestion(q["q-boyle"], { choice: "C" });
assert("boyle wrong", boyleWrong.earned === 0 && boyleWrong.detail.includes("開氏"));
assert("boyle empty", gradeQuestion(q["q-boyle"], {}).error);

const heatRight = gradeQuestion(q["q-specific"], { value: "9.00×10^2", unit: "J kg⁻¹ °C⁻¹" });
assert("specific heat full", heatRight.earned === 3);
const heatUnit = gradeQuestion(q["q-specific"], { value: "900", unit: "J" });
assert("specific heat unit", heatUnit.earned === 2 && heatUnit.headline.includes("單位"));
const heatQm = gradeQuestion(q["q-specific"], { value: "54000", unit: "J kg⁻¹ °C⁻¹" });
assert("specific heat Q/m", heatQm.earned === 1 && heatQm.headline.includes("溫差"));
const heatC = gradeQuestion(q["q-specific"], { value: "450", unit: "J °C⁻¹" });
assert("specific heat capacity C", heatC.earned === 1 && heatC.detail.includes("熱容量"));
const heatT = gradeQuestion(q["q-specific"], { value: "675", unit: "J kg⁻¹ °C⁻¹" });
assert("specific heat used final T", heatT.earned === 1);
const heatBad = gradeQuestion(q["q-specific"], { value: "123", unit: "J kg⁻¹ °C⁻¹" });
assert("specific heat unknown", heatBad.earned === 0 && heatBad.steps.length === 3);

const full =
  "蒸發時，動能較高的分子離開液面。留下的分子平均動能下降，所以溫度下降。";
const fullGrade = gradeQuestion(q["q-evap"], { text: full });
assert("evap full", fullGrade.earned === 3 && fullGrade.points.every((point) => point.hit));

const partial = "溫度下降是因為留下的分子動能低。";
const partialGrade = gradeQuestion(q["q-evap"], { text: partial });
assert(
  "evap partial",
  partialGrade.earned === 2 &&
    partialGrade.points.find((point) => point.id === "fast").hit === false
);

const vague = "因為水蒸發帶走熱，所以變涼。";
assert("evap vague", gradeQuestion(q["q-evap"], { text: vague }).earned === 0);
assert("evap empty", gradeQuestion(q["q-evap"], { text: "  " }).error);

const paraphrase = "能量高的分子走了，剩下的分子平均動能變低，溫度就下降。";
assert("evap paraphrase", gradeQuestion(q["q-evap"], { text: paraphrase }).earned === 3);

const evap = q["q-evap"];
const fromModel = interpretDeepseekGrade(
  evap,
  "水變涼",
  JSON.stringify({
    points: [
      { id: "fast", hit: true },
      { id: "remain", hit: false },
      { id: "temp", hit: "得到" },
    ],
    detail: "提到分子離開，也提到溫度。",
    reason: "未寫留下的分子",
  })
);
assert("deepseek marks", fromModel.earned === 2 && fromModel.source === "deepseek");
assert("deepseek miss remain", fromModel.points.find((point) => point.id === "remain").hit === false);
assert(
  "deepseek fenced",
  interpretDeepseekGrade(evap, "x", "```json\n{\"points\":[]}\n```").earned === 0
);
assert("deepseek bad json", interpretDeepseekGrade(evap, "x", "不是 json").error);
const clientSource = fs.readFileSync(path.join(__dirname, "deepseek.js"), "utf8");
assert("client does not call DeepSeek", !clientSource.includes("api.deepseek.com"));
assert("client does not store a key", !clientSource.includes("localStorage"));
const proxySource = fs.readFileSync(path.join(__dirname, "supabase/functions/grade-physics/index.ts"), "utf8");
assert("proxy reads server secret", proxySource.includes('Deno.env.get("DEEPSEEK_API_KEY")'));
assert("proxy has no pasted key", !/sk-[A-Za-z0-9]{8,}/.test(proxySource));

let points = 0;
for (const chapter of CHAPTERS) {
  for (const group of chapter.groups) points += group.points.length;
}
assert("79 knowledge points", points === 79);
const hours = CHAPTERS.reduce((sum, chapter) => sum + chapter.hours, 0);
assert("184 hours", hours === 184);

assert(
  "no sample scores",
  CHAPTERS.every((chapter) =>
    chapter.groups.every((group) => group.points.every((kp) => kp.score == null && kp.n == null))
  )
);

const openPoints = [];
for (const chapter of CHAPTERS) {
  for (const group of chapter.groups) {
    for (const kp of group.points) {
      if (kp.open) openPoints.push(kp);
    }
  }
}
assert(
  "three points open",
  openPoints.length === 3 &&
    openPoints[0].id === "motion.components" &&
    openPoints[0].name === "力的合成與分解進階題" &&
    openPoints[1].id === "motion.moment" &&
    openPoints[1].name === "力矩" &&
    openPoints[2].id === "motion.energy" &&
    openPoints[2].name === "能量守恆"
);

const bank = {};
vm.createContext(bank);
vm.runInContext(fs.readFileSync(path.join(__dirname, "questions.js"), "utf8"), bank);
vm.runInContext(fs.readFileSync(path.join(__dirname, "questions-energy.js"), "utf8"), bank);
assert("seventy practice questions", bank.QUESTIONS.length === 70);
assert(
  "questions are mc or calc",
  bank.QUESTIONS.every((item) => item.type === "mc" || item.type === "calc")
);
assert(
  "calc questions are short or long",
  bank.QUESTIONS.filter((item) => item.type === "calc").every((item) => item.length === "short" || item.length === "long")
);
assert(
  "questions stay on the open points",
  bank.QUESTIONS.every((item) => item.kpId === "motion.components" || item.kpId === "motion.moment" || item.kpId === "motion.energy")
);
const energy = bank.QUESTIONS.filter((item) => item.kpId === "motion.energy");
assert("forty energy multiple choice", energy.filter((item) => item.type === "mc").length === 40);
assert("twenty energy calculations", energy.filter((item) => item.type === "calc").length === 20);
assert(
  "energy levels split evenly",
  energy.filter((item) => item.level === "1" && item.type === "mc").length === 20 &&
    energy.filter((item) => item.level === "2" && item.type === "mc").length === 20 &&
    energy.filter((item) => item.level === "1" && item.type === "calc").length === 10 &&
    energy.filter((item) => item.level === "2" && item.type === "calc").length === 10
);
assert(
  "marking points add up",
  bank.QUESTIONS.filter((item) => item.type === "calc").every(
    (item) => item.points.reduce((sum, point) => sum + point.marks, 0) === item.marks
  )
);
const expectAnswer = {
  "energy-mc-01": "C",
  "energy-mc-12": "C",
  "energy-mc-21": "B",
  "energy-mc-22": "C",
  "energy-mc-23": "C",
  "energy-mc-24": "C",
  "energy-mc-31": "B",
  "energy-mc-40": "B",
};
for (const [id, answer] of Object.entries(expectAnswer)) {
  assert(id + " key", bank.QUESTIONS.find((item) => item.id === id).answer === answer);
}
const expectText = {
  "energy-calc-01": "24 J",
  "energy-calc-03": "10 m/s",
  "energy-calc-06": "10 m/s",
  "energy-calc-09": "7.2 m",
  "energy-calc-11": "6 m/s",
  "energy-calc-13": "6 m/s",
  "energy-calc-15": "8 m/s",
  "energy-calc-16": "0.8 m",
  "energy-calc-19": "10 m/s",
  "energy-calc-20": "15 J",
};
for (const [id, text] of Object.entries(expectText)) {
  const item = bank.QUESTIONS.find((question) => question.id === id);
  assert(id + " solution", item.solution.join(" ").includes(text));
}
assert("moment notes", bank.MOMENT_NOTES && bank.MOMENT_NOTES.title === "力矩知識點總結" && bank.MOMENT_NOTES.sections.length === 4);
const bankText = JSON.stringify(bank.QUESTIONS) + JSON.stringify(bank.MOMENT_NOTES);
assert("bank is not the publisher paper", !/07A1Q|活學物理|Pearson/.test(bankText));
const beam = bank.QUESTIONS.find((item) => item.id === "moment-long-1");
assert("beam answer", Array.isArray(beam.solution) && beam.solution.join(" ").includes("70 N"));
