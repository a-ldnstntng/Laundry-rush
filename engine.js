'use strict';

/**
 * SampayanRenderer
 * Encapsulated software voxel/depth-buffer pixel renderer for Sampayan Rush.
 * Provides orthographic camera projection, depth buffering, Bayer dithering,
 * hue-shifted color ramps, dynamic shadows, and pixel-art edge shading.
 */
class SampayanRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.width = options.width || 480;
    this.height = options.height || 270;
    this.scale = options.scale || 18.8;
    this.pitch = (options.pitch != null ? options.pitch : 30.0) * Math.PI / 180;
    this.yaw = (options.yaw != null ? options.yaw : 2.0) * Math.PI / 180;
    this.originX = options.originX || 0;
    this.originY = options.originY != null ? options.originY : 22;
    this.shadowX = options.shadowX != null ? options.shadowX : 0.9;
    this.shadowY = options.shadowY != null ? options.shadowY : -0.35;

    this.r2 = Math.SQRT2;
    this.edge = 0.28;
    this.updateCamera();

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.image = this.ctx.createImageData(this.width, this.height);
    this.pix = new Uint32Array(this.image.data.buffer);
    this.zb = new Float32Array(this.width * this.height);
    this.bakedPix = new Uint32Array(this.width * this.height);
    this.bakedZ = new Float32Array(this.width * this.height);
    this.ground = new Uint8Array(this.width * this.height);
    this.shadowMask = new Uint8Array(this.width * this.height);
    this.groundZ = new Float32Array(this.width * this.height);
    this.staticShadow = new Uint8Array(this.width * this.height);
    this.kinds = new Uint8Array(this.width * this.height);

    this.bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
    this.cool = [46, 38, 84];
    this.warm = [255, 232, 180];
    this.shoe = [226, 222, 212];
    this.bark = [92, 74, 60];
    this.grass = [[34, 62, 50], [52, 88, 52], [82, 118, 54], [124, 146, 62], [168, 172, 76]];
    this.cloud = [150, 148, 170];

    this.ramps = new Map();
    this.capture = null;
    this.tufts = [];
    this.leaves = [];
    this.pendingShadows = [];

    // Tree crown clusters
    this.crown = [
      [0.1, 0, 3.7, 1.6],
      [-1.4, -0.7, 3.3, 1.2],
      [1.6, 0.7, 3.4, 1.25],
      [-0.6, 1.1, 3.9, 1.1],
      [0.9, -1.1, 4, 1.1],
      [0.2, 0.1, 4.9, 1.05],
    ];
    this.leafDeep = [58, 84, 62];
    this.leafMid = [100, 126, 78];
    this.leafSilver = [146, 162, 112];

    // Storm grading grid
    this.cellsW = (this.width >> 3) + 1;
    this.cellsH = (this.height >> 3) + 1;
    this.cloudCells = new Float32Array(this.cellsW * this.cellsH);
    this.cloudStamp = -1;

    // Bobbing arrow sprite
    this.arrowRows = [
      '....ooooo....',
      '....oXXXo....',
      '....oXXXo....',
      '....oXXXo....',
      'oooooXXXooooo',
      'oXXXXXXXXXXXo',
      '.oXXXXXXXXXo.',
      '..oXXXXXXXo..',
      '...oXXXXXo...',
      '....oXXXo....',
      '.....oXo.....',
      '......o......',
    ];
    this.arrowInk = this.rgb(28, 27, 25);
    this.arrowSignal = this.rgb(255, 214, 10);
    this.arrowPaper = this.rgb(255, 255, 255);
  }

  updateCamera() {
    this.sin = Math.sin(this.pitch);
    this.cos = Math.cos(this.pitch);
    this.yawCos = Math.cos(this.yaw);
    this.yawSin = Math.sin(this.yaw);
    this.ox = this.width / 2 + this.originX;
    this.oy = this.height / 2 + this.originY;
    this.gradientY = this.cos / (this.scale * this.sin);
  }

  /* ---------- Math & Color Utilities ---------- */
  rgb(r, g, b) {
    return (255 << 24 | Math.min(255, b | 0) << 16 | Math.min(255, g | 0) << 8 | Math.min(255, r | 0)) >>> 0;
  }

  clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  ease(t) {
    return t * t * (3 - 2 * t);
  }

  hash(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = this.ease(x - ix), fy = this.ease(y - iy);
    return this.lerp(
      this.lerp(this.hash(ix, iy), this.hash(ix + 1, iy), fx),
      this.lerp(this.hash(ix, iy + 1), this.hash(ix + 1, iy + 1), fx),
      fy
    );
  }

  bayerAt(ix, iy) {
    return this.bayer[(iy & 3) * 4 + (ix & 3)];
  }

  rampOf(c) {
    const key = (c[0] << 16) | (c[1] << 8) | c[2];
    let ramp = this.ramps.get(key);
    if (ramp) return ramp;

    const mix = (m, tint, k) => this.rgb(
      this.lerp(c[0] * m, tint[0], k),
      this.lerp(c[1] * m, tint[1], k),
      this.lerp(c[2] * m, tint[2], k)
    );
    ramp = [
      mix(0.4, this.cool, 0.34),
      mix(0.62, this.cool, 0.18),
      mix(0.84, this.cool, 0.05),
      mix(1, this.warm, 0),
      mix(1.1, this.warm, 0.22),
    ];
    this.ramps.set(key, ramp);
    return ramp;
  }

  tint(i, r, g, b) {
    const c = this.pix[i];
    this.pix[i] = this.rgb((c & 255) * r, (c >> 8 & 255) * g, (c >> 16 & 255) * b);
  }

  /* ---------- Camera Projection ---------- */
  project(x, y, z) {
    const u = x * this.yawCos - y * this.yawSin;
    const v = x * this.yawSin + y * this.yawCos;
    return {
      sx: this.ox + u * this.scale,
      sy: this.oy + (v * this.sin - z * this.cos) * this.scale,
      d: v * this.cos + z * this.sin,
    };
  }

  unproject(sx, sy) {
    const u = (sx - this.ox) / this.scale;
    const v = (sy - this.oy) / (this.scale * this.sin);
    return {
      x: u * this.yawCos + v * this.yawSin,
      y: -u * this.yawSin + v * this.yawCos,
    };
  }

  /* ---------- Rasterization Primitives ---------- */
  plot(x, y, z, color) {
    const p = this.project(x, y, z), ix = p.sx | 0, iy = p.sy | 0;
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const i = iy * this.width + ix;
    if (p.d <= this.zb[i]) return;
    this.zb[i] = p.d;
    this.pix[i] = color;
  }

  sphere(x, y, z, r, c, mode) {
    const ramp = this.rampOf(c);
    const p = this.project(x, y, z), rp = Math.max(r * this.scale, 0.75);
    const y0 = Math.max(0, Math.floor(p.sy - rp)), y1 = Math.min(this.height - 1, Math.ceil(p.sy + rp));
    const x0 = Math.max(0, Math.floor(p.sx - rp)), x1 = Math.min(this.width - 1, Math.ceil(p.sx + rp));

    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const dx = (ix + 0.5 - p.sx) / rp, dy = (iy + 0.5 - p.sy) / rp, nn = dx * dx + dy * dy;
        if (nn > 1) continue;
        const nz = Math.sqrt(1 - nn), d = p.d + r * nz, i = iy * this.width + ix;
        if (d <= this.zb[i]) continue;
        let l = this.clamp(-0.55 * dx - 0.6 * dy + 0.58 * nz, 0, 1);
        if (mode === 'rough') l += (this.hash(ix, iy) - 0.5) * 0.55;
        if (dy > 0.35) l = Math.max(l, 0.12 + dy * 0.24); // warm light bouncing off ground
        if (this.capture) {
          this.capture.push(ix, iy, d, ramp[this.clamp(Math.floor(l * 4.4 + 0.2 + (this.bayerAt(ix, iy) - 0.5) * 0.7), 0, 4)]);
          continue;
        }
        this.zb[i] = d;
        if (mode === 'gloss' && l > 0.9) { this.pix[i] = this.rgb(255, 250, 232); continue; }
        if (mode === 'solid') { this.pix[i] = ramp[this.clamp(Math.floor(l * 4.4 + 0.2), 1, 4)]; continue; }
        this.pix[i] = ramp[this.clamp(Math.floor(l * 4.4 + 0.2 + (this.bayerAt(ix, iy) - 0.5) * 0.7), 0, 4)];
      }
    }
  }

  capsule(a, b, r0, r1, colorOf, mode) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.ceil(len / (Math.min(r0, r1) * 0.45)));
    for (let k = 0; k <= n; k++) {
      const t = k / n, z = this.lerp(a[2], b[2], t);
      const cx = this.lerp(a[0], b[0], t), cy = this.lerp(a[1], b[1], t);
      this.sphere(cx, cy, z, this.lerp(r0, r1, t), colorOf(cx, cy, z), mode);
    }
  }

  box(x0, y0, z0, x1, y1, z1, c, seed = 0) {
    const ramp = this.rampOf(c);
    const paint = (x, y, z, base, grain) => {
      const p = this.project(x, y, z), ix = p.sx | 0, iy = p.sy | 0;
      if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
      const i = iy * this.width + ix;
      if (p.d <= this.zb[i]) return;
      this.zb[i] = p.d;
      this.pix[i] = ramp[this.clamp(Math.floor(base + (grain - 0.5) * 1.3 + (this.bayerAt(ix, iy) - 0.5) * 0.5), 0, 4)];
    };
    const step = 0.045, longX = x1 - x0 >= y1 - y0;
    for (let a = x0; a <= x1; a += step) {
      for (let b = y0; b <= y1; b += step) {
        paint(a, b, z1, 3.4, longX ? this.noise(a * 0.8 + seed, b * 9) : this.noise(a * 9, b * 0.8 + seed));
      }
    }
    for (let a = x0; a <= x1; a += step) {
      for (let b = z0; b <= z1; b += step) paint(a, y1, b, 2.3, this.noise(a * 0.8 + seed, b * 9));
    }
    for (let a = y0; a <= y1; a += step) {
      for (let b = z0; b <= z1; b += step) paint(x1, a, b, 1.2, this.noise(a * 0.8 + seed, b * 9));
    }
  }

  /* ---------- Shadows & Edges ---------- */
  castShadow(x, y, z, r, strength = 1, dither = 0.4) {
    const p = this.project(x + this.shadowX * z, y + this.shadowY * z, 0);
    const rx = r * this.scale * 1.05, ry = rx * this.sin + 1;
    const y0 = Math.max(0, Math.floor(p.sy - ry)), y1 = Math.min(this.height - 1, Math.ceil(p.sy + ry));
    const x0 = Math.max(0, Math.floor(p.sx - rx)), x1 = Math.min(this.width - 1, Math.ceil(p.sx + rx));

    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const dx = (ix + 0.5 - p.sx) / rx, dy = (iy + 0.5 - p.sy) / ry;
        if (dx * dx + dy * dy + (this.bayerAt(ix, iy) - 0.5) * dither > 1) continue;
        const i = iy * this.width + ix;
        if (this.shadowMask[i] < strength) this.shadowMask[i] = strength;
      }
    }
  }

  applyShadows(refZ) {
    for (let i = 0; i < this.pix.length; i++) {
      const s = this.shadowMask[i];
      if (!s) continue;
      this.shadowMask[i] = 0;
      if (!this.ground[i] || this.zb[i] !== refZ[i]) continue;
      if (s === 1) this.tint(i, 0.54, 0.52, 0.72);
      else this.tint(i, 0.36, 0.34, 0.56);
    }
  }

  shadeEdges() {
    for (let iy = 1; iy < this.height - 1; iy++) {
      for (let ix = 1; ix < this.width - 1; ix++) {
        const i = iy * this.width + ix, d = this.zb[i];
        if (d < -1e8 || d === this.groundZ[i]) continue;
        const a = i - this.width, b = i + this.width, c = i - 1, e = i + 1;
        if (this.zb[a] === this.groundZ[a] || this.zb[b] === this.groundZ[b] || this.zb[c] === this.groundZ[c] || this.zb[e] === this.groundZ[e]) {
          this.tint(i, 0.68, 0.66, 0.76);
        } else if (d - this.zb[a] - this.gradientY > this.edge || d - this.zb[c] > this.edge) {
          const p = this.pix[i];
          this.pix[i] = this.rgb(
            this.lerp(p & 255, this.warm[0], 0.3),
            this.lerp(p >> 8 & 255, this.warm[1], 0.3),
            this.lerp(p >> 16 & 255, this.warm[2], 0.22)
          );
        } else if (this.zb[e] - d > this.edge || this.zb[b] - this.gradientY - d > this.edge) {
          this.tint(i, 0.74, 0.72, 0.82);
        }
      }
    }
  }

  bakeOcclusion() {
    const offsets = [];
    for (const r of [2, 4]) {
      for (let k = 0; k < 8; k++) {
        offsets.push([Math.round(Math.cos(k * Math.PI / 4) * r), Math.round(Math.sin(k * Math.PI / 4) * r * 0.7)]);
      }
    }
    for (let iy = 4; iy < this.height - 4; iy++) {
      for (let ix = 4; ix < this.width - 4; ix++) {
        const i = iy * this.width + ix;
        if (!this.ground[i] || this.zb[i] !== this.groundZ[i]) continue;
        let hits = 0;
        for (const [ox, oy] of offsets) {
          const j = (iy + oy) * this.width + ix + ox;
          if (this.zb[j] !== this.groundZ[j]) hits++;
        }
        if (!hits) continue;
        if (hits >= 8) this.tint(i, 0.56, 0.54, 0.72);
        else if (hits / 8 > this.bayerAt(ix, iy)) this.tint(i, 0.74, 0.72, 0.84);
      }
    }
  }

  /* ---------- Vegetation (Trees & Swaying Leaves) ---------- */
  growTree(x, y, scale = 1, count = 420, seed = 0) {
    const bark = () => this.bark;
    this.capsule([x, y, 0], [x + 0.3 * scale, y + 0.1 * scale, 2.2 * scale], 0.36 * scale, 0.22 * scale, bark, 'rough');
    this.capsule([x + 0.3 * scale, y + 0.1 * scale, 2.2 * scale], [x - 0.8 * scale, y - 0.4 * scale, 3.3 * scale], 0.2 * scale, 0.13 * scale, bark, 'rough');
    this.capsule([x + 0.3 * scale, y + 0.1 * scale, 2.2 * scale], [x + 1.2 * scale, y + 0.4 * scale, 3.4 * scale], 0.2 * scale, 0.13 * scale, bark, 'rough');

    for (let n = 0; n < count; n++) {
      const k = n + seed, [cx, cy, cz, spread] = this.crown[n % this.crown.length];
      const a = this.hash(k, 7) * 6.283, tilt = this.hash(k, 8) * 2 - 1, d = Math.cbrt(this.hash(k, 9)) * spread;
      const flat = Math.sqrt(1 - tilt * tilt);
      const rx = cx + Math.cos(a) * flat * d, ry = cy + Math.sin(a) * flat * d, rz = cz + tilt * d * 0.8;
      const tone = this.hash(k, 10) + (rz - 4.2) * 0.22 + (d / spread - 0.5) * 0.3;
      const leaf = tone > 0.72 ? this.leafSilver : tone > 0.3 ? this.leafMid : this.leafDeep;

      this.capture = [];
      this.sphere(x + rx * scale, y + ry * scale, rz * scale, (0.2 + this.hash(k, 11) * 0.22) * scale, leaf, 'rough');
      this.leaves.push({ x: x + rx * scale, y: y + ry * scale, z: rz * scale, k, r: 0.42 * scale, pixels: this.capture });
      this.capture = null;
    }
  }

  drawLeaves(t) {
    for (const leaf of this.leaves) {
      const reach = this.clamp((leaf.z - 2.5) / 3, 0.3, 1);
      const swayX = (Math.sin(t * 0.9 + leaf.x * 0.5 + leaf.z * 0.7) + 0.55 * Math.sin(t * 2.3 + leaf.k * 1.7)) * reach;
      const dx = Math.round(swayX * 0.9), dy = Math.round(Math.sin(t * 1.3 + leaf.y + leaf.k) * reach * 0.45);
      const px = leaf.pixels;
      for (let n = 0; n < px.length; n += 4) {
        const ix = px[n] + dx, iy = px[n + 1] + dy;
        if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) continue;
        const i = iy * this.width + ix;
        if (px[n + 2] <= this.zb[i]) continue;
        this.zb[i] = px[n + 2];
        this.pix[i] = px[n + 3];
      }
      if (leaf.k % 2 === 0) this.castShadow(leaf.x + swayX * 0.12, leaf.y, leaf.z, leaf.r);
    }
  }

  /* ---------- Dynamic Character Add & Flush Shadows ---------- */
  dynamicAdd(a, b, r0, r1, f) {
    this.capsule(a, b, r0, r1, f, 'solid');
    this.pendingShadows.push(a, r0, b, r1);
  }

  flushShadows() {
    for (let i = 0; i < this.pendingShadows.length; i += 4) {
      const a = this.pendingShadows[i], ra = this.pendingShadows[i + 1], c = this.pendingShadows[i + 2];
      const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) / 0.25));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        this.castShadow(this.lerp(a[0], c[0], t), this.lerp(a[1], c[1], t), this.lerp(a[2], c[2], t), ra * 0.9, 1, 0);
      }
      if (a[2] < 0.25) this.castShadow(a[0], a[1], 0, 0.2, 2, 0); // contact shadow under slippers
    }
    this.pendingShadows.length = 0;
  }

  /* ---------- Bobbing Arrow Indicator ---------- */
  drawArrow(sx, sy, time, isHighlighted = false) {
    const bob = Math.floor(time * 3) % 2 * 2;
    const left = Math.round(sx) - 6, top = Math.round(sy) - this.arrowRows.length - bob;
    const ink = [], fill = [];

    this.arrowRows.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell === 'o') ink.push([left + x, top + y]);
      if (cell === 'X') fill.push([left + x, top + y]);
    }));

    // Halo around arrow for maximum legibility against complex roofs
    const halo = [];
    for (const [x, y] of ink) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) halo.push([x + dx, y + dy]);
    }
    const haloCol = isHighlighted ? this.rgb(255, 255, 255) : this.arrowPaper;
    for (const [hx, hy] of halo) {
      const ix = hx | 0, iy = hy | 0;
      if (ix >= 0 && iy >= 0 && ix < this.width && iy < this.height) this.pix[iy * this.width + ix] = haloCol;
    }
    for (const [ix, iy] of ink) {
      if (ix >= 0 && iy >= 0 && ix < this.width && iy < this.height) this.pix[iy * this.width + ix] = this.arrowInk;
    }
    const fillCol = isHighlighted ? this.rgb(45, 235, 120) : this.arrowSignal;
    for (const [fx, fy] of fill) {
      if (fx >= 0 && fy >= 0 && fx < this.width && fy < this.height) this.pix[fy * this.width + fx] = fillCol;
    }
  }

  /* ---------- Storm Grading, Clouds, Lightning & Rain ---------- */
  gradeStorm(storm, windT, wetness, flash, puddle) {
    if (storm <= 0 && flash <= 0) return;
    if (windT !== this.cloudStamp) {
      this.cloudStamp = windT;
      for (let cy = 0; cy < this.cellsH; cy++) {
        for (let cx = 0; cx < this.cellsW; cx++) {
          this.cloudCells[cy * this.cellsW + cx] = this.noise(cx * 0.14 - windT * 0.22, cy * 0.2 + 3);
        }
      }
    }
    const rm = 1 - 0.46 * storm, gm = 1 - 0.36 * storm, bm = 1 - 0.2 * storm;
    const ra = 8 * storm, ga = 12 * storm, ba = 26 * storm;
    const puddleAt = 1 - wetness * 0.42;
    const flashAmt = flash * 0.4;

    for (let iy = 0; iy < this.height; iy++) {
      for (let ix = 0; ix < this.width; ix++) {
        const i = iy * this.width + ix;
        if (this.zb[i] < -1e8) {
          if (storm > 0 || flash > 0) {
            const c = this.pix[i];
            let r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
            if (storm > 0) {
              const skyT = Math.min(1, iy / 120);
              const targetR = 52 + skyT * 26;
              const targetG = 58 + skyT * 28;
              const targetB = 76 + skyT * 32;
              r = this.lerp(r, targetR, storm * 0.82);
              g = this.lerp(g, targetG, storm * 0.82);
              b = this.lerp(b, targetB, storm * 0.78);
              if (iy < 130 && this.cloudCells[(iy >> 3) * this.cellsW + (ix >> 3)] + this.bayerAt(ix, iy) * 0.22 > 1 - storm * 0.60) {
                r *= 0.84; g *= 0.84; b *= 0.88;
              }
            }
            if (flash > 0) {
              const k = Math.min(1, flash * 0.92);
              r = this.lerp(r, 240, k);
              g = this.lerp(g, 242, k);
              b = this.lerp(b, 255, k);
            }
            this.pix[i] = this.rgb(r, g, b);
          }
          continue;
        }
        const c = this.pix[i];
        let r = (c & 255) * rm + ra, g = (c >> 8 & 255) * gm + ga, b = (c >> 16 & 255) * bm + ba;
        if (this.cloudCells[(iy >> 3) * this.cellsW + (ix >> 3)] + this.bayerAt(ix, iy) * 0.22 > 1 - storm * 0.62) {
          r *= 0.76; g *= 0.76; b *= 0.82;
        }
        if (wetness > 0 && this.zb[i] === this.groundZ[i]) {
          const damp = 1 - wetness * 0.24;
          r *= damp; g *= damp; b *= damp + wetness * 0.05;
          if (puddle && puddle[i] > puddleAt) {
            r = this.lerp(r, 92, 0.7);
            g = this.lerp(g, 108, 0.7);
            b = this.lerp(b, 140, 0.7);
          }
        }
        if (flashAmt > 0) {
          const k = Math.min(1, flashAmt * 1.8);
          r = this.lerp(r, 244, k);
          g = this.lerp(g, 244, k);
          b = this.lerp(b, 255, k);
        }
        this.pix[i] = this.rgb(r, g, b);
      }
    }
  }

  drawClouds(storm, windT, clouds) {
    const isFair = storm <= 0.05;
    const cloudCol = isFair
      ? [242, 240, 234]
      : [
          this.lerp(242, 70, storm),
          this.lerp(240, 75, storm),
          this.lerp(234, 95, storm)
        ];
    const ramp = this.rampOf(cloudCol);
    for (const c of clouds) {
      const show = isFair ? 0.65 : this.clamp(storm * 1.5 - c.from * 0.5, 0, 1);
      if (show <= 0) continue;
      const speedMul = isFair ? 0.65 : 1.0;
      const cx = 30 + ((c.x + windT * c.speed * speedMul) % (this.width - 60));
      const edge = this.clamp((Math.min(cx, this.width - cx) - 18) / 34, 0, 1), alpha = show * edge;
      const rx = c.r * 1.5, ry = c.r;
      for (let iy = Math.max(0, c.y - ry | 0); iy <= c.y + ry && iy < this.height; iy++) {
        for (let ix = Math.max(0, cx - rx | 0); ix <= cx + rx && ix < this.width; ix++) {
          const dx = (ix - cx) / rx, dy = (iy - c.y) / ry, nn = dx * dx + dy * dy;
          if (nn > 1) continue;
          const i = iy * this.width + ix;
          if (this.zb[i] > -1e8 || this.bayerAt(ix, iy) > alpha * 1.6 * (1.15 - nn * 0.4)) continue;
          const l = -0.45 * dx - 0.75 * dy + 0.5 * Math.sqrt(1 - nn);
          this.pix[i] = ramp[this.clamp(Math.floor(l * 3.2 + 1 + (this.bayerAt(ix, iy) - 0.5) * 0.6), 0, 4)];
        }
      }
    }
  }

  drawBolt(bolt) {
    if (!bolt) return;
    const core = this.rgb(120, 112, 214), bright = this.rgb(250, 240, 150);
    for (let k = 0; k < bolt.length - 1; k++) {
      const [ax, ay] = bolt[k], [bx, by] = bolt[k + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay));
      for (let j = 0; j <= n; j++) {
        const sx = this.lerp(ax, bx, j / n) | 0, sy = this.lerp(ay, by, j / n) | 0;
        for (const [ox, c] of [[0, bright], [-1, core], [1, core]]) {
          const ix = sx + ox;
          if (ix < 0 || ix >= this.width || sy < 0 || sy >= this.height) continue;
          const i = sy * this.width + ix;
          if (this.zb[i] < -1e8) this.pix[i] = c;
        }
      }
    }
  }

  drawRain(drops, splashes, gustGlow = 0) {
    const color = this.rgb(112, 134, 188), wind = (3 + gustGlow * 5) / 26;
    for (const d of drops) {
      for (let k = 0; k < 4; k++) {
        const p = this.project(d.x - wind * k * 0.3, d.y, d.z + k * 0.3);
        const ix = p.sx | 0, iy = p.sy | 0;
        if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) continue;
        const i = iy * this.width + ix;
        if (p.d > this.zb[i]) this.pix[i] = color;
      }
    }
    const pale = this.rgb(212, 224, 244);
    for (const s of splashes) {
      const p = this.project(s.x, s.y, 0), ix = p.sx | 0, iy = p.sy | 0;
      if (ix < 1 || iy < 0 || ix >= this.width - 1 || iy >= this.height) continue;
      const i = iy * this.width + ix;
      if (this.zb[i] === this.groundZ[i]) {
        this.pix[i] = pale;
        this.pix[i - 1] = pale;
        this.pix[i + 1] = pale;
      }
    }
  }

  /* ---------- Rooftop Chaos Hazard Renderers (Smoke, Cat, Soot, Tsinelas) ---------- */
  drawSmokeParticles(particles) {
    if (!particles || !particles.length) return;
    for (const p of particles) {
      const proj = this.project(p.x, p.y, p.z);
      if (proj.d < -1e8) continue;
      const progress = p.life / p.maxLife;
      const alpha = Math.sin(progress * Math.PI) * 0.72;
      if (alpha <= 0.04) continue;
      const sr = Math.max(2, Math.round(p.r * this.scale * (0.6 + progress * 0.8)));
      const cx = proj.sx | 0, cy = proj.sy | 0;
      const ramp = this.rampOf(p.color || [115, 110, 105]);

      for (let iy = Math.max(0, cy - sr); iy <= cy + sr && iy < this.height; iy++) {
        for (let ix = Math.max(0, cx - sr); ix <= cx + sr && ix < this.width; ix++) {
          const dx = (ix - cx) / sr, dy = (iy - cy) / sr, d2 = dx * dx + dy * dy;
          if (d2 > 1) continue;
          const i = iy * this.width + ix;
          if (this.zb[i] > -1e8 && proj.d < this.zb[i] - 0.4) continue;
          if (this.bayerAt(ix, iy) > alpha * (1.1 - d2 * 0.75)) continue;
          const l = Math.floor((1 - d2) * 3 + 1);
          this.pix[i] = ramp[this.clamp(l, 0, 4)];
        }
      }
    }
  }

  drawMuninCat(cat, time) {
    if (!cat || !cat.active || !this.ctx) return;
    const proj = this.project(cat.x, cat.y, cat.z);
    if (proj.d < -1e8) return;

    const ctx = this.ctx;
    const pxScale = 2; // Crisp 2x integer pixel blocks
    const facing = cat.facing || 1; // 1 = right, -1 = left

    const CAT_PAL = {
      '#': '#181210', // Dark ink outline
      'o': '#ea580c', // Orange tabby fur
      'O': '#9a3412', // Tabby stripes / shadow
      'w': '#fffbeb', // White bib / chest / paws
      'p': '#fb7185', // Pink nose / inner ear
      'e': '#16a34a', // Emerald green eye
      'y': '#fef08a', // Eye highlight
    };

    const FRAMES = {
      walk_0: [
        ".....#...#......",
        "....#p#.#p#.....",
        "....#o#.#o#.....",
        "...#ooooooo#....",
        "..#oOoooOooo#...",
        "..#oe#owoe#o#...",
        "..#o#yww#y#o#...",
        "..#oowppwoo##...",
        "...#owwwww#o#...",
        "....#oOoOo##o#..",
        "....#w#.#w#..#..",
        "....###.###....."
      ],
      walk_1: [
        ".....#...#......",
        "....#p#.#p#.....",
        "....#o#.#o#.....",
        "...#ooooooo#..#.",
        "..#oOoooOooo#.#.",
        "..#oe#owoe#o##..",
        "..#o#yww#y#o#...",
        "..#oowppwoo##...",
        "...#owwwww#o#...",
        "....#oOoOo##....",
        ".....#w#.#w#....",
        ".....###.###...."
      ],
      sit: [
        ".....#...#......",
        "....#p#.#p#.....",
        "....#o#.#o#.....",
        "...#ooooooo#....",
        "..#oOoooOooo#...",
        "..#oe#owoe#o#.#.",
        "..#o#yww#y#o#.#.",
        "..#oowppwoo###..",
        "...#owwwww#o#...",
        "..#oOooOoOo#....",
        "..#ww#.#ww#.....",
        "..####.####....."
      ],
      swat: [
        "....##...#......",
        "...#p#..#p#.....",
        "...#o#..#o#.....",
        "...#ooooooo##w#.",
        "..#oOoooOooo#w#.",
        "..#oe#owoe#o##..",
        "..#o#yww#y#o#...",
        "..#oowppwoo##...",
        "...#owwwww#o#...",
        "....#oOoOo##....",
        "....#w#..#w#....",
        "....###..###...."
      ],
      flee: [
        "....##...##.....",
        "...#po#.#op#....",
        "..#ooooooooo#...",
        ".#oOOoooOOooo#..",
        ".#e#owwwwoe#o###",
        ".#y#owppwo#y#..#",
        "..#owwwwww#o#..#",
        "...#oOoOoOo#..#.",
        "..#oo#...#oo##..",
        ".#ww#.....#ww#..",
        ".###.......###..",
        "................"
      ]
    };

    let frameKey = 'walk_0';
    if (cat.state === 'flee') {
      frameKey = 'flee';
    } else if (cat.state === 'knead_nap') {
      frameKey = Math.floor(time * 4) % 2 === 0 ? 'sit' : 'walk_0';
    } else if (cat.state === 'jump_line') {
      frameKey = 'swat';
    } else {
      frameKey = Math.floor(time * 6) % 2 === 0 ? 'walk_0' : 'walk_1';
    }

    const rows = FRAMES[frameKey] || FRAMES.walk_0;
    const spriteW = 16;
    const spriteH = 12;
    const drawW = spriteW * pxScale;
    const drawH = spriteH * pxScale;

    // Center sprite over projected base
    const startX = Math.round(proj.sx - drawW / 2);
    const startY = Math.round(proj.sy - drawH);

    ctx.save();
    for (let r = 0; r < Math.min(spriteH, rows.length); r++) {
      const line = rows[r];
      if (!line) continue;
      for (let c = 0; c < Math.min(spriteW, line.length); c++) {
        const char = line[c];
        if (char === '.') continue;
        const color = CAT_PAL[char];
        if (!color) continue;
        const colIdx = facing === -1 ? (spriteW - 1 - c) : c;
        ctx.fillStyle = color;
        ctx.fillRect(startX + colIdx * pxScale, startY + r * pxScale, pxScale, pxScale);
      }
    }

    // Floating question mark or exclamation mark when stalking or alarmed
    if (cat.state === 'stalk') {
      ctx.fillStyle = '#181210';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText('?', startX + drawW / 2 - 2, startY - 3);
    } else if (cat.state === 'flee') {
      ctx.fillStyle = '#ce1126';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText('!', startX + drawW / 2 - 2, startY - 4);
    }

    ctx.restore();
  }

  drawSootSmudge(ctx, sx, sy, kind = 'smoke') {
    if (!ctx) return;
    ctx.save();
    if (kind === 'paw') {
      // 4-dot muddy pawprint
      ctx.fillStyle = '#4a2e18';
      // Main pad
      ctx.fillRect(sx - 2, sy - 1, 4, 3);
      // 3 toe dots
      ctx.fillRect(sx - 3, sy - 4, 2, 2);
      ctx.fillRect(sx - 0.5, sy - 5, 2, 2);
      ctx.fillRect(sx + 2, sy - 4, 2, 2);
    } else {
      // Dithered soot stain
      ctx.fillStyle = 'rgba(40, 36, 32, 0.65)';
      ctx.fillRect(sx - 5, sy - 4, 10, 8);
      ctx.fillStyle = 'rgba(25, 22, 20, 0.85)';
      ctx.fillRect(sx - 3, sy - 2, 6, 4);
      ctx.fillStyle = 'rgba(217, 119, 6, 0.4)'; // faint amber BBQ grease tint
      ctx.fillRect(sx - 1, sy - 1, 3, 2);
    }
    ctx.restore();
  }

  drawTsinelasIcon(ctx, x, y, scale = 1, angerLevel = 0) {
    if (!ctx) return;
    ctx.save();
    const isRage = angerLevel >= 1;
    const soleColor = isRage ? '#dc2626' : '#0284c7'; // Classic Spartan blue or fiery red
    const strapColor = isRage ? '#fef08a' : '#facc15'; // Yellow strap
    const ink = '#181210';

    const w = 12 * scale;
    const h = 18 * scale;
    const px = scale;

    // Ink outline & rounded slipper sole
    ctx.fillStyle = ink;
    ctx.fillRect(x - 1 * px, y - 1 * px, w + 2 * px, h + 2 * px);

    // Sole fill
    ctx.fillStyle = soleColor;
    ctx.fillRect(x, y, w, h);

    // Inner bevel
    ctx.fillStyle = isRage ? '#ef4444' : '#38bdf8';
    ctx.fillRect(x + px, y + px, w - 2 * px, 2 * px);

    // Yellow Y-strap
    ctx.fillStyle = strapColor;
    // Toe post
    ctx.fillRect(x + 5 * px, y + 4 * px, 2 * px, 3 * px);
    // Left & right strap wings
    ctx.fillRect(x + 2 * px, y + 7 * px, 4 * px, 2 * px);
    ctx.fillRect(x + 6 * px, y + 7 * px, 4 * px, 2 * px);
    ctx.fillRect(x + px, y + 9 * px, 2 * px, 3 * px);
    ctx.fillRect(x + 9 * px, y + 9 * px, 2 * px, 3 * px);

    ctx.restore();
  }

  /* ---------- Canvas Sizing & Frame Presentation ---------- */
  fit() {
    const availW = Math.max(280, window.innerWidth - 12);
    const availH = Math.max(200, window.innerHeight - 20);
    const fitScale = Math.min(availW / this.width, availH / this.height);
    this.canvas.style.width = Math.round(this.width * fitScale) + 'px';
    this.canvas.style.height = Math.round(this.height * fitScale) + 'px';
  }

  clear() {
    this.pix.set(this.bakedPix);
    this.zb.set(this.bakedZ);
    this.pendingShadows.length = 0;
  }

  present() {
    this.ctx.putImageData(this.image, 0, 0);
  }
}

// Support both script-tag globals and ES modules
if (typeof window !== 'undefined') {
  window.SampayanRenderer = SampayanRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SampayanRenderer };
}
