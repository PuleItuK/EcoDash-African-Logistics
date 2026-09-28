"use strict";

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const mmCanvas = document.getElementById('miniMap');
const mmCtx = mmCanvas.getContext('2d');
const wrapEl = document.getElementById('wrap');

/* Responsive canvas */
let W = 400, H = 533; // logical (CSS-pixel) game dimensions, updated on resize
function resizeCanvas() {
  const rect = wrapEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  W = rect.width; H = rect.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* Difficulty settings */
const DIFFICULTY = {
  easy:     { spawnMult: 1.5,  drainMult: 0.65, damageMult: 0.6, windMult: 0.5, rainMult: 0.6, maxSpeedMult: 0.9,  label: 'Easy' },
  hard:     { spawnMult: 0.85, drainMult: 1.15, damageMult: 1.2, windMult: 1.3, rainMult: 1.2, maxSpeedMult: 1.1,  label: 'Hard' },
  ultimate: { spawnMult: 0.55, drainMult: 1.6,  damageMult: 1.6, windMult: 1.8, rainMult: 1.5, maxSpeedMult: 1.25, label: 'Ultimate' }
};
let difficulty = 'easy';

/* Audio (generated, no external files) */
let audioCtx, muted = false, hum, humGain;
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    hum = audioCtx.createOscillator(); humGain = audioCtx.createGain();
    hum.type = 'sine'; hum.frequency.value = 90; humGain.gain.value = 0;
    hum.connect(humGain); humGain.connect(audioCtx.destination); hum.start();
  }
}
function beep(freq, dur, type = 'sine', vol = 0.15) {
  if (muted) return;
  try {
    ensureAudio();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}
function setHum(speedRatio) {
  if (!audioCtx) return;
  humGain.gain.value = muted ? 0 : 0.03 + speedRatio * 0.04;
  hum.frequency.value = 80 + speedRatio * 60;
}

/* Input */
const keys = {};
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === 'p') togglePause();
  if (k === 'm') muted = !muted;
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

/* ORIGINAL FEATURE (built independently, no Generative AI): DustParticle trail
  system — particles spawn behind the truck while moving and fade out. Explain
  this feature in the README's Original Feature section for 2.3. */
class DustParticle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vy = Math.random() * 0.5 + 0.3;
    this.life = 1; this.size = Math.random() * 3 + 2;
  }
  update(dt) { this.x += this.vx * dt * 60; this.y += this.vy * dt * 60; this.life -= dt * 1.2; }
  draw(ctx) {
    ctx.globalAlpha = Math.max(this.life, 0);
    ctx.fillStyle = '#c9a06a';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* Vehicle: delivery TRUCK (OOP, trig-based movement) */
class Truck {
  constructor() {
    this.x = W / 2; this.y = H - 100;
    this.steerAngle = 0;
    this.forwardSpeed = 0;
    const d = DIFFICULTY[difficulty];
    this.maxSpeed = 260 * d.maxSpeedMult; this.accel = 140; this.drag = 90;
    this.battery = 100;
    this.width = 30; this.cabH = 16; this.cargoH = 34; this.height = this.cabH + this.cargoH;
    this.dustTimer = 0;
  }
  update(dt, wind, raining) {
    const d = DIFFICULTY[difficulty];
    let steerInput = 0;
    if (keys['arrowleft'] || keys['a']) steerInput -= 1;
    if (keys['arrowright'] || keys['d']) steerInput += 1;
    this.steerAngle += steerInput * 1.8 * dt;
    this.steerAngle = Math.max(-0.6, Math.min(0.6, this.steerAngle));
    if (steerInput === 0) this.steerAngle *= (1 - 3 * dt);

    // Trig: Math.sin(steerAngle) converts heading angle into a lateral (x) velocity component
    const lateralV = Math.sin(this.steerAngle) * 220 + wind;
    this.x += lateralV * dt;
    this.x = Math.max(this.width, Math.min(W - this.width, this.x));

    let thrust = 0;
    if (keys['arrowup'] || keys['w']) thrust = 1;
    if (keys['arrowdown'] || keys['s']) thrust = -1;
    this.forwardSpeed += thrust * this.accel * dt;
    if (thrust === 0) {
      const drag = this.drag * dt;
      if (Math.abs(this.forwardSpeed) < drag) this.forwardSpeed = 0;
      else this.forwardSpeed -= Math.sign(this.forwardSpeed) * drag;
    }
    this.forwardSpeed = Math.max(0, Math.min(this.maxSpeed, this.forwardSpeed));

    const drainRate = (1.2 + (this.forwardSpeed / this.maxSpeed) * 4.5 + (raining ? 1.0 : 0)) * d.drainMult;
    this.battery = Math.max(0, this.battery - drainRate * dt);

    this.dustTimer -= dt;
    if (this.forwardSpeed > 20 && this.dustTimer <= 0) {
      dustParticles.push(new DustParticle(this.x + (Math.random() - 0.5) * 18, this.y + this.height / 2 - 4));
      this.dustTimer = 0.05;
    }
    setHum(this.forwardSpeed / this.maxSpeed);
  }
  rect() { return { x: this.x - this.width / 2, y: this.y - this.height / 2, w: this.width, h: this.height }; }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.steerAngle * 0.5);
    const halfW = this.width / 2, top = -this.height / 2;
    // cargo box (rear half — the truck's cargo container)
    ctx.fillStyle = '#3f7a54';
    ctx.fillRect(-halfW, top + this.cabH, this.width, this.cargoH);
    ctx.strokeStyle = '#274d33'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-halfW, top + this.cabH, this.width, this.cargoH);
    // solar panel on cargo roof
    ctx.fillStyle = '#1b3a6b';
    ctx.fillRect(-halfW + 3, top + this.cabH + 2, this.width - 6, 8);
    // cab (front, narrower + darker)
    ctx.fillStyle = '#2f6b4f';
    ctx.fillRect(-halfW + 3, top, this.width - 6, this.cabH);
    // windshield
    ctx.fillStyle = '#dceeff';
    ctx.fillRect(-halfW + 6, top + 2, this.width - 12, this.cabH - 6);
    // headlights
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath(); ctx.arc(-halfW + 4, top + 1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(halfW - 4, top + 1, 2.5, 0, Math.PI * 2); ctx.fill();
    // wheels
    ctx.fillStyle = '#111';
    [top + 4, top + this.cabH + 10, top + this.height - 8].forEach(wy => {
      ctx.fillRect(-halfW - 3, wy, 4, 9);
      ctx.fillRect(halfW - 1, wy, 4, 9);
    });
    ctx.restore();
  }
}

/* Obstacles, Solar Stations, Delivery Depots */
const TYPES = {
  pothole:      { shape: 'circle', r: 15, color: '#111',    damage: 14 },
  wildlife:     { shape: 'circle', r: 17, color: '#5a3d1e', damage: 18 },
  tree:         { shape: 'rect',   w: 32, h: 32, color: '#3b2a1a', damage: 26 },
  river:        { shape: 'rect',   w: 64, h: 18, color: '#2f7a9c', damage: 10 },
  construction: { shape: 'rect',   w: 34, h: 24, color: '#b8860b', damage: 20 }
};
class Obstacle {
  constructor(type, x) { this.type = type; this.x = x; this.y = -40; Object.assign(this, TYPES[type]); }
  update(dt, speed) { this.y += speed * dt; }
  rect() {
    if (this.shape === 'circle') return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }
  draw(ctx, visibility) {
    ctx.globalAlpha = visibility;
    ctx.fillStyle = this.color;
    if (this.shape === 'circle') { ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.globalAlpha = 1;
  }
}
class SolarStation {
  constructor(x) { this.x = x; this.y = -40; this.r = 24; this.active = true; }
  update(dt, speed) { this.y += speed * dt; }
  rect() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
  draw(ctx) {
    ctx.fillStyle = this.active ? 'rgba(95,191,127,0.35)' : 'rgba(120,120,120,0.25)';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.active ? '#5fbf7f' : '#888';
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('S', this.x, this.y + 5);
  }
}
class Depot {
  constructor(x, label) { this.x = x; this.y = -60; this.w = Math.min(90, W * 0.4); this.h = 28; this.label = label; }
  update(dt, speed) { this.y += speed * dt; }
  rect() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  draw(ctx) {
    ctx.fillStyle = 'rgba(242,201,76,0.85)';
    ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.strokeStyle = '#5a3d1e'; ctx.lineWidth = 2;
    ctx.strokeRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.fillStyle = '#2a1c0e'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(this.label, this.x, this.y + 4);
  }
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const MISSIONS = [
  { label: 'Rural Clinic' }, { label: 'Village School' }, { label: 'Flood Relief Camp' },
  { label: 'Solar Farm Outpost' }, { label: 'Remote Market' }
];

/* Game state */
let vehicle, obstacles, stations, depot, dustParticles, rainDrops;
let distance, missionScore, elapsed, spawnTimer, stationTimer, missionIndex;
let wind, windTimer, raining, rainTimer, loadShedding, loadShedTimer, loadShedMsgTimer;
let state = 'start';

function scoreKey() { return 'ecodash_highscores_' + difficulty; }
function loadHighScores() { return JSON.parse(localStorage.getItem(scoreKey()) || '[]'); }
function saveHighScore(s) {
  const list = loadHighScores(); list.push(s);
  list.sort((a, b) => b - a); const top = list.slice(0, 5);
  localStorage.setItem(scoreKey(), JSON.stringify(top));
}
function renderHighScores(el) {
  el.innerHTML = '';
  const top = loadHighScores();
  if (top.length === 0) { el.innerHTML = '<li>No runs yet</li>'; return; }
  top.forEach(s => { const li = document.createElement('li'); li.textContent = s + ' pts'; el.appendChild(li); });
}
renderHighScores(document.getElementById('hsListStart'));

function spawnDepot() {
  depot = new Depot(60 + Math.random() * Math.max(1, (W - 120)), MISSIONS[missionIndex % MISSIONS.length].label);
  document.getElementById('missionBox').textContent =
    '[' + DIFFICULTY[difficulty].label + '] Mission ' + (missionIndex + 1) + ': ' + depot.label + ' →';
}

function resetGame() {
  vehicle = new Truck();
  obstacles = []; stations = []; dustParticles = []; rainDrops = [];
  distance = 0; missionScore = 0; elapsed = 0; spawnTimer = 0; stationTimer = 3;
  wind = 0; windTimer = 2; raining = false; rainTimer = 8; loadShedding = false;
  loadShedTimer = 15; loadShedMsgTimer = 0; missionIndex = 0;
  spawnDepot();
}

function togglePause() {
  if (state === 'playing') { state = 'paused'; document.getElementById('pauseScreen').classList.remove('hidden'); }
  else if (state === 'paused') { state = 'playing'; document.getElementById('pauseScreen').classList.add('hidden'); }
}
document.querySelectorAll('#diffRow button').forEach(btn => {
  btn.onclick = () => {
    difficulty = btn.dataset.d;
    document.getElementById('startScreen').classList.add('hidden');
    resetGame(); state = 'playing';
  };
});
document.getElementById('resumeBtn').onclick = togglePause;
document.getElementById('restartBtn').onclick = () => {
  document.getElementById('overScreen').classList.add('hidden');
  resetGame(); state = 'playing';
};

function gameOver() {
  state = 'over';
  const effBonus = Math.round((vehicle.battery / 100) * 40);
  const finalScore = Math.round(missionScore + distance * 0.2 + effBonus);
  saveHighScore(finalScore);
  document.getElementById('overTitle').textContent = 'Battery Depleted: ' + DIFFICULTY[difficulty].label;
  document.getElementById('overStats').textContent =
    `Missions delivered: ${missionIndex} · Distance: ${Math.round(distance)}m · ` +
    `Efficiency bonus: ${effBonus} · Final Score: ${finalScore}`;
  renderHighScores(document.getElementById('hsListOver'));
  document.getElementById('overScreen').classList.remove('hidden');
  beep(120, 0.4, 'sawtooth', 0.2);
}

/* Main loop */
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  if (state === 'playing') update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  const d = DIFFICULTY[difficulty];
  elapsed += dt;

  windTimer -= dt;
  if (windTimer <= 0) { windTimer = 2 + Math.random() * 3; wind = (Math.random() - 0.5) * 160 * d.windMult; }
  const windForce = wind * Math.sin(elapsed * 1.3);

  rainTimer -= dt;
  if (rainTimer <= 0) {
    raining = !raining;
    rainTimer = raining ? (4 + Math.random() * 4) / d.rainMult : (6 + Math.random() * 6) / d.rainMult;
  }

  loadShedTimer -= dt;
  if (loadShedTimer <= 0) {
    loadShedding = !loadShedding; loadShedTimer = loadShedding ? 5 + Math.random() * 4 : 12 + Math.random() * 8;
    if (loadShedding) loadShedMsgTimer = 2.5;
    stations.forEach(s => s.active = !loadShedding);
  }
  loadShedMsgTimer -= dt;
  document.getElementById('warn').textContent =
    loadShedding && loadShedMsgTimer > 0 ? 'LOAD SHEDDING: Microgrids offline' : '';

  vehicle.update(dt, windForce, raining);
  distance += vehicle.forwardSpeed * dt * 0.5;

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = Math.max(0.4, (1.4 - elapsed * 0.004) * d.spawnMult);
    const keysArr = Object.keys(TYPES);
    const t = keysArr[Math.floor(Math.random() * keysArr.length)];
    obstacles.push(new Obstacle(t, 40 + Math.random() * Math.max(1, (W - 80))));
  }
  stationTimer -= dt;
  if (stationTimer <= 0) { stationTimer = 6 + Math.random() * 4; stations.push(new SolarStation(40 + Math.random() * Math.max(1, (W - 80)))); }

  const speed = 140 + vehicle.forwardSpeed;
  obstacles.forEach(o => o.update(dt, speed));
  stations.forEach(s => s.update(dt, speed));
  depot.update(dt, speed);
  obstacles = obstacles.filter(o => o.y < H + 60);
  stations = stations.filter(s => s.y < H + 60);

  const vr = vehicle.rect();
  obstacles = obstacles.filter(o => {
    if (overlap(vr, o.rect())) {
      vehicle.battery = Math.max(0, vehicle.battery - o.damage * d.damageMult);
      vehicle.forwardSpeed *= 0.4;
      beep(180, 0.15, 'square', 0.12);
      return false;
    }
    return true;
  });
  stations.forEach(s => {
    if (s.active && overlap(vr, s.rect()) && vehicle.battery < 100) {
      vehicle.battery = Math.min(100, vehicle.battery + 25 * dt);
    }
  });

  if (overlap(vr, depot.rect())) {
    missionScore += 100;
    missionIndex += 1;
    beep(660, 0.25, 'triangle', 0.18);
    spawnDepot();
  }
  if (depot.y > H + 60) spawnDepot();

  if (raining && Math.random() < 0.9) rainDrops.push({ x: Math.random() * W, y: -5, l: 10 + Math.random() * 10 });
  rainDrops.forEach(r => r.y += 500 * dt);
  rainDrops = rainDrops.filter(r => r.y < H + 20);

  dustParticles.forEach(p => p.update(dt));
  dustParticles = dustParticles.filter(p => p.life > 0);

  document.getElementById('distTxt').textContent = Math.round(distance);
  document.getElementById('scoreTxt').textContent = missionScore;
  document.getElementById('battFill').style.width = vehicle.battery + '%';
  document.getElementById('battFill').style.background = vehicle.battery < 25 ? 'var(--danger)' : 'var(--accent)';

  if (vehicle.battery <= 0) gameOver();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#e8a33d'); grad.addColorStop(0.35, '#c97a2b');
  grad.addColorStop(0.36, '#4a3b2a'); grad.addColorStop(1, '#3a2d20');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#e8d9b0'; ctx.setLineDash([16, 14]); ctx.lineWidth = Math.max(2, W * 0.007);
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);

  const visibility = raining ? 0.55 : 1;
  stations.forEach(s => s.draw(ctx));
  depot.draw(ctx);
  obstacles.forEach(o => o.draw(ctx, visibility));
  dustParticles.forEach(p => p.draw(ctx));
  vehicle.draw(ctx);

  if (raining) {
    ctx.strokeStyle = 'rgba(200,220,255,0.5)'; ctx.lineWidth = 1;
    rainDrops.forEach(r => { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 3, r.y + r.l); ctx.stroke(); });
    ctx.fillStyle = 'rgba(120,140,160,0.15)'; ctx.fillRect(0, 0, W, H);
  }
  drawMiniMap();
}

function drawMiniMap() {
  mmCtx.clearRect(0, 0, 60, 86);
  const scaleX = 60 / W, scaleY = 86 / H;
  mmCtx.fillStyle = '#5fbf7f';
  mmCtx.fillRect(vehicle.x * scaleX - 2, vehicle.y * scaleY - 3, 4, 6);
  mmCtx.fillStyle = '#f2c94c';
  mmCtx.fillRect(depot.x * scaleX - 3, depot.y * scaleY - 2, 6, 4);
  mmCtx.fillStyle = '#d9534f';
  obstacles.forEach(o => mmCtx.fillRect(o.x * scaleX - 1.5, o.y * scaleY - 1.5, 3, 3));
  mmCtx.fillStyle = '#7fd9a0';
  stations.forEach(s => mmCtx.fillRect(s.x * scaleX - 1.5, s.y * scaleY - 1.5, 3, 3));
}

resetGame();
requestAnimationFrame(loop);
