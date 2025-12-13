// Visual config and core state
let bg = "black", cl = "white", sw = 1, cr = 600; // colors, stroke, circle diameter
let dancers = []; // orbiting circles
let center = { x: 0, y: 0, vx: 0, vy: 0 }; // moving orbit center
let noiseX = 0, noiseY = 0; // Perlin noise seeds for smooth chaos
let starBuffer; // off-screen graphics buffer for stars (render once)
// Asset path config (edit here if files move)
const ASSETS = {
  ambient: 'assets/storm.wav',
  tone: 'assets/track4_tone12.wav',
};
let canvasRadiusX = 0, canvasRadiusY = 0; // cached canvas center
let maxBoundaryDist = 0; // boundary radius minus margin

// Audio state (user-gesture gated)
let audioStarted = false; // AudioContext resumed by user click
let isMuted = false;      // current mute state
let ambient, ambientReady = false, ambientVol = 0.15; // ambient storm loop
let tone, toneReady = false, tonePlaying = false;     // point-enter tone
let toneArmed = true, prevInside = false;             // trigger control

// Orbiting circle
class Orbiter {
  constructor(orbitRadius, speed, size, startAngle) {
    this.orbitRadius = orbitRadius; // distance from center
    this.speed = speed;             // radians per frame
    this.size = size;               // circle diameter
    this.angle = startAngle;        // current angle
  }

  // Draw circle at current position
  draw(centerX, centerY) {
    this.angle += this.speed;
    const x = centerX + cos(this.angle) * this.orbitRadius;
    const y = centerY + sin(this.angle) * this.orbitRadius;
    ellipse(x, y, this.size);
  }
}

// Setup canvas and pre-render starfield to buffer
function setup() {
  createCanvas(1920, 1080);
  background(bg);

  // Cache center and boundary
  canvasRadiusX = width / 2;
  canvasRadiusY = height / 2;
  maxBoundaryDist = cr / 2 - 175; // inner radius for center movement

  // Pre-render starfield into buffer once
  starBuffer = createGraphics(width, height);
  starBuffer.stroke(cl);
  starBuffer.strokeWeight(1);
  for (let i = 0; i < 1000; i++) {
    starBuffer.point(random(width), random(height));
  }

  // Init center + noise seeds
  center.x = canvasRadiusX;
  center.y = canvasRadiusY;
  noiseX = random(1000);
  noiseY = random(1000);

  // Spawn 2-4 orbiting circles
  const count = floor(random(2, 5));
  for (let i = 0; i < count; i++) {
    dancers.push(new Orbiter(
      random(50, 200),                         // orbit radius
      random(0.05, 0.1) * (random() > 0.5 ? 1 : -1), // speed
      random(50, 120),                         // size
      random(TWO_PI)                           // start angle
    ));
  }
}

// Preload audio assets (runs before setup)
function preload() {
  try {
    soundFormats('mp3', 'wav');
    ambient = loadSound(ASSETS.ambient, () => { ambientReady = true; }, (err) => { console.warn(`Failed to load ${ASSETS.ambient}`, err); });
    tone = loadSound(ASSETS.tone, () => { toneReady = true; }, (err) => { console.warn(`Failed to load ${ASSETS.tone}`, err); });
  } catch (e) {
    console.warn('Preload sound error:', e);
  }
}

// Main animation loop - update center position, constrain to boundary, draw everything
function draw() {
  // Background: pre-rendered starfield
  image(starBuffer, 0, 0); // fast blit
  // Optional motion trails: uncomment for fade
  // background(0, 0, 0, 35);

  // Boundary circle
  stroke(cl);
  strokeWeight(sw);
  noFill();
  circle(canvasRadiusX, canvasRadiusY, cr);

  // Chaotic center motion via Perlin noise
  center.vx = (noise(noiseX) - 0.5) * 15;
  center.vy = (noise(noiseY) - 0.5) * 15;
  noiseX += random(0.001, 0.05);
  noiseY += random(0.001, 0.05);
  center.x += center.vx;
  center.y += center.vy;

  // Keep center inside inner boundary (bounce on hit)
  const dx = center.x - canvasRadiusX;
  const dy = center.y - canvasRadiusY;
  const distance = sqrt(dx * dx + dy * dy);
  if (distance > maxBoundaryDist) {
    const angle = atan2(dy, dx);
    center.x = canvasRadiusX + cos(angle) * maxBoundaryDist;
    center.y = canvasRadiusY + sin(angle) * maxBoundaryDist;
    center.vx *= -1;
    center.vy *= -1;
  }

  // Draw orbiting circles
  stroke(cl);
  strokeWeight(sw);
  fill(bg);
  for (const d of dancers) d.draw(center.x, center.y);

  // Cursor-based tone trigger: play when cursor is within boundary circle
  // Only after audio has been started by user gesture
  // Cursor-based tone trigger: play once on enter, re-arm after finish+exit
  const mx = mouseX, my = mouseY;
  if (mx >= 0 && my >= 0 && mx <= width && my <= height) {
    const mdx = mx - canvasRadiusX;
    const mdy = my - canvasRadiusY;
    const inside = sqrt(mdx * mdx + mdy * mdy) <= cr / 2;
    // Trigger logic: play once on enter (outside -> inside), no loop
    // Only re-arm after sound finished AND cursor left the circle
    if (inside && !prevInside && toneArmed && audioStarted && toneReady && tone) {
      try {
        tone.setLoop(false);
        tone.setVolume(isMuted ? 0 : 0.12);
        tone.play();
        tonePlaying = true;
        toneArmed = false; // disarm until finished and outside
        // On end: mark not playing; re-arm happens when outside
        if (typeof tone.onended === 'function') {
          tone.onended(() => {
            tonePlaying = false;
            // Re-arm only if cursor is already outside
            const nowInside = (sqrt((mouseX - canvasRadiusX) ** 2 + (mouseY - canvasRadiusY) ** 2) <= cr / 2);
            if (!nowInside) toneArmed = true;
          });
        }
      } catch (e) {
        console.warn('Failed to play tone:', e);
      }
    }

    // If cursor leaves and tone isn't playing, re-arm
    if (!inside && !tonePlaying) {
      toneArmed = true;
    }

    // Update previous inside/outside state
    prevInside = inside;
  }
}

// --- Sound control functions (called from tin.html buttons) ---
// Single toggle: initialize audio on first click, then mute/unmute
window.toggleSound = function toggleSound() {
  try {
    const ctx = getAudioContext();
    // First-time init
    if (!audioStarted) {
      if (ctx.state !== 'running') ctx.resume();
      if (ambientReady && ambient) {
        ambient.setLoop(true);
        ambient.setVolume(ambientVol);
        ambient.play();
      }
      audioStarted = true;
      isMuted = false;
    } else {
      // Subsequent toggles: mute/unmute
      isMuted = !isMuted;
      if (isMuted) {
        if (ambient) ambient.setVolume(0);
      } else {
        if (ctx.state !== 'running') ctx.resume();
        if (ambient) ambient.setVolume(ambientVol);
      }
    }

    // Update label
    const btn = document.getElementById('sound-toggle');
    if (btn) btn.textContent = `Sound: ${audioStarted && !isMuted ? 'On' : 'Off'}`;
  } catch (e) {
    console.warn('Sound toggle failed:', e);
  }
};