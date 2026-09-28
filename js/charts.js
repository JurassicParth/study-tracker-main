// charts.js — renders the subject bar chart (canvas) and the heatmap grid (DOM)

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function renderSubjectChart(canvas, subjects, sessions, days) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight || 220;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  canvas._bars = [];

  if (subjects.length === 0) {
    ctx.fillStyle = "#9aa0ab";
    ctx.font = "500 13px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Add a subject to see your chart.", width / 2, height / 2);
    return;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const cutoff = dateKey(start);

  const hoursBySubject = subjects.map(subj => {
    const mins = sessions
      .filter(s => s.subjectId === subj.id && s.date >= cutoff)
      .reduce((sum, s) => sum + s.duration, 0);
    return { subject: subj, hours: mins / 60 };
  });

  const maxHours = Math.max(1, ...hoursBySubject.map(h => h.hours));
  const count = hoursBySubject.length;
  const gap = 14;
  const barWidth = Math.min(64, Math.max(16, (width - gap * (count + 1)) / count));
  const totalWidth = count * barWidth + (count - 1) * gap;
  const offset = Math.max(gap, (width - totalWidth) / 2);
  const chartTop = 22;
  const chartBottom = height - 34;
  const chartHeight = chartBottom - chartTop;

  // baseline
  ctx.strokeStyle = "#383e4a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, chartBottom + 0.5);
  ctx.lineTo(width, chartBottom + 0.5);
  ctx.stroke();

  const allZero = hoursBySubject.every(h => h.hours === 0);

  hoursBySubject.forEach((item, i) => {
    const x = offset + i * (barWidth + gap);
    const barHeight = (item.hours / maxHours) * chartHeight;
    const y = chartBottom - barHeight;

    if (item.hours > 0) {
      ctx.fillStyle = item.subject.color;
      ctx.globalAlpha = 0.9;
      roundRect(ctx, x, y, barWidth, barHeight, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = item.hours > 0 ? "#e8e6e1" : "#9aa0ab";
    ctx.font = "600 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(item.hours.toFixed(1) + "h", x + barWidth / 2, y - 6);

    ctx.fillStyle = "#9aa0ab";
    ctx.font = "500 10px 'Inter', sans-serif";
    const label = fitText(ctx, item.subject.name.split(" ").slice(0, 2).join(" "), barWidth + gap - 2);
    ctx.fillText(label, x + barWidth / 2, chartBottom + 16);

    canvas._bars.push({
      x: x - gap / 2,
      w: barWidth + gap,
      text: `${item.subject.name}: ${item.hours.toFixed(1)}h`
    });
  });

  if (allZero) {
    ctx.fillStyle = "#9aa0ab";
    ctx.font = "500 13px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No sessions in this period yet.", width / 2, chartTop + chartHeight / 2);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h, w / 2);
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.arcTo(x, y + h, x + r, y + h, r);
  ctx.arcTo(x + w, y + h, x + w, y + h - r, r);
  ctx.arcTo(x + w, y, x + w - r, y, r);
  ctx.arcTo(x, y, x, y + r, r);
  ctx.closePath();
}

function renderHeatmap(container, sessions) {
  container.innerHTML = "";

  const weeks = 12;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Columns are weeks starting Monday, so rows line up with the day labels
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - mondayOffset - (weeks - 1) * 7);

  const minutesByDate = {};
  sessions.forEach(s => {
    minutesByDate[s.date] = (minutesByDate[s.date] || 0) + s.duration;
  });

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = dateKey(date);
      const mins = minutesByDate[key] || 0;

      const cell = document.createElement("div");
      cell.className = "heatmap-cell";
      if (date > today) {
        cell.style.visibility = "hidden";
      } else {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        cell.title = mins ? `${key}: ${h}h ${m}m` : `${key}: no study`;
        cell.style.background = heatColor(mins);
      }
      container.appendChild(cell);
    }
  }
}

function heatColor(minutes) {
  if (minutes <= 0) return "#2e333e";
  if (minutes < 30) return "#2f7a72";
  if (minutes < 60) return "#3d9d8f";
  if (minutes < 120) return "#4fd1c5";
  return "#8de8de";
}
