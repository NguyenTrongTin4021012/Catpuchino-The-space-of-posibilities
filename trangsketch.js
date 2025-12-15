// ======================
// COLUMN CLASS
// ======================
class SorobanColumn {
  constructor(x, slots, r) {
    this.x = x;
    this.slots = slots;
    this.r = r;

    // Heaven bead luôn ở nấc đầu (slot 0)
    this.heavenSlot = 0;
    this.heaven = new Planet(x, slots[this.heavenSlot] + r, r);

    // Earth beads luôn dồn xuống nấc cuối
    this.earthBaseSlot = 4; // slot 4,5,6,7 → 4 bead
    this.earths = [];
    for (let i = 0; i < 4; i++) {
      let y = slots[this.earthBaseSlot + i] + r;
      this.earths.push(new Planet(x, y, r));
    }

    this.timer = int(random(240, 420));
  }

  update() {
    this.timer--;
    if (this.timer <= 0) {
      // Heaven toggle
      this.heavenSlot = this.heavenSlot === 0 ? 1 : 0;
      this.heaven.setTarget(this.slots[this.heavenSlot] + this.r);

      // Earth move as block
      let dir = random([-1, 1]);
      this.earthBaseSlot = constrain(this.earthBaseSlot + dir, 3, 4);

      for (let i = 0; i < 4; i++) {
        let y = this.slots[this.earthBaseSlot + i] + this.r;
        this.earths[i].setTarget(y);
      }

      this.timer = int(random(240, 420));
    }

    this.heaven.update();
    for (let e of this.earths) e.update();
  }

  draw() {
    this.heaven.draw();
    for (let e of this.earths) e.draw();
  }
}

