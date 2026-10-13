/* 每題的示意圖。按題意另畫，不引用試題庫的圖。圖上只標題目給出的量，不標答案。 */
var INK = "#1c1915";
var BLUE = "#1e4e86";
var GREEN = "#0e6b5c";
var RUST = "#9a3412";
var MUTED = "#6f675e";
var COLORS = { ink: INK, blue: BLUE, green: GREEN, rust: RUST };
var figN = 0;

function figXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgDoc(w, h, caption, builder) {
  figN += 1;
  const mid = "m" + figN;
  let defs = "<defs>";
  Object.keys(COLORS).forEach(function (name) {
    defs +=
      '<marker id="' +
      mid +
      name +
      '" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,3 L0,6 Z" fill="' +
      COLORS[name] +
      '"/></marker>';
  });
  defs += "</defs>";
  const pen = {
    arr: function (x1, y1, x2, y2, color) {
      const key = COLORS[color] ? color : "ink";
      return (
        '<line x1="' +
        x1 +
        '" y1="' +
        y1 +
        '" x2="' +
        x2 +
        '" y2="' +
        y2 +
        '" stroke="' +
        COLORS[key] +
        '" stroke-width="2.4" marker-end="url(#' +
        mid +
        key +
        ')"/>'
      );
    },
    line: function (x1, y1, x2, y2, color, dash) {
      return (
        '<line x1="' +
        x1 +
        '" y1="' +
        y1 +
        '" x2="' +
        x2 +
        '" y2="' +
        y2 +
        '" stroke="' +
        (COLORS[color] || color || INK) +
        '" stroke-width="2" fill="none"' +
        (dash ? ' stroke-dasharray="6 5"' : "") +
        "/>"
      );
    },
    tx: function (x, y, text, opt) {
      const o = opt || {};
      return (
        '<text x="' +
        x +
        '" y="' +
        y +
        '" fill="' +
        (o.fill || INK) +
        '" font-size="' +
        (o.size || 15) +
        '" text-anchor="' +
        (o.anchor || "middle") +
        '">' +
        figXml(text) +
        "</text>"
      );
    },
  };
  const body = builder(pen);
  return (
    '<figure class="q-figure"><svg viewBox="0 0 ' +
    w +
    " " +
    h +
    '" role="img" aria-label="' +
    figXml(caption) +
    '" font-family="Noto Sans TC, Noto Sans CJK TC, sans-serif">' +
    defs +
    body +
    '</svg><figcaption>' +
    figXml(caption) +
    "</figcaption></figure>"
  );
}

function pt(cx, cy, deg, len) {
  const t = (deg * Math.PI) / 180;
  return [cx + len * Math.cos(t), cy - len * Math.sin(t)];
}

function arcD(cx, cy, r, deg0, deg1) {
  const a = pt(cx, cy, deg0, r);
  const b = pt(cx, cy, deg1, r);
  const large = Math.abs(deg1 - deg0) > 180 ? 1 : 0;
  return "M " + a[0] + " " + a[1] + " A " + r + " " + r + " 0 " + large + " 0 " + b[0] + " " + b[1];
}

function ground(pen, y, x1, x2) {
  let s = pen.line(x1, y, x2, y, "ink");
  for (let x = x1; x < x2; x += 14) s += pen.line(x, y, x - 8, y + 10, MUTED);
  return s;
}

function block(pen, x, y, w, h, label) {
  return (
    '<rect x="' +
    x +
    '" y="' +
    y +
    '" width="' +
    w +
    '" height="' +
    h +
    '" rx="3" fill="#f7f3ea" stroke="' +
    INK +
    '" stroke-width="2"/>' +
    pen.tx(x + w / 2, y + h / 2 + 5, label, { size: 14 })
  );
}

function leadingNumber(text) {
  const match = String(text).match(/[\d.]+/);
  return match ? Number(match[0]) : 1;
}

function drawRight(spec) {
  const east = spec.east;
  const north = spec.north;
  const caption = east + " 向東，" + north + " 向北";
  return svgDoc(560, 320, caption, function (pen) {
    const ox = 150;
    const oy = 240;
    const scale = 150 / Math.max(leadingNumber(east), leadingNumber(north));
    const ex = leadingNumber(east) * scale;
    const ny = leadingNumber(north) * scale;
    let s = pen.line(ox, oy, ox + ex, oy, MUTED, true);
    s += pen.line(ox, oy, ox, oy - ny, MUTED, true);
    s += pen.line(ox, oy, ox + ex, oy - ny, BLUE, true);
    s += pen.arr(ox, oy, ox + ex - 4, oy, "rust");
    s += pen.arr(ox, oy, ox, oy - ny + 4, "green");
    s += '<path d="M ' + (ox + 16) + " " + oy + " L " + (ox + 16) + " " + (oy - 16) + " L " + ox + " " + (oy - 16) + '" fill="none" stroke="' + MUTED + '"/>';
    s += pen.tx(ox + ex / 2, oy + 28, east);
    s += pen.tx(ox - 36, oy - ny / 2, north);
    s += pen.tx(ox + ex + 8, oy - ny - 8, "合力", { anchor: "start", fill: BLUE });
    s += pen.tx(ox + ex + 16, oy + 4, "東", { anchor: "start", fill: MUTED, size: 13 });
    s += pen.tx(ox, 36, "北", { fill: MUTED, size: 13 });
    return s;
  });
}

function drawAngle(spec) {
  const caption = spec.force + "，與水平成 " + spec.deg + "°";
  return svgDoc(560, 300, caption, function (pen) {
    const ox = 90;
    const oy = 210;
    const len = 210;
    const tip = pt(ox, oy, spec.deg, len);
    const hx = pt(ox, oy, spec.deg, 52);
    let s = pen.line(ox, oy, ox + len, oy, MUTED, true);
    s += pen.line(tip[0], tip[1], tip[0], oy, MUTED, true);
    s += pen.arr(ox, oy, tip[0], tip[1], "rust");
    s += '<path d="' + arcD(ox, oy, 48, 0, spec.deg) + '" fill="none" stroke="' + BLUE + '" stroke-width="2"/>';
    s += pen.tx(hx[0] + 18, hx[1] + 18, spec.deg + "°", { fill: BLUE });
    s += pen.tx((ox + tip[0]) / 2 - 10, (oy + tip[1]) / 2 - 12, spec.force, { fill: RUST });
    s += pen.tx(ox + len - 10, oy + 22, "水平", { fill: MUTED, size: 13 });
    return s;
  });
}

function drawConcurrent() {
  return svgDoc(520, 300, "三個共點力作用在同一點", function (pen) {
    const cx = 250;
    const cy = 155;
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + INK + '"/>';
    [90, 210, 330].forEach(function (deg, index) {
      const tip = pt(cx, cy, deg, 100);
      s += pen.arr(cx, cy, tip[0], tip[1], index === 0 ? "rust" : index === 1 ? "blue" : "green");
      const label = pt(cx, cy, deg, 124);
      s += pen.tx(label[0], label[1], "F" + (index + 1));
    });
    return s;
  });
}

function drawLamp() {
  return svgDoc(560, 320, "燈重 24 N，兩繩與水平成 40°", function (pen) {
    const lx = 280;
    const ly = 210;
    const left = pt(lx, ly, 140, 170);
    const right = pt(lx, ly, 40, 170);
    let s = pen.line(40, 70, 520, 70, "ink");
    s += pen.line(left[0], left[1], lx, ly, "ink");
    s += pen.line(right[0], right[1], lx, ly, "ink");
    s += '<circle cx="' + lx + '" cy="' + (ly + 16) + '" r="16" fill="#f7f3ea" stroke="' + INK + '" stroke-width="2"/>';
    s += pen.arr(lx, ly + 34, lx, ly + 92, "rust");
    s += pen.tx(lx + 36, ly + 78, "24 N", { anchor: "start", fill: RUST });
    s += '<path d="' + arcD(left[0], left[1], 36, 0, -40) + '" fill="none" stroke="' + BLUE + '" stroke-width="2"/>';
    s += pen.tx(left[0] + 48, left[1] + 10, "40°", { fill: BLUE, size: 14 });
    s += '<path d="' + arcD(right[0], right[1], 36, 180, 220) + '" fill="none" stroke="' + BLUE + '" stroke-width="2"/>';
    s += pen.tx(right[0] - 48, right[1] + 10, "40°", { fill: BLUE, size: 14 });
    s += pen.tx(lx, ly + 21, "燈", { size: 12 });
    return s;
  });
}

function drawLever(spec) {
  return svgDoc(560, 260, "力 " + spec.force + "，力臂 " + spec.arm, function (pen) {
    let s = '<circle cx="90" cy="120" r="7" fill="' + INK + '"/>';
    s += pen.tx(90, 98, "支點", { size: 13 });
    s += pen.line(90, 120, 430, 120, "ink");
    s += pen.arr(430, 120, 430, 190, "rust");
    s += pen.tx(458, 160, spec.force, { anchor: "start", fill: RUST });
    s += pen.line(90, 150, 430, 150, BLUE);
    s += pen.line(90, 144, 90, 156, BLUE);
    s += pen.line(430, 144, 430, 156, BLUE);
    s += pen.tx(260, 172, spec.arm, { fill: BLUE });
    return s;
  });
}

function drawSeesaw() {
  return svgDoc(620, 280, "支點在中心。左方 300 N 距支點 2.0 m，右方 400 N", function (pen) {
    let s = pen.line(70, 150, 550, 150, "ink");
    s += '<path d="M300 150 L278 196 L322 196 Z" fill="#f7f3ea" stroke="' + INK + '" stroke-width="2"/>';
    s += pen.tx(300, 220, "支點", { size: 13 });
    s += block(pen, 78, 112, 54, 38, "人");
    s += pen.arr(105, 40, 105, 108, "rust");
    s += pen.tx(70, 36, "300 N", { anchor: "end", fill: RUST, size: 14 });
    s += pen.line(105, 168, 300, 168, BLUE);
    s += pen.tx(200, 188, "2.0 m", { fill: BLUE, size: 14 });
    s += block(pen, 470, 112, 54, 38, "人");
    s += pen.arr(497, 40, 497, 108, "rust");
    s += pen.tx(534, 36, "400 N", { anchor: "start", fill: RUST, size: 14 });
    s += pen.line(300, 168, 497, 168, MUTED, true);
    s += pen.tx(398, 188, "d", { fill: MUTED, size: 14 });
    return s;
  });
}

function drawDoor() {
  return svgDoc(560, 300, "俯視。推力的作用線穿過鉸鏈", function (pen) {
    let s = '<rect x="150" y="70" width="250" height="150" fill="#f7f3ea" stroke="' + INK + '" stroke-width="2"/>';
    s += '<circle cx="150" cy="100" r="6" fill="' + BLUE + '"/>';
    s += '<circle cx="150" cy="190" r="6" fill="' + BLUE + '"/>';
    s += pen.tx(118, 148, "鉸鏈", { fill: BLUE, size: 13 });
    s += pen.line(430, 145, 150, 145, MUTED, true);
    s += pen.arr(400, 145, 250, 145, "rust");
    s += pen.tx(330, 132, "推力", { fill: RUST });
    return s;
  });
}

function drawWrench() {
  return svgDoc(560, 260, "力 15 N 與扳手垂直，距離 0.20 m", function (pen) {
    let s = '<circle cx="120" cy="120" r="22" fill="none" stroke="' + INK + '" stroke-width="3"/>';
    s += pen.tx(120, 125, "螺母", { size: 12 });
    s += '<rect x="140" y="112" width="250" height="16" fill="#f7f3ea" stroke="' + INK + '" stroke-width="2"/>';
    s += pen.arr(390, 120, 390, 196, "rust");
    s += pen.tx(430, 168, "15 N", { anchor: "start", fill: RUST });
    s += pen.line(120, 86, 390, 86, BLUE);
    s += pen.tx(255, 76, "0.20 m", { fill: BLUE, size: 14 });
    return s;
  });
}

function drawBeam() {
  return svgDoc(640, 300, "樑長 4.0 m、重 80 N。40 N 的物體離 A 1.0 m", function (pen) {
    let s = '<rect x="70" y="128" width="500" height="16" fill="#f7f3ea" stroke="' + INK + '" stroke-width="2"/>';
    s += '<path d="M70 144 L50 190 L90 190 Z" fill="#f7f3ea" stroke="' + INK + '"/>';
    s += '<path d="M570 144 L550 190 L590 190 Z" fill="#f7f3ea" stroke="' + INK + '"/>';
    s += pen.arr(70, 144, 70, 78, "green");
    s += pen.arr(570, 144, 570, 78, "green");
    s += pen.tx(70, 66, "RA", { fill: GREEN, size: 14 });
    s += pen.tx(570, 66, "RB", { fill: GREEN, size: 14 });
    s += pen.tx(70, 214, "A", { size: 14 });
    s += pen.tx(570, 214, "B", { size: 14 });
    s += pen.arr(320, 128, 320, 196, "rust");
    s += pen.tx(320, 216, "80 N", { fill: RUST, size: 14 });
    s += pen.arr(195, 128, 195, 186, "blue");
    s += pen.tx(195, 206, "40 N", { fill: BLUE, size: 14 });
    s += pen.line(70, 240, 570, 240, MUTED);
    s += pen.tx(320, 260, "4.0 m", { fill: MUTED, size: 14 });
    s += pen.line(70, 228, 195, 228, BLUE);
    s += pen.tx(132, 222, "1.0 m", { fill: BLUE, size: 13 });
    return s;
  });
}

function drawKe(spec) {
  return svgDoc(560, 240, spec.mass + "，速率 " + spec.speed, function (pen) {
    let s = ground(pen, 170, 40, 520);
    s += block(pen, 70, 122, 86, 48, spec.mass);
    s += pen.arr(170, 146, 330, 146, "green");
    s += pen.tx(250, 132, spec.speed, { fill: GREEN });
    return s;
  });
}

function drawLift(spec) {
  return svgDoc(420, 320, spec.mass + " 升高 " + spec.height, function (pen) {
    let s = ground(pen, 270, 40, 380);
    s += pen.line(150, 270, 150, 70, MUTED, true);
    s += block(pen, 112, 78, 76, 48, spec.mass);
    s += pen.arr(150, 230, 150, 140, "green");
    s += pen.tx(210, 180, spec.height, { anchor: "start", fill: BLUE });
    s += pen.line(168, 126, 188, 126, BLUE);
    s += pen.line(168, 270, 188, 270, BLUE);
    s += pen.line(178, 126, 178, 270, BLUE);
    return s;
  });
}

function drawDrop(spec) {
  return svgDoc(420, 320, "由靜止下落 " + spec.height, function (pen) {
    let s = ground(pen, 270, 40, 380);
    s += block(pen, 150, 50, 76, 44, spec.mass || "物體");
    s += pen.line(188, 100, 188, 250, MUTED, true);
    s += pen.arr(188, 150, 188, 240, "green");
    s += pen.tx(250, 160, spec.height, { anchor: "start", fill: BLUE });
    return s;
  });
}

function drawSlope(spec) {
  return svgDoc(620, 300, spec.caption, function (pen) {
    let s = ground(pen, 240, 30, 590);
    s += '<path d="M80 80 L520 240" fill="none" stroke="' + INK + '" stroke-width="3"/>';
    s += '<circle cx="150" cy="112" r="14" fill="' + BLUE + '"/>';
    s += '<circle cx="400" cy="198" r="14" fill="' + GREEN + '"/>';
    s += pen.line(150, 112, 150, 240, BLUE, true);
    s += pen.line(400, 198, 400, 240, GREEN, true);
    s += pen.tx(150, 70, spec.high, { fill: BLUE, size: 14 });
    s += pen.tx(430, 188, spec.low, { anchor: "start", fill: GREEN, size: 14 });
    if (spec.extra) s += pen.tx(300, 40, spec.extra, { fill: MUTED, size: 14 });
    return s;
  });
}

function drawPush(spec) {
  return svgDoc(620, 240, spec.caption, function (pen) {
    let s = ground(pen, 170, 30, 590);
    s += block(pen, 120, 118, 90, 52, spec.mass || "物體");
    s += pen.arr(40, 144, 110, 144, "rust");
    s += pen.tx(70, 128, spec.force, { fill: RUST, size: 14 });
    if (spec.friction) {
      s += pen.arr(210, 156, 150, 156, "blue");
      s += pen.tx(250, 150, spec.friction, { anchor: "start", fill: BLUE, size: 14 });
    }
    s += pen.line(165, 196, 165 + (spec.span || 180), 196, GREEN);
    s += pen.tx(165 + (spec.span || 180) / 2, 216, spec.distance, { fill: GREEN, size: 14 });
    return s;
  });
}

function drawLower() {
  return svgDoc(420, 320, "木箱以勻速率被放下", function (pen) {
    let s = ground(pen, 270, 40, 380);
    s += block(pen, 150, 110, 80, 50, "木箱");
    s += pen.arr(190, 70, 190, 104, "blue");
    s += pen.tx(230, 90, "繩", { anchor: "start", fill: BLUE, size: 14 });
    s += pen.arr(190, 166, 190, 230, "green");
    s += pen.tx(230, 200, "勻速率", { anchor: "start", fill: GREEN, size: 14 });
    return s;
  });
}

function drawSwing() {
  return svgDoc(560, 300, "秋千由高處擺向最低點", function (pen) {
    const cx = 280;
    const cy = 40;
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + INK + '"/>';
    const high = pt(cx, cy, 220, 180);
    const low = pt(cx, cy, 270, 180);
    s += pen.line(cx, cy, high[0], high[1], MUTED, true);
    s += pen.line(cx, cy, low[0], low[1], "ink");
    s += '<circle cx="' + high[0] + '" cy="' + high[1] + '" r="12" fill="' + BLUE + '"/>';
    s += '<circle cx="' + low[0] + '" cy="' + low[1] + '" r="12" fill="' + GREEN + '"/>';
    s += pen.tx(high[0] - 20, high[1] + 28, "較高", { fill: BLUE, size: 14 });
    s += pen.tx(low[0] + 28, low[1] + 8, "最低點", { anchor: "start", fill: GREEN, size: 14 });
    return s;
  });
}

function drawThrow(spec) {
  return svgDoc(420, 320, spec.caption, function (pen) {
    let s = ground(pen, 280, 30, 390);
    s += '<circle cx="120" cy="210" r="16" fill="' + BLUE + '"/>';
    s += pen.arr(120, 190, 120, 80, "green");
    s += pen.tx(160, 130, spec.speed, { anchor: "start", fill: GREEN });
    s += pen.line(200, 70, 220, 70, MUTED);
    s += pen.line(210, 70, 210, 280, MUTED, true);
    s += pen.tx(250, 160, "最高點", { anchor: "start", fill: MUTED, size: 14 });
    return s;
  });
}

function drawTwoMass() {
  return svgDoc(560, 220, "速率相同，質量不同", function (pen) {
    let s = ground(pen, 160, 30, 530);
    s += block(pen, 60, 112, 70, 48, "乙");
    s += block(pen, 280, 96, 110, 64, "甲 3m");
    s += pen.arr(140, 136, 210, 136, "green");
    s += pen.arr(400, 128, 490, 128, "green");
    s += pen.tx(175, 120, "v", { fill: GREEN });
    s += pen.tx(445, 112, "v", { fill: GREEN });
    return s;
  });
}

function drawHeights() {
  return svgDoc(420, 300, "同一物體，高度變為 3 倍", function (pen) {
    let s = ground(pen, 250, 40, 380);
    s += '<circle cx="120" cy="190" r="12" fill="' + BLUE + '"/>';
    s += '<circle cx="260" cy="80" r="12" fill="' + GREEN + '"/>';
    s += pen.tx(120, 220, "h", { fill: BLUE });
    s += pen.tx(260, 60, "3h", { fill: GREEN });
    return s;
  });
}

function drawCup() {
  return svgDoc(480, 280, "杯子在桌面。零點可取地面或桌面", function (pen) {
    let s = ground(pen, 230, 30, 450);
    s += pen.tx(70, 224, "地面", { fill: MUTED, size: 13 });
    s += '<rect x="140" y="120" width="180" height="12" fill="#e7decc" stroke="' + INK + '"/>';
    s += pen.line(150, 132, 150, 230, MUTED);
    s += pen.line(310, 132, 310, 230, MUTED);
    s += pen.tx(230, 108, "桌面", { fill: BLUE, size: 14 });
    s += '<path d="M200 96 h40 v-28 h-28 v28" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    return s;
  });
}

function drawEraser() {
  return svgDoc(560, 220, "橡皮擦在桌面滑行並慢下來", function (pen) {
    let s = ground(pen, 160, 30, 530);
    s += block(pen, 80, 116, 70, 44, "橡皮");
    s += pen.arr(160, 138, 250, 138, "green");
    s += pen.arr(300, 150, 230, 150, "rust");
    s += pen.tx(210, 122, "v", { fill: GREEN });
    s += pen.tx(280, 176, "摩擦", { fill: RUST, size: 14 });
    return s;
  });
}

function drawLauncher() {
  return svgDoc(560, 230, "壓縮的發射器把小車推出", function (pen) {
    let s = ground(pen, 170, 30, 530);
    s += '<path d="M40 170 L40 110 L70 110" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    s += '<path d="M70 124 q18 16 0 32 q18 -8 36 -16 q-18 -8 -36 -16" fill="none" stroke="' + RUST + '" stroke-width="2"/>';
    s += block(pen, 150, 118, 80, 52, "小車");
    s += pen.arr(240, 144, 340, 144, "green");
    return s;
  });
}

function drawRain() {
  return svgDoc(360, 300, "雨滴以終端速率下降", function (pen) {
    let s = ground(pen, 250, 40, 320);
    s += '<path d="M170 70 q28 36 0 56 q-28 -20 0 -56" fill="#d5e2f1" stroke="' + BLUE + '" stroke-width="2"/>';
    s += pen.arr(170, 140, 170, 210, "green");
    s += pen.tx(210, 180, "終端速率", { anchor: "start", fill: GREEN, size: 14 });
    return s;
  });
}

function drawPendulum(spec) {
  return svgDoc(520, 320, spec.caption, function (pen) {
    const cx = 260;
    const cy = 36;
    const low = [cx, 250];
    const high = pt(cx, cy, 210, 214);
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + INK + '"/>';
    s += pen.line(cx, cy, high[0], high[1], MUTED, true);
    s += pen.line(cx, cy, low[0], low[1], "ink");
    s += '<circle cx="' + high[0] + '" cy="' + high[1] + '" r="12" fill="' + BLUE + '"/>';
    s += '<circle cx="' + low[0] + '" cy="' + low[1] + '" r="12" fill="' + GREEN + '"/>';
    s += pen.line(high[0], high[1], high[0], low[1], BLUE, true);
    s += pen.tx(high[0] - 16, (high[1] + low[1]) / 2, spec.height, { anchor: "end", fill: BLUE, size: 14 });
    s += pen.tx(low[0] + 24, low[1], "最低點", { anchor: "start", fill: GREEN, size: 14 });
    return s;
  });
}

function drawBounce(spec) {
  return svgDoc(520, 320, "落下 " + spec.drop + "，反彈到 " + spec.rebound, function (pen) {
    let s = ground(pen, 270, 30, 490);
    s += '<circle cx="150" cy="60" r="14" fill="' + BLUE + '"/>';
    s += pen.tx(150, 40, spec.drop, { fill: BLUE, size: 14 });
    s += pen.arr(150, 80, 150, 240, "green");
    s += '<circle cx="330" cy="160" r="14" fill="' + GREEN + '"/>';
    s += pen.tx(360, 150, spec.rebound, { anchor: "start", fill: GREEN, size: 14 });
    return s;
  });
}

function drawMotor(spec) {
  return svgDoc(480, 300, "電動機以勻速率舉高 " + spec.mass, function (pen) {
    let s = '<rect x="40" y="40" width="90" height="50" fill="#f7f3ea" stroke="' + INK + '"/>';
    s += pen.tx(85, 70, "電動機", { size: 13 });
    s += pen.line(130, 65, 250, 65, "ink");
    s += pen.line(250, 65, 250, 120, "ink");
    s += block(pen, 214, 120, 72, 46, spec.mass);
    s += pen.tx(320, 180, spec.height, { anchor: "start", fill: BLUE });
    s += pen.tx(320, 204, "勻速率", { anchor: "start", fill: GREEN, size: 14 });
    return s;
  });
}

function drawPoints() {
  return svgDoc(620, 280, "平滑軌道上的 A、B 兩點", function (pen) {
    let s = ground(pen, 230, 30, 590);
    s += '<path d="M60 70 Q 200 70 280 150 T 520 200" fill="none" stroke="' + INK + '" stroke-width="3"/>';
    s += '<circle cx="100" cy="78" r="8" fill="' + BLUE + '"/>';
    s += '<circle cx="430" cy="196" r="8" fill="' + GREEN + '"/>';
    s += pen.tx(100, 60, "A", { fill: BLUE });
    s += pen.tx(450, 190, "B", { anchor: "start", fill: GREEN });
    return s;
  });
}

function drawNormalSlope() {
  return svgDoc(560, 280, "小車沿固定斜面滑下，法向力垂直於斜面", function (pen) {
    let s = '<path d="M60 210 L460 210 L460 70 Z" fill="#f7f3ea" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="230" y="118" width="54" height="28" transform="rotate(20 257 132)" fill="#fff" stroke="' + BLUE + '" stroke-width="2"/>';
    s += pen.arr(250, 150, 210, 100, "green");
    s += pen.tx(190, 96, "法向力", { fill: GREEN, size: 14 });
    s += pen.arr(280, 140, 280, 200, "rust");
    s += pen.tx(310, 180, "重量", { anchor: "start", fill: RUST, size: 14 });
    return s;
  });
}

function drawCircle(spec) {
  return svgDoc(620, 340, spec.caption, function (pen) {
    const cx = 230;
    const cy = 175;
    const r = 108;
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + INK + '"/>';
    s += pen.tx(cx - 16, cy + 4, "O", { size: 13 });
    const px = cx + r;
    const py = cy;
    s += '<circle cx="' + px + '" cy="' + py + '" r="7" fill="' + BLUE + '"/>';
    if (spec.radius) {
      s += pen.line(cx, cy, px, py, BLUE);
      s += pen.tx(cx + r / 2, cy - 12, spec.radius, { fill: BLUE, size: 14 });
    }
    if (spec.speed) {
      s += pen.arr(px, py, px, py - 78, "green");
      s += pen.tx(px + 36, py - 70, spec.speed, { anchor: "start", fill: GREEN, size: 14 });
    }
    if (spec.inward) {
      s += pen.arr(px - 8, py, px - 78, py, "rust");
      s += pen.tx(px - 40, py + 22, spec.inward, { fill: RUST, size: 14 });
    }
    if (spec.note) s += pen.tx(470, 80, spec.note, { size: 15 });
    if (spec.omega) s += pen.tx(470, spec.note ? 112 : 80, spec.omega, { fill: BLUE, size: 15 });
    return s;
  });
}

function drawSector(spec) {
  return svgDoc(520, 340, spec.caption, function (pen) {
    const cx = 180;
    const cy = 200;
    const r = 120;
    const end = pt(cx, cy, spec.sweep, r);
    let s = pen.line(cx, cy, cx + r, cy, "ink");
    s += pen.line(cx, cy, end[0], end[1], "ink");
    s += '<path d="' + arcD(cx, cy, r, 0, spec.sweep) + '" fill="rgba(30,78,134,0.08)" stroke="' + BLUE + '" stroke-width="2.4"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + INK + '"/>';
    if (spec.deg) s += pen.tx(cx + 56, cy - 16, spec.deg, { fill: BLUE });
    if (spec.radius) s += pen.tx(cx + r / 2, cy + 20, spec.radius, { fill: INK, size: 14 });
    if (spec.arc) s += pen.tx((cx + r + end[0]) / 2 + 10, (cy + end[1]) / 2 - 16, spec.arc, { fill: GREEN, size: 14 });
    return s;
  });
}

function drawFullTurn() {
  return svgDoc(420, 320, "沿圓周走完一圈", function (pen) {
    const cx = 200;
    const cy = 160;
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="90" fill="none" stroke="' + MUTED + '" stroke-width="2" stroke-dasharray="5 5"/>';
    s += '<path d="' + arcD(cx, cy, 90, 20, 340) + '" fill="none" stroke="' + BLUE + '" stroke-width="2.6" marker-end="url(#m' + figN + 'blue)"/>';
    s += pen.tx(cx, cy + 6, "1 圈", { fill: BLUE });
    return s;
  });
}

function drawTwoRadii(spec) {
  return svgDoc(520, 340, spec.caption, function (pen) {
    const cx = 230;
    const cy = 170;
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="58" fill="none" stroke="' + BLUE + '" stroke-width="2"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="112" fill="none" stroke="' + GREEN + '" stroke-width="2"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + INK + '"/>';
    s += '<circle cx="' + (cx + 58) + '" cy="' + cy + '" r="6" fill="' + BLUE + '"/>';
    s += '<circle cx="' + (cx + 112) + '" cy="' + cy + '" r="6" fill="' + GREEN + '"/>';
    s += pen.tx(cx + 30, cy - 12, spec.inner, { fill: BLUE, size: 14 });
    s += pen.tx(cx + 86, cy - 16, spec.outer, { fill: GREEN, size: 14 });
    s += pen.tx(cx, 36, spec.same, { fill: MUTED, size: 14 });
    return s;
  });
}

function drawDoubleSpeed() {
  return svgDoc(620, 280, "同一圓周，速率變為 2 倍", function (pen) {
    let s = "";
    [150, 430].forEach(function (cx, index) {
      s += '<circle cx="' + cx + '" cy="150" r="70" fill="none" stroke="' + INK + '" stroke-width="2"/>';
      s += '<circle cx="' + (cx + 70) + '" cy="150" r="6" fill="' + BLUE + '"/>';
      s += pen.arr(cx + 70, 150, cx + 70, 80, "green");
      s += pen.tx(cx + 70, 64, index === 0 ? "v" : "2v", { fill: GREEN });
    });
    return s;
  });
}

function drawString(spec) {
  return svgDoc(620, 340, spec.caption, function (pen) {
    let s = '<rect x="40" y="40" width="420" height="250" fill="#f7f3ea" stroke="' + MUTED + '"/>';
    s += pen.tx(70, 64, "平滑桌面", { anchor: "start", fill: MUTED, size: 13 });
    const cx = 220;
    const cy = 170;
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + INK + '"/>';
    const mx = 360;
    const my = 170;
    if (spec.broken) {
      s += pen.line(cx, cy, 280, cy, "ink");
      s += pen.line(320, cy, mx - 16, cy, "ink");
      s += pen.tx(300, 150, "斷開", { fill: RUST, size: 13 });
    } else {
      s += pen.line(cx, cy, mx - 16, cy, "ink");
    }
    s += '<circle cx="' + mx + '" cy="' + my + '" r="16" fill="#fff" stroke="' + BLUE + '" stroke-width="2"/>';
    s += pen.tx(mx, my + 5, spec.mass || "m", { size: 12, fill: BLUE });
    s += pen.arr(mx, my - 16, mx, my - 80, "green");
    s += pen.tx(mx + 28, my - 70, spec.speed || "v", { anchor: "start", fill: GREEN, size: 14 });
    if (spec.radius) s += pen.tx(cx + 70, cy + 22, spec.radius, { fill: BLUE, size: 14 });
    if (spec.extra) s += pen.tx(500, 160, spec.extra, { size: 14 });
    return s;
  });
}

function drawCar(spec) {
  return svgDoc(620, 320, spec.caption, function (pen) {
    let s = '<path d="M80 250 A 180 180 0 0 1 430 70" fill="none" stroke="' + MUTED + '" stroke-width="16"/>';
    s += '<path d="M80 250 A 180 180 0 0 1 430 70" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    s += '<circle cx="80" cy="250" r="4" fill="' + INK + '"/>';
    s += pen.tx(60, 272, "O", { size: 13 });
    s += '<rect x="400" y="48" width="46" height="26" rx="3" fill="#fff" stroke="' + BLUE + '" stroke-width="2"/>';
    s += pen.arr(446, 61, 500, 20, "green");
    s += pen.tx(510, 28, spec.speed || "v", { anchor: "start", fill: GREEN, size: 14 });
    if (spec.radius) s += pen.tx(240, 180, spec.radius, { fill: BLUE, size: 14 });
    if (spec.force) {
      s += pen.arr(420, 70, 360, 130, "rust");
      s += pen.tx(340, 150, spec.force, { fill: RUST, size: 14 });
    }
    return s;
  });
}

function drawBank(spec) {
  return svgDoc(640, 320, spec.caption, function (pen) {
    const x1 = 90;
    const y1 = 250;
    const x2 = 560;
    const y2 = 130;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const nx = uy;
    const ny = -ux;
    const cx = x1 + dx * 0.42;
    const cy = y1 + dy * 0.42;
    const deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
    let s = pen.line(40, 280, 600, 280, MUTED, true);
    s += pen.line(x1, y1, x2, y2, "ink");
    s += pen.line(x1 - nx * 18, y1 - ny * 18, x2 - nx * 18, y2 - ny * 18, MUTED);
    s += '<path d="' + arcD(x1, y1, 48, 0, deg) + '" fill="none" stroke="' + BLUE + '" stroke-width="2"/>';
    s += pen.tx(x1 + 62, y1 - 6, spec.note || "θ", { fill: BLUE });
    function corner(along, out) {
      return [cx + ux * along + nx * out, cy + uy * along + ny * out];
    }
    const box = [corner(-26, 22), corner(26, 22), corner(26, 0), corner(-26, 0)];
    s += '<path d="M ' + box.map((p) => p.join(" ")).join(" L ") + ' Z" fill="#fff" stroke="' + BLUE + '" stroke-width="2"/>';
    const base = corner(0, 22);
    const tip = corner(0, 90);
    s += pen.arr(base[0], base[1], tip[0], tip[1], "green");
    s += pen.tx(tip[0] + 8, tip[1], "法向力", { anchor: "start", fill: GREEN, size: 14 });
    s += pen.arr(cx, cy, cx, cy + 64, "rust");
    s += pen.tx(cx + 12, cy + 52, spec.weight || "重量", { anchor: "start", fill: RUST, size: 14 });
    s += pen.tx(40, 36, "圓心在較低的一側", { anchor: "start", fill: MUTED, size: 13 });
    return s;
  });
}

function drawPlane() {
  return svgDoc(560, 280, "飛機向圓心一側傾側，升力垂直於機翼", function (pen) {
    let s = '<path d="M80 170 L470 110 L450 138 L100 190 Z" fill="#f7f3ea" stroke="' + INK + '" stroke-width="2"/>';
    s += pen.arr(260, 140, 210, 40, "green");
    s += pen.tx(190, 32, "升力", { fill: GREEN });
    s += pen.arr(280, 160, 280, 230, "rust");
    s += pen.tx(310, 210, "重量", { anchor: "start", fill: RUST });
    s += pen.tx(80, 50, "圓心在左側", { anchor: "start", fill: MUTED, size: 13 });
    return s;
  });
}

function drawLineCircle() {
  return svgDoc(640, 280, "兩車速率都是 10 m/s。甲走直線，乙走半徑 20 m 的圓周", function (pen) {
    let s = pen.line(40, 150, 230, 150, "ink");
    s += pen.arr(180, 150, 250, 150, "green");
    s += '<rect x="120" y="132" width="40" height="22" fill="#fff" stroke="' + BLUE + '"/>';
    s += pen.tx(140, 110, "甲", { fill: BLUE });
    s += pen.tx(80, 180, "10 m/s", { fill: GREEN, size: 14 });
    s += '<circle cx="430" cy="150" r="70" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="486" y="136" width="36" height="20" fill="#fff" stroke="' + GREEN + '"/>';
    s += pen.tx(500, 110, "乙", { fill: GREEN });
    s += pen.tx(430, 154, "20 m", { fill: BLUE, size: 13 });
    s += pen.tx(520, 200, "10 m/s", { fill: GREEN, size: 14 });
    return s;
  });
}

function drawDisk(spec) {
  return svgDoc(420, 320, spec.caption, function (pen) {
    let s = '<circle cx="200" cy="160" r="90" fill="#f7f3ea" stroke="' + INK + '" stroke-width="2"/>';
    s += '<circle cx="200" cy="160" r="6" fill="' + INK + '"/>';
    s += '<path d="' + arcD(200, 160, 70, 30, 300) + '" fill="none" stroke="' + BLUE + '" stroke-width="2.4" marker-end="url(#m' + figN + 'blue)"/>';
    s += pen.tx(200, 40, spec.note, { fill: BLUE, size: 15 });
    return s;
  });
}

function drawCompareSpeed() {
  return svgDoc(560, 220, "同一物體，速率由 v 變為 2v", function (pen) {
    let s = ground(pen, 160, 30, 530);
    s += block(pen, 50, 112, 70, 48, "m");
    s += pen.arr(130, 136, 200, 136, "green");
    s += pen.tx(165, 120, "v", { fill: GREEN });
    s += block(pen, 280, 112, 70, 48, "m");
    s += pen.arr(360, 136, 500, 136, "green");
    s += pen.tx(430, 120, "2v", { fill: GREEN });
    return s;
  });
}

var FIGURES = {
  "force-mc-1": { kind: "right", east: "3 N", north: "4 N" },
  "force-mc-2": { kind: "angle", force: "20 N", deg: 30 },
  "force-mc-3": { kind: "concurrent" },
  "force-short-1": { kind: "right", east: "6.0 N", north: "8.0 N" },
  "force-long-1": { kind: "lamp" },
  "moment-mc-1": { kind: "lever", force: "8.0 N", arm: "0.25 m" },
  "moment-mc-2": { kind: "seesaw" },
  "moment-mc-3": { kind: "door" },
  "moment-short-1": { kind: "wrench" },
  "moment-long-1": { kind: "beam" },
  "energy-mc-01": { kind: "ke", mass: "3 kg", speed: "4 m/s" },
  "energy-mc-02": { kind: "lift", mass: "2.5 kg", height: "4 m" },
  "energy-mc-03": { kind: "compareSpeed" },
  "energy-mc-04": { kind: "twoMass" },
  "energy-mc-05": { kind: "heights" },
  "energy-mc-06": { kind: "slope", caption: "小車由靜止沿平滑滑梯滑下", high: "較高", low: "較低" },
  "energy-mc-07": { kind: "throw", caption: "球被垂直上拋", speed: "上拋" },
  "energy-mc-08": { kind: "swing" },
  "energy-mc-09": { kind: "push", caption: "書在水平桌面以勻速率被推動", mass: "書", force: "推力", distance: "一段距離" },
  "energy-mc-10": { kind: "lower" },
  "energy-mc-11": { kind: "slope", caption: "沒有摩擦時，動能與重力勢能可以互相轉換", high: "高", low: "低" },
  "energy-mc-12": { kind: "drop", mass: "1 kg", height: "20 m" },
  "energy-mc-13": { kind: "ke", mass: "1 kg", speed: "動能 32 J" },
  "energy-mc-14": { kind: "lift", mass: "6 kg", height: "Ep = 240 J" },
  "energy-mc-15": { kind: "ke", mass: "0.2 kg", speed: "0 → 10 m/s" },
  "energy-mc-16": { kind: "push", caption: "摩擦對小車作了 −15 J 的功", mass: "小車", force: "摩擦", distance: "水平" },
  "energy-mc-17": { kind: "twoMass" },
  "energy-mc-18": { kind: "cup" },
  "energy-mc-19": { kind: "slope", caption: "單車在沒有阻力的斜坡滑下", high: "高", low: "低" },
  "energy-mc-20": { kind: "eraser" },
  "energy-mc-21": { kind: "slope", caption: "由 4.0 m 滑到剩下 2.2 m", high: "4.0 m", low: "2.2 m" },
  "energy-mc-22": { kind: "slope", caption: "6 m 高處速率 8 m/s，再到 2 m", high: "6 m，8 m/s", low: "2 m" },
  "energy-mc-23": { kind: "push", caption: "2 kg 木箱以 10 m/s 滑上粗糙路面", mass: "2 kg", force: "10 m/s", friction: "6 N", distance: "6 m", span: 160 },
  "energy-mc-24": { kind: "slope", caption: "坡底速率 6 m/s，坡頂高 2.0 m", high: "2.0 m", low: "6 m/s", extra: "2 kg" },
  "energy-mc-25": { kind: "drop", mass: "物體", height: "H → H/2" },
  "energy-mc-26": { kind: "drop", mass: "球", height: "同一高度" },
  "energy-mc-27": { kind: "normal" },
  "energy-mc-28": { kind: "launcher" },
  "energy-mc-29": { kind: "motor", mass: "4 kg", height: "2.5 m" },
  "energy-mc-30": { kind: "slope", caption: "由 3.0 m 滑到 2.2 m", high: "3.0 m", low: "2.2 m", extra: "2 kg" },
  "energy-mc-31": { kind: "slope", caption: "垂直下降 2 m，沿坡 10 m，摩擦 4 N", high: "2 m", low: "10 m", extra: "5 kg" },
  "energy-mc-32": { kind: "drop", mass: "石塊", height: "有空氣阻力" },
  "energy-mc-33": { kind: "slope", caption: "0.5 kg 的球以 4 m/s 沿斜面向上", high: "最高", low: "4 m/s" },
  "energy-mc-34": { kind: "slope", caption: "沿粗糙斜面只升高 0.5 m", high: "0.5 m", low: "停下" },
  "energy-mc-35": { kind: "points" },
  "energy-mc-36": { kind: "push", caption: "9 N 推動 3 kg 箱子 4 m", mass: "3 kg", force: "9 N", distance: "4 m" },
  "energy-mc-37": { kind: "push", caption: "9 N 推動，摩擦力 3 N，距離 4 m", mass: "箱子", force: "9 N", friction: "3 N", distance: "4 m" },
  "energy-mc-38": { kind: "lift", mass: "物體", height: "2 m → 5 m" },
  "energy-mc-39": { kind: "rain" },
  "energy-mc-40": { kind: "slope", caption: "40 kg，8 m 高處速率 3 m/s，再到 6 m", high: "8 m，3 m/s", low: "6 m" },
  "energy-calc-01": { kind: "ke", mass: "3 kg", speed: "4 m/s" },
  "energy-calc-02": { kind: "lift", mass: "2.5 kg", height: "4 m" },
  "energy-calc-03": { kind: "drop", mass: "0.5 kg", height: "5.0 m" },
  "energy-calc-04": { kind: "ke", mass: "2 kg", speed: "64 J" },
  "energy-calc-05": { kind: "compareSpeed" },
  "energy-calc-06": { kind: "push", caption: "10 N 把 1 kg 木塊推動 5 m", mass: "1 kg", force: "10 N", distance: "5 m" },
  "energy-calc-07": { kind: "push", caption: "原有動能 30 J，摩擦作功 −12 J", mass: "小車", force: "30 J", friction: "−12 J", distance: "高度不變" },
  "energy-calc-08": { kind: "lift", mass: "物體", height: "2 m → 6 m" },
  "energy-calc-09": { kind: "throw", caption: "0.2 kg 的球以 12 m/s 上拋", speed: "12 m/s" },
  "energy-calc-10": { kind: "lift", mass: "1.5 kg", height: "0.8 m" },
  "energy-calc-11": { kind: "slope", caption: "由 4.0 m 滑到 2.2 m", high: "4.0 m", low: "2.2 m", extra: "2 kg" },
  "energy-calc-12": { kind: "push", caption: "2 kg 以 6 m/s 進入粗糙路面，摩擦 4 N", mass: "2 kg", force: "6 m/s", friction: "4 N", distance: "直至停下" },
  "energy-calc-13": { kind: "slope", caption: "坡長 6 m，高度 3 m，摩擦 4 N", high: "3 m", low: "6 m", extra: "2 kg，4 N" },
  "energy-calc-14": { kind: "push", caption: "2 kg 以 8 m/s 滑行 4 m 後停下", mass: "2 kg", force: "8 m/s", friction: "摩擦", distance: "4 m" },
  "energy-calc-15": { kind: "slope", caption: "5.0 m 高處速率 4 m/s，再到 2.6 m", high: "5.0 m，4 m/s", low: "2.6 m", extra: "0.5 kg" },
  "energy-calc-16": { kind: "slope", caption: "坡底 4 m/s，坡頂高 1.2 m", high: "1.2 m", low: "4 m/s", extra: "2 kg" },
  "energy-calc-17": { kind: "motor", mass: "8 kg", height: "2.5 m" },
  "energy-calc-18": { kind: "pendulum", caption: "0.4 kg 的擺球，放開時比最低點高 0.45 m", height: "0.45 m" },
  "energy-calc-19": { kind: "slope", caption: "先下降 8 m，再在粗糙水平段滑 10 m", high: "8 m", low: "10 m，6 N", extra: "2 kg" },
  "energy-calc-20": { kind: "bounce", drop: "5.0 m", rebound: "1.25 m" },
  "circ-mc-01": { kind: "sector", caption: "直角", deg: "90°", sweep: 90 },
  "circ-mc-02": { kind: "full" },
  "circ-mc-03": { kind: "sector", caption: "半徑 2 m，弧長 5 m", radius: "2 m", arc: "5 m", sweep: 143 },
  "circ-mc-04": { kind: "disk", caption: "4 s 內角位移 10 rad", note: "10 rad / 4 s" },
  "circ-mc-05": { kind: "circle", caption: "半徑 4 m，角速度 0.5 rad/s", radius: "4 m", speed: "v", omega: "0.5 rad/s" },
  "circ-mc-06": { kind: "circle", caption: "角速度 π rad/s", radius: "r", speed: "v", omega: "π rad/s" },
  "circ-mc-07": { kind: "circle", caption: "速率 8 m/s，半徑 4 m", radius: "4 m", speed: "8 m/s", inward: "a" },
  "circ-mc-08": { kind: "circle", caption: "角速度 2 rad/s，半徑 5 m", radius: "5 m", omega: "2 rad/s", inward: "a" },
  "circ-mc-09": { kind: "circle", caption: "2 kg，速率 3 m/s，半徑 1.5 m", radius: "1.5 m", speed: "3 m/s", inward: "F" },
  "circ-mc-10": { kind: "circle", caption: "勻速圓周運動。速度沿切線", radius: "r", speed: "v" },
  "circ-mc-11": { kind: "circle", caption: "速率不變的圓周運動", radius: "r", speed: "速率不變" },
  "circ-mc-12": { kind: "doubleSpeed" },
  "circ-mc-13": { kind: "two", caption: "角速度相同，甲的半徑是乙的 2 倍", inner: "乙", outer: "甲 2r", same: "ω 相同" },
  "circ-mc-14": { kind: "circle", caption: "週期 4 s", radius: "r", omega: "T = 4 s" },
  "circ-mc-15": { kind: "circle", caption: "速率 4 m/s，半徑 2 m", radius: "2 m", speed: "4 m/s" },
  "circ-mc-16": { kind: "circle", caption: "4 kg，角速度 2 rad/s，半徑 1 m", radius: "1 m", omega: "2 rad/s", inward: "F" },
  "circ-mc-17": { kind: "string", caption: "0.2 kg 的珠子，半徑 0.5 m，速率 5 m/s", mass: "0.2 kg", radius: "0.5 m", speed: "5 m/s" },
  "circ-mc-18": { kind: "disk", caption: "4 s 內轉了 6 圈", note: "6 圈 / 4 s" },
  "circ-mc-19": { kind: "car", caption: "600 kg 的車，速率 12 m/s，半徑 36 m", speed: "12 m/s", radius: "36 m" },
  "circ-mc-20": { kind: "car", caption: "50 kg，半徑 8 m，最大摩擦力 400 N", speed: "v", radius: "8 m", force: "最大 400 N" },
  "circ-mc-21": { kind: "string", caption: "繩在這一時刻斷開", mass: "珠", broken: true, speed: "v" },
  "circ-mc-22": { kind: "two", caption: "週期相同，甲的半徑較大", inner: "乙", outer: "甲", same: "T 相同" },
  "circ-mc-23": { kind: "two", caption: "速率不變，半徑變為 2 倍", inner: "r", outer: "2r", same: "v 相同" },
  "circ-mc-24": { kind: "string", caption: "平滑桌面上，繩拉着珠子作圓周運動", mass: "珠", radius: "r", speed: "v" },
  "circ-mc-25": { kind: "circle", caption: "速率不變的水平圓周", radius: "r", speed: "速率不變" },
  "circ-mc-26": { kind: "car", caption: "同一個彎，最大側向摩擦力減半", speed: "v", radius: "r", force: "摩擦力上限" },
  "circ-mc-27": { kind: "bank", caption: "沒有摩擦的傾斜路面，設計速率變為 2 倍", note: "v → 2v", weight: "mg" },
  "circ-mc-28": { kind: "lineCircle" },
  "circ-mc-29": { kind: "plane" },
  "circ-mc-30": { kind: "two", caption: "角速度不變，半徑變為 3 倍", inner: "r", outer: "3r", same: "ω 相同" },
  "circ-calc-01": { kind: "sector", caption: "60°", deg: "60°", sweep: 60 },
  "circ-calc-02": { kind: "sector", caption: "半徑 3 m，弧長 9 m", radius: "3 m", arc: "9 m", sweep: 172 },
  "circ-calc-03": { kind: "disk", caption: "4 s 內角位移 8π rad", note: "8π rad / 4 s" },
  "circ-calc-04": { kind: "circle", caption: "半徑 0.5 m，角速度 6 rad/s", radius: "0.5 m", omega: "6 rad/s", speed: "v", inward: "a" },
  "circ-calc-05": { kind: "circle", caption: "3 kg，速率 4 m/s，半徑 2 m", radius: "2 m", speed: "4 m/s", inward: "F" },
  "circ-calc-06": { kind: "circle", caption: "週期 0.5 s", radius: "r", omega: "T = 0.5 s" },
  "circ-calc-07": { kind: "circle", caption: "速率 12 m/s，半徑 6 m", radius: "6 m", speed: "12 m/s" },
  "circ-calc-08": { kind: "circle", caption: "1 kg，角速度 3 rad/s，半徑 2 m", radius: "2 m", omega: "3 rad/s", inward: "F" },
  "circ-calc-09": { kind: "string", caption: "0.5 kg，半徑 2 m，角速度 3 rad/s", mass: "0.5 kg", radius: "2 m", speed: "v", extra: "3 rad/s" },
  "circ-calc-10": { kind: "car", caption: "700 kg，速率 6 m/s，半徑 28 m，最大摩擦力 1600 N", speed: "6 m/s", radius: "28 m", force: "最大 1600 N" },
  "circ-calc-11": { kind: "two", caption: "同一轉盤，角速度 2 rad/s", inner: "0.5 m", outer: "1.5 m", same: "2 rad/s" },
  "circ-calc-12": { kind: "string", caption: "0.5 kg，半徑 2 m，繩最多承受 16 N", mass: "0.5 kg", radius: "2 m", speed: "v", extra: "最大 16 N" },
  "circ-calc-13": { kind: "string", caption: "0.3 kg，半徑 0.6 m，速率 4 m/s，繩隨後斷開", mass: "0.3 kg", radius: "0.6 m", speed: "4 m/s", broken: true },
  "circ-calc-14": { kind: "bank", caption: "400 kg，速率 10 m/s，半徑 25 m，路面沒有摩擦", note: "θ", weight: "mg" },
};

function drawFigure(spec) {
  if (spec.kind === "right") return drawRight(spec);
  if (spec.kind === "angle") return drawAngle(spec);
  if (spec.kind === "concurrent") return drawConcurrent();
  if (spec.kind === "lamp") return drawLamp();
  if (spec.kind === "lever") return drawLever(spec);
  if (spec.kind === "seesaw") return drawSeesaw();
  if (spec.kind === "door") return drawDoor();
  if (spec.kind === "wrench") return drawWrench();
  if (spec.kind === "beam") return drawBeam();
  if (spec.kind === "ke") return drawKe(spec);
  if (spec.kind === "lift") return drawLift(spec);
  if (spec.kind === "drop") return drawDrop(spec);
  if (spec.kind === "slope") return drawSlope(spec);
  if (spec.kind === "push") return drawPush(spec);
  if (spec.kind === "lower") return drawLower();
  if (spec.kind === "swing") return drawSwing();
  if (spec.kind === "throw") return drawThrow(spec);
  if (spec.kind === "twoMass") return drawTwoMass();
  if (spec.kind === "heights") return drawHeights();
  if (spec.kind === "cup") return drawCup();
  if (spec.kind === "eraser") return drawEraser();
  if (spec.kind === "launcher") return drawLauncher();
  if (spec.kind === "rain") return drawRain();
  if (spec.kind === "pendulum") return drawPendulum(spec);
  if (spec.kind === "bounce") return drawBounce(spec);
  if (spec.kind === "motor") return drawMotor(spec);
  if (spec.kind === "points") return drawPoints();
  if (spec.kind === "normal") return drawNormalSlope();
  if (spec.kind === "circle") return drawCircle(spec);
  if (spec.kind === "sector") return drawSector(spec);
  if (spec.kind === "full") return drawFullTurn();
  if (spec.kind === "two") return drawTwoRadii(spec);
  if (spec.kind === "doubleSpeed") return drawDoubleSpeed();
  if (spec.kind === "string") return drawString(spec);
  if (spec.kind === "car") return drawCar(spec);
  if (spec.kind === "bank") return drawBank(spec);
  if (spec.kind === "plane") return drawPlane();
  if (spec.kind === "lineCircle") return drawLineCircle();
  if (spec.kind === "disk") return drawDisk(spec);
  if (spec.kind === "compareSpeed") return drawCompareSpeed();
  return "";
}

function questionFigure(question) {
  const spec = FIGURES[question.id];
  if (!spec) return "";
  return drawFigure(spec);
}

this.FIGURES = FIGURES;
this.questionFigure = questionFigure;
