let bg = '#000', cl = '#fff', ac = "#ffff00";
let dots = [];
let stars = []; // Store star positions
let fadeOut = 0; // 0 to 1, for fade-out transition
let isTransitioning = false;
let selectedDotIndex = -1;

const pageMap = {
  0: 'trang.html',
  1: 'bach.html',
  2: 'khoa.html',
  3: 'tin.html'
};

class Dot {
  constructor(x, y, label, radius = 5) {
    this.x = x;
    this.y = y;
    this.label = label;
    this.radius = radius;
    this.isHovered = false;
    this.borderSize = radius * 3; // Default square size
    this.currentSize = this.borderSize; // Track current animated size
  }

  display() {
    // Smooth animation: lerp toward target size
    let targetSize = this.isHovered ? this.borderSize * 4 : this.borderSize;
    this.currentSize = lerp(this.currentSize, targetSize, 0.1); // 0.1 = easing speed
    
    // Draw square border
    stroke(ac);
    strokeWeight(2);
    noFill();
    rect(this.x - this.currentSize / 2, this.y - this.currentSize / 2, this.currentSize, this.currentSize);
    
    // Draw dot
    noStroke();
    fill(cl);
    circle(this.x, this.y, this.radius);
    
    // Draw label
    fill(ac);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(this.label, this.x + this.currentSize * 0.7, this.y - this.currentSize / 2 - 20);
  }

  updateHover(mx, my) {
    let d = dist(mx, my, this.x, this.y);
    this.isHovered = d < this.radius + 20; // Hover area larger than dot
  }

  isClicked(mx, my) {
    const half = this.currentSize / 2;
    return (
      mx >= this.x - half &&
      mx <= this.x + half &&
      my >= this.y - half &&
      my <= this.y + half
    );
  }
}

// Create canvas, starfield, and initial dots
function setup() {
  let w = windowWidth, h = windowHeight;
  let canvas = createCanvas(w, h);
  canvas.parent('p5-container');
  background(bg);
  stroke(cl);
  strokeWeight(2);
  
  // Generate stars ONCE and store them
  for (let i = 0; i < 1000; i++) {
    stars.push({
      x: random(w),
      y: random(h)
    });
  }

  dots = [
    new Dot(w * 0.2, h * 0.4, '1.Trang'),
    new Dot(w * 0.4, h * 0.6, '2.Bach'),
    new Dot(w * 0.6, h * 0.7, '3.Khoa'),
    new Dot(w * 0.75, h * 0.3, '4.Tin')
  ];
}

let lineProgress = 0;
let lineAnimationDone = false;

// Animate and render the connecting lines between dots (single pass)
function drawConnectingLines() {
  const connections = [[0, 1], [1, 2], [2, 3]];
  stroke(cl); // White color for lines
  strokeWeight(2);
  
  if (!lineAnimationDone) {
    lineProgress += 0.05;
    if (lineProgress > 1) {
      lineProgress = 1;
      lineAnimationDone = true; // Mark animation as complete
    }
  }
  
  // Always draw lines (either animated or complete)
  for (let i = 0; i < connections.length; i++) {
    const [from, to] = connections[i];
    const segmentProgress = lineAnimationDone ? 1 : lineProgress * connections.length - i;
    
    if (segmentProgress > 0 && segmentProgress < 1) {
      const x2 = lerp(dots[from].x, dots[to].x, segmentProgress);
      const y2 = lerp(dots[from].y, dots[to].y, segmentProgress);
      line(dots[from].x, dots[from].y, x2, y2);
    } else if (segmentProgress >= 1) {
      line(dots[from].x, dots[from].y, dots[to].x, dots[to].y);
    }
  }
}

// Main render loop: stars, lines, dots, fade transition
function draw() {
  background(bg);
  stroke(cl);
  strokeWeight(2);
  
  // Draw stored stars
  for (let star of stars) {
    point(star.x, star.y);
  }

  drawConnectingLines();

  for (let dot of dots) {
    dot.updateHover(mouseX, mouseY);
    dot.display();
  }

  // Show cursor coordinates to the right of the pointer
  drawCursorCoordinates();

  // Handle fade-out transition
  if (isTransitioning) {
    fadeOut += 0.03; // Smooth fade speed
    fill(bg);
    stroke(bg);
    strokeWeight(0);
    rect(0, 0, windowWidth, windowHeight);
    fill(0, 0, 0, fadeOut * 255); // Fade to black
    rect(0, 0, windowWidth, windowHeight);
    
    if (fadeOut >= 1) {
      // Navigate to the selected page
  // Keep dots positioned proportionally on resize
      window.location.href = pageMap[selectedDotIndex];
    }
  }
}

// Render mouse coordinates next to the cursor
function drawCursorCoordinates() {
  const x = Math.round(mouseX);
  const y = Math.round(mouseY);
  const label = `x: ${x}  y: ${y}`;
  noStroke();
  fill(ac);
  textSize(12);
  textAlign(LEFT, CENTER);
  text(label, mouseX + 12, mouseY);
}

function windowResized() {
  let w = windowWidth, h = windowHeight;
  resizeCanvas(w, h);
  
  // Reposition dots relative to new window size
  dots[0].x = w * 0.2;
  dots[0].y = h * 0.4;
  dots[1].x = w * 0.4;
  dots[1].y = h * 0.6;
  dots[2].x = w * 0.6;
  dots[2].y = h * 0.7;
  dots[3].x = w * 0.75;
  dots[3].y = h * 0.3;
}

// Handle dot clicks to trigger page transition
function mousePressed() {
  if (isTransitioning) return; // Prevent multiple clicks during transition
  
  for (let i = 0; i < dots.length; i++) {
    if (dots[i].isClicked(mouseX, mouseY)) {
// Popup functions
// Open the information popup and overlay
      console.log(`Clicked: ${dots[i].label}`);
      isTransitioning = true;
      selectedDotIndex = i;
      break;
    }
  }
}

// Popup functions
function openInfoPopup(event) {
  event.preventDefault();
  const popup = document.getElementById('info-popup');
  const overlay = document.getElementById('popup-overlay');
  popup.classList.add('show');
  overlay.classList.add('show');
}

// Close the information popup and overlay
function closeInfoPopup() {
  const popup = document.getElementById('info-popup');
  const overlay = document.getElementById('popup-overlay');
  popup.classList.remove('show');
  overlay.classList.remove('show');
}