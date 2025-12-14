// Code by Nguyen Trong Tin for Catpuchino group project
// p5.js sketch: Turbulence

// ------------------------------------------------------------
// Visual config and state
// ------------------------------------------------------------
const ASSETS = {
  ambient: 'storm.wav',
  tone: 'track4_tone12.wav',
  slide: 'slide.wav',
};

let bg = 'black';
let cl = 'white';
let sw = 1;
let cr = 600; // boundary circle diameter

let dancers = []; // orbiting circles
let center = { x: 0, y: 0, vx: 0, vy: 0 }; // moving orbit center
let noiseX = 0, noiseY = 0; // Perlin noise seeds
let starBuffer; // off-screen graphics buffer for stars (render once)

let canvasRadiusX = 0, canvasRadiusY = 0; // cached canvas center
let maxBoundaryDist = 0; // inner boundary radius minus margin

// Audio state (user-gesture gated)
let audioStarted = false;
let isMuted = false;
let ambient, ambientReady = false, ambientVol = 0.15; // ambient storm loop
let tone, toneReady = false, tonePlaying = false;     // point-enter tone
let slide, slideReady = false;                        // interaction sound
let toneArmed = true, prevInside = false;             // trigger control

// ------------------------------------------------------------
// Orbiter class
// ------------------------------------------------------------
class Orbiter {
  constructor(orbitRadius, speed, size, startAngle) {
    this.orbitRadius = orbitRadius;
    this.speed = speed;
    this.size = size;
    this.angle = startAngle;
  }

  draw(centerX, centerY) {
    this.angle += this.speed;
    const x = centerX + cos(this.angle) * this.orbitRadius;
    const y = centerY + sin(this.angle) * this.orbitRadius;
    ellipse(x, y, this.size);
  }
}

// ------------------------------------------------------------
// p5 lifecycle
// ------------------------------------------------------------
function preload() {
  try {
    soundFormats('mp3', 'wav');
    ambient = loadSound(ASSETS.ambient, () => { ambientReady = true; }, (err) => { console.warn(`Failed to load ${ASSETS.ambient}`, err); });
    tone = loadSound(ASSETS.tone, () => { toneReady = true; }, (err) => { console.warn(`Failed to load ${ASSETS.tone}`, err); });
    slide = loadSound(ASSETS.slide, () => { slideReady = true; }, (err) => { console.warn(`Failed to load ${ASSETS.slide}`, err); });
  } catch (e) {
    console.warn('Preload sound error:', e);
  }
}

function setup() {
  createCanvas(1920, 1080);
  background(bg);

  canvasRadiusX = width / 2;
  canvasRadiusY = height / 2;
  maxBoundaryDist = cr / 2 - 175; // inner radius for center movement

  // Pre-render starfield
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

  // Spawn orbiting circles
  const count = floor(random(3, 7));
  for (let i = 0; i < count; i++) {
    dancers.push(new Orbiter(
      random(50, 200),
      random(0.05, 0.15) * (random() > 0.5 ? 1 : -1),
      random(50, 120),
      random(TWO_PI)
    ));
  }
}

function draw() {
  // Background: pre-rendered starfield + soft trails
  image(starBuffer, 0, 0);
  background(0, 0, 0, 10);

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
  //Aided partially by Copilot
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

  // Cursor-based tone trigger: play once on enter, re-arm after finish+exit
  const mx = mouseX, my = mouseY;
  if (mx >= 0 && my >= 0 && mx <= width && my <= height) {
    const mdx = mx - canvasRadiusX;
    const mdy = my - canvasRadiusY;
    const inside = sqrt(mdx * mdx + mdy * mdy) <= cr / 2;

    if (inside && !prevInside && toneArmed && audioStarted && toneReady && tone) {
      try {
        tone.setLoop(false);
        tone.setVolume(isMuted ? 0 : 0.12);
        tone.play();
        tonePlaying = true;
        toneArmed = false;

        if (typeof tone.onended === 'function') {
          tone.onended(() => {
            tonePlaying = false;
            const nowInside = (sqrt((mouseX - canvasRadiusX) ** 2 + (mouseY - canvasRadiusY) ** 2) <= cr / 2);
            if (!nowInside) toneArmed = true;
          });
        }
      } catch (e) {
        console.warn('Failed to play tone:', e);
      }
    }

    if (!inside && !tonePlaying) {
      toneArmed = true;
    }

    prevInside = inside;
  }
}

// ------------------------------------------------------------
// Input handlers
// ------------------------------------------------------------
function mousePressed() {
  if (!audioStarted || isMuted || !slideReady) return;
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    try {
      if (slide && slide.isPlaying()) slide.stop();
      slide.play();
    } catch (e) {
      console.error('Error playing slide sound on click:', e);
    }
  }
}

// ------------------------------------------------------------
// Sound controls (bound from tin.html)
// ------------------------------------------------------------
window.toggleSound = function toggleSound() {
  try {
    const ctx = getAudioContext();

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
      isMuted = !isMuted;

      if (isMuted) {
        try {
          if (ambient && ambient.isPlaying()) ambient.stop();
          if (tone && tone.isPlaying()) tone.stop();
          tonePlaying = false;
          toneArmed = true;
          if (slide && slide.isPlaying()) slide.stop();
        } catch (e) {
          console.warn('Error stopping sounds on mute:', e);
        }
      } else {
        if (ctx.state !== 'running') ctx.resume();
        if (ambientReady && ambient) {
          ambient.setLoop(true);
          ambient.setVolume(ambientVol);
          if (!ambient.isPlaying()) ambient.play();
        }
      }
    }

    const btn = document.getElementById('sound-toggle');
    if (btn) btn.textContent = `Sound: ${audioStarted && !isMuted ? 'On' : 'Off'}`;
  } catch (e) {
    console.warn('Sound toggle failed:', e);
  }
};
