let starBuffer; //so that it draw once
let rot = 0;  // rotation angle
let numQuads; // how much light rays

// Audio variables
let sfx4;
let sfx5;
let sfx6;

// NEW: audio sequence control
let sfxList = [];
let sfxIndex = 0;
let isPlaying = false;
let audioStarted = false;
let isMuted = false;

function preload() {
  soundFormats('mp3');
  sfx4 = loadSound('sfx4.mp3');
  sfx5 = loadSound('sfx5.mp3');
  sfx6 = loadSound('sfx6.mp3');
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

  // NEW: list of sounds for looping playback
  sfxList = [sfx4, sfx5, sfx6];
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
  strokeWeight(2); // line thickness
  fill(0);
  ellipse(width / 2, height / 2, 500, 500); // size of the middle circle, might need change as needed
  pop();
}

// sound stuff
function playNextSound() {
  if (!isPlaying) return;

  let current = sfxList[sfxIndex];
  current.play();

  current.onended(() => {
    if (!isPlaying) return;

    sfxIndex++;
    if (sfxIndex >= sfxList.length) {
      sfxIndex = 0;
    }

    playNextSound();
  });
}

function mousePressed() {
  // left click to toggle sound playback
  if (!audioStarted) {
    // First click enables audio
    const ctx = getAudioContext();
    if (ctx.state !== 'running') ctx.resume();
    audioStarted = true;
  }

  if (!isMuted) {
    if (!isPlaying) {
      isPlaying = true;
      sfxIndex = 0;
      playNextSound();
    } else {
      isPlaying = false;
      for (let s of sfxList) {
        s.stop();
      }
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
      // First time: enable audio and start playback
      if (ctx.state !== 'running') ctx.resume();
      audioStarted = true;
      isMuted = false;
      isPlaying = true;
      sfxIndex = 0;
      playNextSound();
    } else {
      // Toggle mute state
      isMuted = !isMuted;

      if (isMuted) {
        // Mute: stop all sounds and pause sequence
        isPlaying = false;
        try {
          for (let s of sfxList) {
            if (s && s.isPlaying()) s.stop();
          }
        } catch (e) {
          console.warn('Error stopping sounds on mute:', e);
        }
      } else {
        // Unmute: resume playback
        if (ctx.state !== 'running') ctx.resume();
        isPlaying = true;
        sfxIndex = 0;
        playNextSound();
      }
    }

    const btn = document.getElementById('sound-toggle');
    if (btn) btn.textContent = `Sound: ${audioStarted && !isMuted ? 'On' : 'Off'}`;
  } catch (e) {
    console.warn('Sound toggle failed:', e);
  }
};