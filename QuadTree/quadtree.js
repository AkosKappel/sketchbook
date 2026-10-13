// Based on The Coding Train's QuadTree: https://github.com/CodingTrain/QuadTree

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// x and y are the center, w and h are half the width and height
class Rectangle {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(point) {
    return (
      point.x >= this.x - this.w &&
      point.x < this.x + this.w &&
      point.y >= this.y - this.h &&
      point.y < this.y + this.h
    );
  }

  intersects(range) {
    return !(
      range.x - range.w > this.x + this.w ||
      range.x + range.w < this.x - this.w ||
      range.y - range.h > this.y + this.h ||
      range.y + range.h < this.y - this.h
    );
  }
}

class QuadTree {
  constructor(boundary, capacity) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.children = null;
  }

  subdivide() {
    const { x, y, w, h } = this.boundary;
    this.children = [
      new Rectangle(x + w / 2, y - h / 2, w / 2, h / 2),
      new Rectangle(x - w / 2, y - h / 2, w / 2, h / 2),
      new Rectangle(x + w / 2, y + h / 2, w / 2, h / 2),
      new Rectangle(x - w / 2, y + h / 2, w / 2, h / 2),
    ].map((rect) => new QuadTree(rect, this.capacity));
  }

  insert(point) {
    if (!this.boundary.contains(point)) return false;

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }
    if (!this.children) this.subdivide();
    return this.children.some((child) => child.insert(point));
  }

  // collects the points inside range and counts how many points had to be tested
  query(range, result = { points: [], checked: 0 }) {
    if (!this.boundary.intersects(range)) return result;

    for (const p of this.points) {
      result.checked++;
      if (range.contains(p)) result.points.push(p);
    }
    if (this.children) {
      for (const child of this.children) child.query(range, result);
    }
    return result;
  }

  show() {
    const { x, y, w, h } = this.boundary;
    rect(x - w, y - h, w * 2, h * 2);
    if (this.children) {
      for (const child of this.children) child.show();
    }
  }
}
