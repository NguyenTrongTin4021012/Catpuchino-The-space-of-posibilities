// Code by Pham Ha Hoang Trang for Catpuchino group project
// p5.js sketch: The Planet Soroban 

// =====================================================
// CONFIGURATION
// =====================================================
const CANVAS_W = 1920;
const CANVAS_H = 1080;

// Background stars
const NUM_STARS = 5000;

// Global scale for Soroban artwork
const ART_SCALE = 0.8;

// Soroban layout
const COLS = 5;
const BEAD_RADIUS = 60;
const COL_SPACE = 220;

// Animation tuning
const MOVE_LERP = 0.05;      // Smooth movement interpolation
const MOVE_THRESHOLD = 0.3; // Snap-to-target threshold

// Limit simultaneous movements to simulate finger interaction
const MAX_ACTIVE_MOVES = 1;

// =====================================================
// GLOBAL STATE
// =====================================================
let stars = [];
let columns = [];

let monoFont;
let beadSound;

// Sound pools
let ambienceTracks = [];
let clickSFX = [];

// Sound control
let currentAmbience = null;
let soundEnabled = false; // start muted to satisfy autoplay policies and match HTML label
let soundBtn; // legacy p5 button (not used when HTML button exists)

// Track active bead movements
let activeMoves = 0;

// =====================================================
// PRELOAD ASSETS
// =====================================================
function preload() {
  monoFont = loadFont("JetBrainsMono-Light.ttf");

  // Ambient sound options (one plays per session)
  ambienceTracks = [
    { name: "Ambience 1", sound: loadSound("Ambience.mp3"), volume: 0.5 },
    { name: "Ambience 2", sound: loadSound("Ambience2.mp3"), volume: 0.1 },
    { name: "Ambience 3", sound: loadSound("Ambience3.mp3"), volume: 0.08 },
  ];

  // Bead movement sound
  beadSound = loadSound("Bead.mp3");

  // Click interaction sound effects
  clickSFX = [
    loadSound("SFX1-Trang.mp3"),
    loadSound("SFX2-Trang.mp3"),
  ];
}

// =====================================================
// SETUP
// =====================================================
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  noFill();

  // Randomly select one ambient track per refresh
  currentAmbience = random(ambienceTracks);
  if (soundEnabled && currentAmbience) {
    currentAmbience.sound.setVolume(currentAmbience.volume);
    currentAmbience.sound.loop();
    console.log("Playing ambience:", currentAmbience.name);
  }

  // Sync HTML sound button label if present
  updateSoundButtonLabel();

  initStars();
}

// =====================================================
// DRAW LOOP
// =====================================================
function draw() {
  background(0);
  drawStars();
  drawSoroban();
  drawSorobanValueHUD();
}

// =====================================================
// STAR BACKGROUND
// =====================================================
function initStars() {
  let cx = width / 2;
  let cy = height / 2;
  let maxDist = dist(0, 0, cx, cy);

  // Generate star field with center-weighted brightness
  for (let i = 0; i < NUM_STARS; i++) {
    let x = random(width);
    let y = random(height);

    let d = dist(x, y, cx, cy);
    let brightness = map(d, 0, maxDist, 255, 80);
    let size = map(d, 0, maxDist, 2.2, 0.5);

    stars.push({
      x,
      y,
      b: brightness * random(0.6, 1.1),
      s: size * random(0.6, 1.3),
    });
  }
}

function drawStars() {
  stars.forEach((star) => {
    stroke(star.b);
    strokeWeight(star.s);
    point(star.x, star.y);
  });
}

// =====================================================
// SOROBAN SYSTEM
// =====================================================
function drawSoroban() {
  const gap = BEAD_RADIUS * 2 + 15;
  const beamGap = gap * 0.5;

  // Calculate vertical slot positions
  let slots = [];
  let acc = 0;
  for (let i = 0; i < 8; i++) {
    slots.push(acc);
    acc += i === 2 ? beamGap : gap;
  }

  // Center and scale the Soroban artwork
  let artW = COLS * COL_SPACE;
  let artH = acc;

  push();
  translate(width / 2, height / 2);
  scale(ART_SCALE);
  translate(-artW / 2, -artH / 2);

  // Create columns once
  if (columns.length === 0) {
    for (let c = 0; c < COLS; c++) {
      columns.push(
        new SorobanColumn(c * COL_SPACE + BEAD_RADIUS, slots, BEAD_RADIUS)
      );
    }
  }

  // Update and draw each column
  for (let col of columns) {
    col.update();
    col.draw();
  }

  pop();
}

// =====================================================
// SOROBAN COLUMN (ONE DIGIT)
// =====================================================
class SorobanColumn {
  constructor(x, slots, r) {
    this.x = x;
    this.slots = slots;
    this.r = r;

    this.isMoving = false;

    // Heaven bead (value = 5)
    this.heavenSlot = 0;
    this.heaven = new Planet(x, slots[0] + r, r);

    // Earth beads (value = 1 each)
    this.earthSlots = [4, 5, 6, 7];
    this.earths = this.earthSlots.map(
      (s) => new Planet(x, slots[s] + r, r)
    );

    // Random delay between movements
    this.timer = int(random(160, 320));
  }

  update() {
    if (!this.isMoving) {
      this.timer--;
      if (this.timer <= 0 && activeMoves < MAX_ACTIVE_MOVES) {
        this.startMove();
        this.timer = int(random(160, 320));
      }
    }

    this.heaven.update();
    this.earths.forEach((e) => e.update());

    this.checkMotionEnd();
  }

  startMove() {
    this.isMoving = true;
    activeMoves++;

    // Toggle heaven bead position
    this.heavenSlot = this.heavenSlot === 0 ? 1 : 0;
    this.heaven.setTarget(this.slots[this.heavenSlot] + this.r);
    playBeadSound();

    // Random earth bead movement
    let steps = int(random(1, 4));
    let dir = random([-1, 1]);
    let moved = false;

    for (let i = 0; i < steps; i++) {
      if (this.moveOneEarth(dir)) moved = true;
    }

    if (moved) playBeadSound();

    // Update earth bead target positions
    for (let i = 0; i < 4; i++) {
      this.earths[i].setTarget(
        this.slots[this.earthSlots[i]] + this.r
      );
    }
  }

  moveOneEarth(dir) {
    let indices =
      dir === -1
        ? [...this.earthSlots.keys()]
        : [...this.earthSlots.keys()].reverse();

    for (let i of indices) {
      let t = this.earthSlots[i] + dir;
      if (t >= 3 && t <= 7 && !this.earthSlots.includes(t)) {
        this.earthSlots[i] = t;
        return true;
      }
    }
    return false;
  }

  checkMotionEnd() {
    let done =
      this.heaven.y === this.heaven.targetY &&
      this.earths.every((e) => e.y === e.targetY);

    if (done && this.isMoving) {
      this.isMoving = false;
      activeMoves--;
    }
  }

  draw() {
    this.heaven.draw();
    this.earths.forEach((e) => e.draw());
  }

  // Calculate digit value (0–9)
  getValue() {
    let v = this.heavenSlot === 1 ? 5 : 0;
    this.earthSlots.forEach((s) => {
      if (s === 3) v += 1;
    });
    return v;
  }
}

// =====================================================
// PLANET (BEAD VISUAL)
// =====================================================
class Planet {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.targetY = y;
    this.r = r;

    // Randomized inner ring density
    this.ringCount =
      random() < 0.75 ? int(random(1, 6)) : int(random(8, 15));
  }

  setTarget(y) {
    this.targetY = y;
  }

  update() {
    this.y = lerp(this.y, this.targetY, MOVE_LERP);
    if (abs(this.y - this.targetY) < MOVE_THRESHOLD) {
      this.y = this.targetY;
    }
  }

  draw() {
    drawPlanet(this.x, this.y, this.r, this.ringCount);
  }
}

// =====================================================
// PLANET DRAWING
// =====================================================
function drawPlanet(x, y, r, ringCount) {
  push();
  translate(x, y);

  stroke(255);
  strokeWeight(2);
  fill (0);
  ellipse(0, 0, r * 2);

  strokeWeight(1);
  for (let i = 0; i < ringCount; i++) {
    let size = r * 2 - (i + 1) * (r * 0.15);
    let alpha = map(i, 0, ringCount - 1, 180, 40);
    if (size > 8) {
      stroke(255,alpha);
      ellipse(0, 0, size);
    }
  }
  pop();
}

// =====================================================
// VALUE DISPLAY (HUD)
// =====================================================
function getSorobanValue() {
  let total = 0;
  for (let i = 0; i < columns.length; i++) {
    let digit = columns[columns.length - 1 - i].getValue();
    total += digit * pow(10, i);
  }
  return total;
}

function drawSorobanValueHUD() {
  let value = getSorobanValue();

  push();
  textFont(monoFont);
  textSize(24);
  textAlign(RIGHT, BOTTOM);
  noStroke();

  fill(255);
  text("Current value:", width - 160, height - 40);

  fill(255, 200, 0);
  text(value, width - 60, height - 40);
  pop();
}

// =====================================================
// SOUND EFFECTS
// =====================================================

// Bead movement sound
function playBeadSound() {
  if (!soundEnabled) return;
  if (!beadSound.isPlaying()) {
    beadSound.setVolume(0.5);
    beadSound.play();
  }
}

// =====================================================
// SOUND BUTTON HANDLERS
// =====================================================
function toggleSound() {
  // Ensure audio context is started on user gesture (browser policy)
  if (typeof getAudioContext === "function") {
    const ctx = getAudioContext();
    if (ctx && ctx.state !== "running" && typeof userStartAudio === "function") {
      userStartAudio();
    }
  }

  soundEnabled = !soundEnabled;

  if (!soundEnabled) {
    if (currentAmbience && currentAmbience.sound.isPlaying()) {
      currentAmbience.sound.stop();
    }
  } else {
    if (currentAmbience && !currentAmbience.sound.isPlaying()) {
      currentAmbience.sound.setVolume(currentAmbience.volume);
      currentAmbience.sound.loop();
    }
  }

  updateSoundButtonLabel();
}

function updateSoundButtonLabel() {
  // Update p5 button if it exists
  if (soundBtn && typeof soundBtn.html === 'function') {
    soundBtn.html(soundEnabled ? "Sound: On" : "Sound: Off");
  }
  // Update HTML button if present
  const htmlBtn = typeof document !== 'undefined' ? document.getElementById('sound-toggle') : null;
  if (htmlBtn) {
    htmlBtn.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
  }
}

// Click interaction sound (randomized)
function playRandomClickSFX() {
  if (!soundEnabled) return;
  if (clickSFX.length === 0) return;

  let sfx = random(clickSFX);
  sfx.setVolume(0.05);
  sfx.stop();   
  sfx.play();
}

// Expose toggle for HTML inline handler
if (typeof window !== 'undefined') {
  window.toggleSound = toggleSound;
}


// =====================================================
// INTERACTION
// =====================================================
function mousePressed() {
  playRandomClickSFX();
}
