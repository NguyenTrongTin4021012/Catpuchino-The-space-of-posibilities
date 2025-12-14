let starBuffer;

let x1 = 400, y1 = 150;
let x2 = 500, y2 = 100;
let x3 = 500, y3 = 900;
let cx = 550;  
let cy = 1200; // center

let rot = 0;  // rotation angle
let numQuads; // how much light rays 

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

  numQuads = int(random(80, 150));  // how much light rays
}

function draw() {
  background(20);

  // this one put the bg there
  image(starBuffer, 0, 0);

  translate(width / 2, height / 2);

  rotate(rot);   
  rot += random(-0.0001, -0.0005);  // rotation speed, negative number for counter clockwise


  let radius = 0;

  let triHeight = (y3 - y1); // ray length
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
    stroke(255);
    strokeWeight(2); // line thickness
    
    let mid = angle + step / 2;
    let innerx = innerR * cos(mid);
    let innery = innerR * sin(mid);
    let outerx = outerR * cos(mid);
    let outery = outerR * sin(mid);
    line(innerx, innery, outerx, outery);  // line stuff

    pop();
  }

  resetMatrix();

  push();
  stroke(255);   
  strokeWeight(2.5); // line thickness
  fill(0);
  ellipse(width / 2, height / 2, 505, 505); //size of the middle circle, might need change as needed
  pop();
}
