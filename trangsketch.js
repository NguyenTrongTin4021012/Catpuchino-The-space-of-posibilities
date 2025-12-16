// ======================
// CONFIG
// ======================
const CANVAS_W = 1920;
const CANVAS_H = 1080;

const NUM_STARS = 5000;
const ART_SCALE = 0.8;

const COLS = 5;
const BEAD_RADIUS = 60;
const COL_SPACE = 220;

const MOVE_LERP = 0.05;
const MOVE_THRESHOLD = 0.3;

const MAX_ACTIVE_MOVES = 1; //Limit movement to simulate finger movement

// ======================
// GLOBAL
// ======================
let stars = [];
let columns = [];

let monoFont;
let ambienceSound;
let beadSound;

let activeMoves = 0;

// ======================
// SOUND HELPERS
// ======================
// Helper: try multiple URL variants until one loads
function loadSoundWithFallback(paths, onSuccess, onAllFail) {
  let i = 0;
  const tryNext = () => {
    if (i >= paths.length) {
      if (onAllFail) onAllFail(new Error('All paths failed: ' + paths.join(', ')));
      return;
    }
    const url = paths[i++];
    loadSound(
      url,
      (snd) => { if (onSuccess) onSuccess(snd, url); },
      (err) => { console.warn(`Failed to load ${url}`, err); tryNext(); }
    );
  };
  tryNext();
}

// Build root/assets variants for a given relative path
function pathVariants(rel) {
  const hasAssets = /^assets\//.test(rel);
  const root = hasAssets ? rel.replace(/^assets\//, '') : rel;
  const assets = hasAssets ? rel : `assets/${root}`;
  const declaredFirst = rel === assets ? [assets, root] : [root, assets];
  return declaredFirst.filter((v, idx, arr) => arr.indexOf(v) === idx);
}

// Audio state (user-gesture gated)
let audioStarted = false;
let isMuted = false;
let ambienceReady = false;
let beadReady = false;

// ======================
// PRELOAD
// ======================
function preload() {
  monoFont = loadFont("JetBrainsMono-Light.ttf");
  soundFormats('mp3', 'wav');
  loadSoundWithFallback(
    pathVariants("Ambience.mp3"),
    (snd) => { ambienceSound = snd; ambienceReady = true; },
    (err) => { console.warn('Ambience load failed (all variants):', err); }
  );
  loadSoundWithFallback(
    pathVariants("Bead.mp3"),
    (snd) => { beadSound = snd; beadReady = true; },
    (err) => { console.warn('Bead load failed (all variants):', err); }
  );
}

// ======================
// SETUP
// ======================
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  noFill();

  // Don't auto-play; wait for user gesture via toggleSound()
  initStars();
}

// ======================
// DRAW
// ======================
function draw() {
  background(0);
  drawStars();
  drawSoroban();
  drawSorobanValueHUD();
}

// ======================
// STARS
// ======================
function initStars() {
  let centerX = width / 2;
  let centerY = height / 2;

  let maxDistance = dist(0, 0, centerX, centerY);


  for (let i = 0; i < NUM_STARS; i++) {
    let x = random(width);
    let y = random(height);

//Brighter and bigger when near the center  
    let distanceToCenter = dist(x, y, centerX, centerY);
    let brightness = map(distanceToCenter, 0, maxDistance, 255, 80);
    let size = map(distanceToCenter, 0, maxDistance, 2.2, 0.5);

    stars.push({
      x: x,
      y: y,
      b: brightness * random(0.6, 1.1),
      s: size * random(0.6, 1.3)
    });
  }
}

function drawStars() {
  stars.forEach(function(star) {
    stroke(star.b);
    strokeWeight(star.s);
    point(star.x, star.y);
  });
}

// ======================
// SOROBAN
// ======================
function drawSoroban() {
  const gap = BEAD_RADIUS * 2 + 15;
  const beamGap = gap * 0.5; 

  // slot positions
  let slots = [];
  let acc = 0;
  for (let i = 0; i < 8; i++) {
    slots.push(acc);
    acc += (i === 2) ? beamGap : gap;
  }

  
  //scale art in the center
  let artW = COLS * COL_SPACE;
  let artH = acc;
  push();
  translate(width / 2, height / 2);
  scale(ART_SCALE);
  translate(-artW / 2, -artH / 2);
  
  
//make sure only generate column once 
  if (columns.length === 0) {
    for (let c = 0; c < COLS; c++) {
      columns.push(
        new SorobanColumn(c * COL_SPACE + BEAD_RADIUS, slots, BEAD_RADIUS)
      );
    }
  }

  for (let col of columns) {
    col.update();
    col.draw();
  }

  pop();
}

// ======================
// COLUMN
// ======================
class SorobanColumn {
  constructor(x, slots, r) {
    this.x = x;
    this.slots = slots;
    this.r = r;

    this.isMoving = false; //prevent overlapping

    // heaven bead
    this.heavenSlot = 0;
    this.heaven = new Planet(x, slots[0] + r, r);

    // earth beads (packed bottom)
    this.earthSlots = [4, 5, 6, 7];
    this.earths = this.earthSlots.map(
      s => new Planet(x, slots[s] + r, r)
    );

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
    this.earths.forEach(e => e.update());

    this.checkMotionEnd();
  }

  startMove() {
    this.isMoving = true;
    activeMoves++;

    // heaven toggle
    this.heavenSlot = this.heavenSlot === 0 ? 1 : 0;
    this.heaven.setTarget(this.slots[this.heavenSlot] + this.r);
    playBeadSound();

    // earth beads (1–3 beads)
    let steps = int(random(1, 4));
    let dir = random([-1, 1]);
    let moved = false;

    for (let i = 0; i < steps; i++) {
      if (this.moveOneEarth(dir)) moved = true;
    }

    if (moved) playBeadSound();

    // update targets
    for (let i = 0; i < 4; i++) {
      this.earths[i].setTarget(
        this.slots[this.earthSlots[i]] + this.r
      );
    }
  }

  moveOneEarth(dir) {
    let indices = dir === -1
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
      this.earths.every(e => e.y === e.targetY);

    if (done && this.isMoving) {
      this.isMoving = false;
      activeMoves--;
    }
  }

  draw() {
    this.heaven.draw();
    this.earths.forEach(e => e.draw());
  }

  // digit value (0–9)
  getValue() {
    let v = this.heavenSlot === 1 ? 5 : 0;
    this.earthSlots.forEach(s => {
      if (s === 3) v += 1;
    });
    return v;
  }
}

// ======================
// PLANET
// ======================
class Planet {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.targetY = y;
    this.r = r;

    this.ringCount = random() < 0.75
      ? int(random(1, 6))
      : int(random(8, 15));
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

// ======================
// PLANET DRAW
// ======================
function drawPlanet(x, y, r, ringCount) {
  push();
  translate(x, y);

  stroke(255);
  strokeWeight(2);
  ellipse(0, 0, r * 2);

  strokeWeight(1);
  for (let i = 0; i < ringCount; i++) {
    let size = r * 2 - (i + 1) * (r * 0.15);
    let alpha = map(i, 0, ringCount - 1, 180, 40);
    if (size > 8) {
      stroke(255, alpha);
      ellipse(0, 0, size);
    }
  }
  pop();
}

// ======================
// VALUE HUD
// ======================
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

// ======================
// SOUND 
// ======================
function playBeadSound() {
  if (!beadSound.isPlaying()) {
    beadSound.setVolume(0.4);
    beadSound.play();
  }
}

// ======================
// SOUND CONTROLS
// ======================
window.toggleSound = function toggleSound() {
  try {
    const ctx = getAudioContext();

    if (!audioStarted) {
      if (ctx.state !== 'running') ctx.resume();
      if (ambienceReady && ambienceSound) {
        ambienceSound.setLoop(true);
        ambienceSound.setVolume(0.25);
        ambienceSound.play();
      }
      audioStarted = true;
      isMuted = false;
    } else {
      isMuted = !isMuted;

      if (isMuted) {
        try {
          if (ambienceSound && ambienceSound.isPlaying()) ambienceSound.stop();
          if (beadSound && beadSound.isPlaying()) beadSound.stop();
        } catch (e) {
          console.warn('Error stopping sounds on mute:', e);
        }
      } else {
        if (ctx.state !== 'running') ctx.resume();
        if (ambienceReady && ambienceSound) {
          ambienceSound.setLoop(true);
          ambienceSound.setVolume(0.25);
          if (!ambienceSound.isPlaying()) ambienceSound.play();
        }
      }
    }

    const btn = document.getElementById('sound-toggle');
    if (btn) btn.textContent = `Sound: ${audioStarted && !isMuted ? 'On' : 'Off'}`;
  } catch (e) {
    console.warn('Sound toggle failed:', e);
  }
};








