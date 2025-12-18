// Code by Nguyen Trong Tin for Catpuchino group project
// p5.js sketch: Turbulence

// ------------------------------------------------------------
// Visual config and state
// ------------------------------------------------------------
const ASSETS = {
  ambient: 'storm.mp3',
  tone: 'track4_tone12.mp3',
  slide: 'slide.mp3',
  blipSelect2tin: 'blipSelect2tin.mp3',
  breathe: 'breathe.mp3',
  jumpscare: 'jumpscare.mp3',
};
const NUM_STARS = 2000;
const NOISE_STEP = 0.02; // constant noise increment for smoother, faster animation

// Audio volume settings
const VOLUME_AMBIENT = 0.4;
const VOLUME_TONE = 0.8;
const VOLUME_SLIDE = 1.0;
const VOLUME_BLIP = 0.6;
const VOLUME_BREATHE = 0.2;
const VOLUME_JUMPSCARE = 0.9;

let bg = 'black';
let cl = 'white';
let sw = 2;
let cr = 750; // boundary circle diameter
let stars = [];

let dancers = []; // orbiting circles
let center = { x: 0, y: 0, vx: 0, vy: 0 }; // moving orbit center
let noiseX = 0, noiseY = 0; // Perlin noise seeds
let starBuffer; // off-screen graphics buffer for stars (render once)

let canvasRadiusX = 0, canvasRadiusY = 0; // cached canvas center
let maxBoundaryDist = 0; // inner boundary radius minus margin
let circleRadius = 0; // cached circle radius (cr / 2)

// Audio state (user-gesture gated)
let audioStarted = false;
let isMuted = false;
let ambient, ambientReady = false; // ambient storm loop
let tone, toneReady = false, tonePlaying = false;     // point-enter tone
let slide, slideReady = false;                        // interaction sound
let blipSelect2tin, blipSelect2tinReady = false;      // non-interactable click sound
let breathe, breatheReady = false;                    // random breathe sound
let breatheTimer = null;                              // timer for random breathe playback
let jumpscare, jumpscareReady = false;                // random jumpscare sound
let jumpscareTimer = null;                            // timer for jumpscare playback
let toneArmed = true, prevInside = false;             // trigger control

// ------------------------------------------------------------
// Orbiter class
// ------------------------------------------------------------
class Orbiter {
  constructor(orbitRadius, speed, startAngle) {
    this.orbitRadius = orbitRadius;
    this.speed = speed;
    this.angle = startAngle;
    this.maxTrail = floor(random(7, 10));
    this.trail = new Array(this.maxTrail); // pre-allocate array
    this.trailIndex = 0; // circular buffer index
    this.trailCount = 0; // track how many points added
  }

  draw(cx, cy) {
    const x = cx + cos(this.angle) * this.orbitRadius;
    const y = cy + sin(this.angle) * this.orbitRadius;
    
    // Add to circular buffer
    this.trail[this.trailIndex] = {x, y};
    this.trailIndex = (this.trailIndex + 1) % this.maxTrail;
    if (this.trailCount < this.maxTrail) this.trailCount++;

    stroke(cl);
    strokeWeight(sw);
    noFill();
    beginShape();
    
    // Draw from oldest to newest
    const startIdx = this.trailCount < this.maxTrail ? 0 : this.trailIndex;
    for (let i = 0; i < this.trailCount; i++) {
      const idx = (startIdx + i) % this.maxTrail;
      const p = this.trail[idx];
      vertex(p.x, p.y);
    }
    
    endShape();

    this.angle += this.speed;
  }
}

// ------------------------------------------------------------
// p5 lifecycle
// ------------------------------------------------------------
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
  // De-duplicate while preserving order (prefer declared path first)
  const declaredFirst = rel === assets ? [assets, root] : [root, assets];
  return declaredFirst.filter((v, idx, arr) => arr.indexOf(v) === idx);
}

function preload() {
  try {
    soundFormats('mp3', 'wav');
    loadSoundWithFallback(
      pathVariants(ASSETS.ambient),
      (snd) => { ambient = snd; ambientReady = true; },
      (err) => { console.warn('Ambient load failed (all variants):', err); }
    );
    loadSoundWithFallback(
      pathVariants(ASSETS.tone),
      (snd) => { tone = snd; toneReady = true; },
      (err) => { console.warn('Tone load failed (all variants):', err); }
    );
    loadSoundWithFallback(
      pathVariants(ASSETS.slide),
      (snd) => { slide = snd; slideReady = true; },
      (err) => { console.warn('Slide load failed (all variants):', err); }
    );
    loadSoundWithFallback(
      pathVariants(ASSETS.blipSelect2tin),
      (snd) => { blipSelect2tin = snd; blipSelect2tinReady = true; },
      (err) => { console.warn('BlipSelect2tin load failed (all variants):', err); }
    );
    loadSoundWithFallback(
      pathVariants(ASSETS.breathe),
      (snd) => { breathe = snd; breatheReady = true; },
      (err) => { console.warn('Breathe load failed (all variants):', err); }
    );
    loadSoundWithFallback(
      pathVariants(ASSETS.jumpscare),
      (snd) => { jumpscare = snd; jumpscareReady = true; },
      (err) => { console.warn('Jumpscare load failed (all variants):', err); }
    );
  } catch (e) {
    console.warn('Preload sound error:', e);
  }
}

function setup() {
  createCanvas(1920, 1080);
  background(bg);
  initStars();

  canvasRadiusX = width / 2;
  canvasRadiusY = height / 2;
  circleRadius = cr / 2; // cache circle radius calculation
  maxBoundaryDist = cr / 2 - 200; // inner radius for center movement

  // Init center + noise seeds
  center.x = canvasRadiusX;
  center.y = canvasRadiusY;
  noiseX = random(1000);
  noiseY = random(1000);

  // Spawn orbiters
  const count = floor(random(17, 20));
  for (let i = 0; i < count; i++) {
    dancers.push(new Orbiter(
      random(40, 200),
      random(0.05, 0.2) * (random() > 0.5 ? 1 : -1),
      random(TWO_PI)
    ));
  }

  // Pre-render starfield to off-screen buffer (performance optimization)
  starBuffer = createGraphics(width, height);
  starBuffer.background(bg);
  
  // Batch draw stars for better performance
  starBuffer.noFill();
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    starBuffer.stroke(star.b);
    starBuffer.strokeWeight(star.s);
    starBuffer.point(star.x, star.y);
  }
  
  // Draw circle to the buffer so stars don't cover it
  starBuffer.stroke(cl);
  starBuffer.strokeWeight(sw);
  starBuffer.fill(bg);
  starBuffer.circle(canvasRadiusX, canvasRadiusY, cr);

  // Start random breathe sound schedule
  scheduleBreatheSounds();
  // Start random jumpscare schedule (roughly every 2–3 minutes)
  scheduleJumpscareSound();
}

// Schedule breathe.mp3 to play at random intervals (5-10 seconds)
function scheduleBreatheSounds() {
  if (breatheTimer) clearTimeout(breatheTimer);
  
  const randomInterval = random(5000, 10000); // 5-10 seconds in milliseconds
  
  breatheTimer = setTimeout(() => {
    if (audioStarted && !isMuted && breatheReady && breathe) {
      try {
        if (breathe.isPlaying()) breathe.stop();
        breathe.setVolume(VOLUME_BREATHE);
        breathe.play();
      } catch (e) {
        console.warn('Failed to play breathe:', e);
      }
    }
    // Reschedule for next random interval
    scheduleBreatheSounds();
  }, randomInterval);
}

// Schedule jumpscare.mp3 to play at random intervals (~2-3 minutes)
function scheduleJumpscareSound() {
  if (jumpscareTimer) clearTimeout(jumpscareTimer);

  // Random delay between 120s and 180s
  const delay = floor(random(120000, 180000));

  jumpscareTimer = setTimeout(() => {
    if (audioStarted && !isMuted && jumpscareReady && jumpscare) {
      try {
        if (jumpscare.isPlaying()) jumpscare.stop();
        jumpscare.setVolume(VOLUME_JUMPSCARE);
        jumpscare.play();
      } catch (e) {
        console.warn('Failed to play jumpscare:', e);
      }
    }
    // Reschedule for next random interval
    scheduleJumpscareSound();
  }, delay);
}
// ======================
// STARS
// ======================
function initStars() {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = dist(0, 0, centerX, centerY);

  // Pre-allocate array for better performance
  stars = new Array(NUM_STARS);

  for (let i = 0; i < NUM_STARS; i++) {
    const x = random(width);
    const y = random(height);

    // Brighter and bigger when near the center  
    const distanceToCenter = dist(x, y, centerX, centerY);
    const brightness = map(distanceToCenter, 0, maxDistance, 255, 80);
    const size = map(distanceToCenter, 0, maxDistance, 2.2, 0.5);

    stars[i] = {
      x: x,
      y: y,
      b: brightness * random(0.6, 1.1),
      s: size * random(0.6, 1.3)
    };
  }
}

// Helper: check if point is inside the boundary circle
function isInsideCircle(x, y) {
  const dx = x - canvasRadiusX;
  const dy = y - canvasRadiusY;
  return sqrt(dx * dx + dy * dy) <= circleRadius;
}

function draw() {
  // Apply fade effect to create trails (semi-transparent black overlay)
  fill(0, 0, 0, 40);
  noStroke();
  rect(0, 0, width, height);
  
  // Draw pre-rendered starfield buffer on top to keep stars visible
  blendMode(ADD);
  image(starBuffer, 0, 0);
  blendMode(BLEND);
  
  stroke(cl);
  strokeWeight(sw);
  fill(bg);
  noFill();
  circle(canvasRadiusX, canvasRadiusY, cr);


  // Chaotic center motion via Perlin noise
  center.vx = (noise(noiseX) - 0.5) * 15;
  center.vy = (noise(noiseY) - 0.5) * 15;
  noiseX += NOISE_STEP;
  noiseY += NOISE_STEP;
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

  // Cursor-based slide trigger: play on enter and exit
  const mx = mouseX, my = mouseY;
  if (mx >= 0 && my >= 0 && mx <= width && my <= height) {
    const inside = isInsideCircle(mx, my);

    // Play slide when entering or exiting the circle
    if ((inside && !prevInside) || (!inside && prevInside)) {
      if (audioStarted && !isMuted && slideReady && slide) {
        try {
          if (slide.isPlaying()) slide.stop();
          slide.setVolume(VOLUME_SLIDE);
          slide.play();
        } catch (e) {
          console.warn('Failed to play slide:', e);
        }
      }
    }

    prevInside = inside;
  }
}

// ------------------------------------------------------------
// Input handlers
// ------------------------------------------------------------
function mousePressed() {
  if (!audioStarted || isMuted) return;
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // Check if click is inside the circle boundary
    const inside = isInsideCircle(mouseX, mouseY);

    if (inside && toneReady) {
      // Click inside circle: play tone
      try {
        if (tone && tone.isPlaying()) tone.stop();
        tone.setVolume(VOLUME_TONE);
        tone.setLoop(false);
        tone.play();
      } catch (e) {
        console.error('Error playing tone sound on click:', e);
      }
    } else if (!inside && blipSelect2tinReady) {
      // Click outside circle (non-interactable): play blipSelect2tin
      try {
        if (blipSelect2tin && blipSelect2tin.isPlaying()) blipSelect2tin.stop();
        blipSelect2tin.setVolume(VOLUME_BLIP);
        blipSelect2tin.play();
      } catch (e) {
        console.error('Error playing blipSelect2tin sound on click:', e);
      }
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
        ambient.setVolume(VOLUME_AMBIENT);
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
          ambient.setVolume(VOLUME_AMBIENT);
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