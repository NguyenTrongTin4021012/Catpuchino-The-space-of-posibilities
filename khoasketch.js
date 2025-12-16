let starBuffer; //so that it draw once
let rot = 0;  // rotation angle
let numQuads; // how much light rays

// Audio variables
let sfx4;
let sfx5;
let sfx6;

// Audio state (user-gesture gated)
let audioStarted = false;
let isMuted = false;
let sfx4Ready = false;
let sfx5Ready = false;
let sfx6Ready = false;

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

function preload() {
  soundFormats('mp3');
  loadSoundWithFallback(
    pathVariants('sfx4.mp3'),
    (snd) => { sfx4 = snd; sfx4Ready = true; },
    (err) => { console.warn('sfx4 load failed (all variants):', err); }
  );
  loadSoundWithFallback(
    pathVariants('sfx5.mp3'),
    (snd) => { sfx5 = snd; sfx5Ready = true; },
    (err) => { console.warn('sfx5 load failed (all variants):', err); }
  );
  loadSoundWithFallback(
    pathVariants('sfx6.mp3'),
    (snd) => { sfx6 = snd; sfx6Ready = true; },
    (err) => { console.warn('sfx6 load failed (all variants):', err); }
  );
}

function setup() {
  createCanvas(1920, 1080);

  // star bg
  starBuffer = createGraphics(width, height);
  starBuffer.background(20);
  starBuffer.stroke(255);
  starBuffer.strokeWeight(2);
  for (let i = 0; i < 1000; i++) {
    starBuffer.point(random(width), random(height));
  }

  numQuads = int(random(80, 150)); // how much light rays
}

function draw() {
  background(20);

  // this one put the bg there
  image(starBuffer, 0, 0);

  translate(width / 2, height / 2);

  rotate(rot);
  rot += random(-0.0001, -0.0005); // rotation speed, negative number for counter clockwise

  let radius = 0;

  let triHeight = 750; // ray length
  let circleRadius = 250;
  let innerR = circleRadius + 10;
  let outerR = innerR + triHeight; // more ray stuff innerR start outerR ends

  let step = TWO_PI / numQuads; // angular gap between rays

  for (let i = 0; i < numQuads; i++) {
    push(); // push n pop make the stuff happen inside it like inside it, keep the quad stuff here

    let angle = map(i, 0, numQuads, 0, TWO_PI); // these one to make it like neat in a circle n all that
    let offsetX = cos(angle) * radius;
    let offsetY = sin(angle) * radius;

    translate(offsetX, offsetY);
    noFill();
    strokeWeight(1); // line thickness

    let mid = angle + step / 2;

    let segments = 40; // higher number = smoother fade
    for (let s = 0; s < segments; s++) {
      let t1 = s / segments;
      let t2 = (s + 1) / segments;

      let r1 = lerp(innerR, outerR, t1);
      let r2 = lerp(innerR, outerR, t2);

      // alpha fades outward
      let alpha = lerp(200, 30, t1); // first number is alpha of inside, second is alpha of outside

      stroke(255, alpha);

      let x1 = r1 * cos(mid);
      let y1 = r1 * sin(mid);
      let x2 = r2 * cos(mid);
      let y2 = r2 * sin(mid);

      line(x1, y1, x2, y2); // line stuff
    }

    pop();
  }

  resetMatrix();

  push();
  stroke(255);
  strokeWeight(2.5); // line thickness
  fill(0);
  ellipse(width / 2, height / 2, 500, 500); // size of the middle circle, might need change as needed
  pop();
}

function mousePressed() {
  if (!audioStarted || isMuted || !sfx5Ready || !sfx5) return;
  try {
    if (sfx5.isPlaying()) sfx5.stop();
    sfx5.play();
  } catch (e) {
    console.warn('Error playing sfx5:', e);
  }
}

function keyPressed() {
  if (key === ' ') {
    if (!audioStarted || isMuted || !sfx6Ready || !sfx6) return;
    try {
      if (sfx6.isPlaying()) sfx6.stop();
      sfx6.play();
    } catch (e) {
      console.warn('Error playing sfx6:', e);
    }
  } else if (keyCode === CONTROL) {
    if (!audioStarted || isMuted || !sfx4Ready || !sfx4) return;
    try {
      if (sfx4.isPlaying()) sfx4.stop();
      sfx4.play();
    } catch (e) {
      console.warn('Error playing sfx4:', e);
    }
  }
}

// ------------------------------------------------------------
// Sound controls (bound from HTML sound toggle)
// ------------------------------------------------------------
window.toggleSound = function toggleSound() {
  try {
    const ctx = getAudioContext();

    if (!audioStarted) {
      if (ctx.state !== 'running') ctx.resume();
      audioStarted = true;
      isMuted = false;
    } else {
      isMuted = !isMuted;

      if (isMuted) {
        try {
          if (sfx4 && sfx4.isPlaying()) sfx4.stop();
          if (sfx5 && sfx5.isPlaying()) sfx5.stop();
          if (sfx6 && sfx6.isPlaying()) sfx6.stop();
        } catch (e) {
          console.warn('Error stopping sounds on mute:', e);
        }
      } else {
        if (ctx.state !== 'running') ctx.resume();
      }
    }

    const btn = document.getElementById('sound-toggle');
    if (btn) btn.textContent = `Sound: ${audioStarted && !isMuted ? 'On' : 'Off'}`;
  } catch (e) {
    console.warn('Sound toggle failed:', e);
  }
};
