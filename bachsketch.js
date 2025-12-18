//Global assets
//Variables for stars and rings
let starX;
let starY;
let ringAngle = 0; // declare an angle for the rings
let stars = []; // list for the stars
let ringArcs = []; // list for the ring's

// this is for a smoother transition between rings, call this variable as the Start and the Continue of the rings for timing and limiting the rings to spawn
let ringStart = 0; // frame to start a new frame
let ringContinue = 10; // spawn new ring at frame 10

//sound set ups
let planetAmbience;
let ringsAmbience;
let saturnSound = [];   // array of 3 atmosphere sounds
let currentSound = null; // null is an empty slot. 
let audioStarted = false;
let isMuted = false;
let planetReady = false;
let ringsReady = false;

//Nebula and starry background
// using loops of points to create different stars patterns background everytime being refreshed
function nebula(count) {
  stroke("white");
  strokeWeight(2);

  // draw the stars from the array
  for (let a = 0; a < stars.length; a++) {
    starX = stars[a].x;
    starY = stars[a].y;
    point(starX, starY);
  }
}

// Class: Rings
class Rings {
  constructor(ringPosX, ringPosY, ringW, ringH, orbit) {
    this.cx = ringPosX; // xPosition of the rings
    this.cy = ringPosY; // yPosition of the rings
    this.w = ringW; // the width size of the rings
    this.h = ringH; // the height of the rings
    this.span = orbit; // the distance of the rings will spawn

    // other things
    this.offset = random(TWO_PI); // creating a phase, making the rings fade in and fade out when moving around the planet
    this.alpha = 255;
    this.fadeSpeed = 2; // transition speed
  }

  // update and isDead is Javascript function:
  // update = changing a value
  // isDead = checking the if the returns results should be remove
  update() {
    this.alpha -= this.fadeSpeed; //compound: reduce the alpha by the speed of the animation every frame.
  }

  isDead() {
    return this.alpha <= 0; // this function is to check if the result of the alpha of the rings = 0.
  }
  // set up for the draw() to rendering the rings and arc. 
  draw() {
    if (this.alpha <= 0) return;

    // center angle of this arc (global rotation + personal offset)
    let angle = ringAngle + this.offset;
    let start = angle - this.span / 2;
    let end = angle + this.span / 2;

    noFill();
    stroke(255, this.alpha);
    strokeWeight(1);
    arc(this.cx, this.cy, this.w, this.h, start, end);
  }
}

// a range of rings
function listOfRings() {
  //base information of the rings
  let ringX = 950;
  let ringY = 540;

  let ringW = 700;
  let ringH = 90;
  //steps of rings,
  let stepW = 50;
  let stepH = 10;

  //
  let count = 3 + Math.floor(Math.random() * 20); // counting my random
  let span = random(PI / 3); // random arc length using PI

  //loops to spawn the rings.
  for (let i = 0; i < count; i++) {
    let w = ringW + i * stepW; // the width and height of the rings that will spawn
    let h = ringH + i * stepH;
    ringArcs.push(new Rings(ringX, ringY, w, h, span)); //new rings will spawn from the array ringArcs using the base info
  }
}


// Sound setting up

function preload(){
  soundFormats('wav','mp3');
  planetAmbience = loadSound('Ambience.mp3', () => { planetReady = true; });
  ringsAmbience  = loadSound('saturn-orbiting.mp3', () => { ringsReady = true; });
  
  saturnSound[0] = loadSound("planet's atmosphere.mp3");
  saturnSound[1] = loadSound("saturn's atmosphere-2.mp3");
  saturnSound[2] = loadSound("Saturn's atmosphere-3.mp3");
}

//Set-ups
function setup() {
  createCanvas(1900, 1080);
  frameRate(60); // 60 framerate for smoother animation

  for (let i = 0; i < 2000; i++) {
    stars.push({
      x: random(width),
      y: random(height),
    });
  }

  listOfRings();
  
  planetAmbience.setVolume(1);
  ringsAmbience.setVolume(1);
  
  // optional: set all saturn sounds a bit lower if needed
  for (let i = 0; i < saturnSound.length; i++) {
    saturnSound[i].setVolume(1);
  }
}

// adding thundering atmosphere sfx to the background using if statement with length
function playRandomAtmosphere() {
  if (saturnSound.length === 0) return;

  let idx = int(random(saturnSound.length));
  let sfx = saturnSound[idx];

  currentSound = sfx;   // remember which one is playing
  sfx.setVolume(1);
  sfx.play();

  sfx.onended(() => {
    // as long as the main ambience is still playing, keep cycling
    if (planetAmbience && planetAmbience.isPlaying()) {
      playRandomAtmosphere();
    } else {
      currentSound = null;
    }
  });
}

function stopAllAtmosphere() {
  if (currentSound && currentSound.isPlaying()) {
    currentSound.stop();
  }
  currentSound = null;

  saturnSound.forEach(s => {
    if (s.isPlaying()) s.stop();
  });
}

function startAllAmbience() {
  if (!planetAmbience || !ringsAmbience) return;
  planetAmbience.setLoop(true);
  ringsAmbience.setLoop(true);
  planetAmbience.setVolume(1);
  ringsAmbience.setVolume(1);
  planetAmbience.play();
  ringsAmbience.play();
  playRandomAtmosphere();
  audioStarted = true;
  isMuted = false;
  updateSoundButton();
}

function stopAllAmbience() {
  if (planetAmbience && planetAmbience.isPlaying()) planetAmbience.stop();
  if (ringsAmbience && ringsAmbience.isPlaying()) ringsAmbience.stop();
  stopAllAtmosphere();
  isMuted = true;
  updateSoundButton();
}

function updateSoundButton() {
  const btn = document.getElementById('sound-toggle');
  if (btn) btn.textContent = `Sound: ${audioStarted && !isMuted ? 'On' : 'Off'}`;
}


function mousePressed() {
  // If NOT playing yet → start both ambiences + random Saturn atmosphere loop
  if (!planetAmbience.isPlaying() && !ringsAmbience.isPlaying()) {
    startAllAmbience();
  } else {
    stopAllAmbience();
  }
}


//Draw
function draw() {
  background(0);
  nebula(0);
  //  the planet
  fill("black");
  ellipse(950, 540, 500, 500);
  stroke(6);

  // spawn new rings every ringStart frames
  if (frameCount - ringContinue >= ringStart) { //this part controls the animation, how often does a new rings appears. This arguement tell us that how much frame should be past by to make a new ring appear. 
    listOfRings();
    ringContinue = frameCount;
  }

  //Every time the rings are drawn and animated, It will call the update function from class to update and draw a new batch again
  ringArcs.forEach((arcObj) => {
    arcObj.update();
    arcObj.draw();
  });

  ringArcs = ringArcs.filter((arcObj) => !arcObj.isDead());

  ringAngle += 0.005;

  fill("black");
  stroke("white"); // keep the white outline
  strokeWeight(2); // adjust if you want a thicker border
  arc(950, 540, 500, 500, PI, TWO_PI);
}

// ------------------------------------------------------------
// Sound controls (bound from HTML sound toggle)
// ------------------------------------------------------------
window.toggleSound = function toggleSound() {
  try {
    const ctx = getAudioContext();

    if (ctx.state !== 'running') ctx.resume();

    if (!audioStarted || isMuted) {
      if (planetReady && ringsReady) {
        startAllAmbience();
      }
    } else {
      stopAllAmbience();
    }
  } catch (e) {
    console.warn('Sound toggle failed:', e);
  }
};
