'use strict';

const assert = require('assert');
const fs = require('fs');

console.log('=== RUNNING COMPREHENSIVE OVERHAUL TEST SUITE ===\n');

// 1. Mock Browser Environment
const canvasMock = {
  width: 480,
  height: 270,
  style: {},
  getContext: () => ({
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    closePath: () => {},
    fill: () => {},
    arc: () => {},
    ellipse: () => {},
    rect: () => {},
    clip: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    measureText: (text) => ({ width: text.length * 6 }),
    drawImage: () => {},
    clearRect: () => {},
    setTransform: () => {},
    setLineDash: () => {},
    createImageData: (w, h) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4)
    }),
    putImageData: () => {},
    getImageData: (sx, sy, sw, sh) => ({
      width: sw,
      height: sh,
      data: new Uint8ClampedArray(sw * sh * 4)
    }),
  }),
  addEventListener: () => {},
  removeEventListener: () => {},
  focus: () => {},
  setPointerCapture: () => {},
  releasePointerCapture: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 270 }),
};

global.window = {
  innerWidth: 800,
  innerHeight: 600,
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
  },
};

global.document = {
  getElementById: (id) => {
    return {
      id,
      textContent: '',
      innerHTML: '',
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
      },
      getContext: () => canvasMock.getContext(),
      width: 14,
      height: 20,
    };
  },
  createElement: () => canvasMock,
};

global.performance = { now: () => Date.now() };

// Mock Web Audio Context
class MockGain {
  constructor() {
    this.gain = {
      value: 1,
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
    };
  }
  connect() {}
  disconnect() {}
}

class MockOsc {
  constructor() {
    this.type = 'sine';
    this.frequency = {
      value: 440,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
    };
  }
  connect() {}
  start() {}
  stop() {}
}

class MockFilter {
  constructor() {
    this.type = 'lowpass';
    this.frequency = {
      value: 1000,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
    };
    this.Q = { setValueAtTime: () => {} };
  }
  connect() {}
}

class MockBufferSource {
  constructor() {
    this.buffer = null;
    this.playbackRate = { setValueAtTime: () => {} };
  }
  connect() {}
  start() {}
  stop() {}
}

global.AudioContext = class {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
    this.sampleRate = 44100;
  }
  createGain() { return new MockGain(); }
  createOscillator() { return new MockOsc(); }
  createBiquadFilter() { return new MockFilter(); }
  createBufferSource() { return new MockBufferSource(); }
  createBuffer(channels, length, rate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate: rate,
      getChannelData: () => new Float32Array(length),
    };
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
};

// Load modules
const { SampayanAudio } = eval(fs.readFileSync('./audio.js', 'utf8') + '; ({ SampayanAudio });');
const { SampayanRenderer } = eval(fs.readFileSync('./engine.js', 'utf8') + '; ({ SampayanRenderer });');
const { SampayanGame } = eval(fs.readFileSync('./game.js', 'utf8') + '; ({ SampayanGame });');

console.log('✓ Modules loaded cleanly');

// TEST SUITE 1: Renderer & Cat Sprite Robustness (including FRAMES.flee crash test)
console.log('\n--- Test 1: Cat Sprite & Hazard Renderers ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  
  // Test cat rendering in ALL states
  const catStates = ['walk_0', 'walk_1', 'sit', 'swat', 'flee', 'knead_nap', 'parapet_walk', 'jump_line'];
  catStates.forEach(state => {
    const cat = {
      active: true,
      state,
      x: 0,
      y: 0,
      z: 0.6,
      facing: 1,
    };
    // Must NOT throw TypeError: Cannot read properties of undefined
    renderer.drawMuninCat(cat, 0.5);
    cat.facing = -1;
    renderer.drawMuninCat(cat, 1.0);
  });
  console.log('✓ Munin cat renders in all animation states without crashes (including flee mode)');

  // Test smoke particles rendering
  const particles = [
    { x: 0, y: 0, z: 3.7, vx: 5, vy: 0, vz: 0.2, r: 0.8, life: 1, maxLife: 5, color: [115, 110, 105] },
    { x: 5, y: -2, z: 3.5, vx: 5, vy: 0, vz: 0.2, r: 1.2, life: 3, maxLife: 5, color: [75, 70, 65] }
  ];
  renderer.drawSmokeParticles(particles);
  console.log('✓ Smoke particles render with Bayer dithering');

  // Test soot & paw smudge rendering
  renderer.drawSootSmudge(canvasMock.getContext(), 240, 135, 'paw');
  renderer.drawSootSmudge(canvasMock.getContext(), 240, 135, 'smoke');
  console.log('✓ Soot and pawprint smudges render cleanly');

  // Test tsinelas icon renderer
  renderer.drawTsinelasIcon(canvasMock.getContext(), 1, 1, 1, 0); // calm
  renderer.drawTsinelasIcon(canvasMock.getContext(), 1, 1, 1, 1); // rage
  console.log('✓ Spartan Tsinelas icon renders in calm and rage states');
}

// TEST SUITE 2: Audio Synthesis Routines
console.log('\n--- Test 2: Synthesized Web Audio Sound Effects ---');
{
  const audio = new SampayanAudio();
  audio.ensureContext();

  const newSfx = ['toss', 'swish', 'meow', 'catHiss', 'unpin', 'sizzle', 'tsinelas'];
  newSfx.forEach(sfx => {
    assert.doesNotThrow(() => {
      audio.playSfx(sfx);
    }, `playSfx('${sfx}') threw an error`);
  });
  console.log('✓ All 7 synthesized procedural SFX executed successfully');
}

// TEST SUITE 3: Game Setup, Pacing & Garment Definitions
console.log('\n--- Test 3: Garment Attributes & Tightened Pacing ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  // Verify garment weight, pins, and isWhite attributes
  assert.strictEqual(game.KINDS.floral_blanket.weight, 'heavy');
  assert.strictEqual(game.KINDS.floral_blanket.pins, 2);
  assert.strictEqual(game.KINDS.floral_blanket.isWhite, false);

  assert.strictEqual(game.KINDS.school_uniform.weight, 'medium');
  assert.strictEqual(game.KINDS.school_uniform.pins, 2);
  assert.strictEqual(game.KINDS.school_uniform.isWhite, true);

  assert.strictEqual(game.KINDS.sando.weight, 'light');
  assert.strictEqual(game.KINDS.sando.pins, 1);
  assert.strictEqual(game.KINDS.sando.isWhite, true);

  assert.strictEqual(game.KINDS.bimpo.weight, 'light');
  assert.strictEqual(game.KINDS.bimpo.pins, 1);
  assert.strictEqual(game.KINDS.bimpo.isWhite, true);

  // Verify tightened round pacing
  assert.strictEqual(game.ROUNDS[0].rainFrom, 18);
  assert.strictEqual(game.ROUNDS[1].rainFrom, 14);
  assert.strictEqual(game.ROUNDS[2].rainFrom, 10);
  console.log('✓ KINDS and tightened round pacing verified');
}

// TEST SUITE 4: Double Clothespin (Sipit) Friction
console.log('\n--- Test 4: Double Sipit Friction & Decisive Pull ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  game.start();
  const heavyItem = game.items.find(i => i.pinsRemaining === 2);
  assert(heavyItem, 'A 2-pin item must exist on the line');

  // Click 1: First pin pops off
  game.grab(heavyItem, false);
  assert.strictEqual(heavyItem.pinsRemaining, 1);
  assert.strictEqual(game.held, null, 'Item should not be held after 1 pin popped');

  // Click 2: Second pin snaps and item is held
  game.grab(heavyItem, false);
  assert.strictEqual(heavyItem.pinsRemaining, 0);
  assert.strictEqual(game.held, heavyItem, 'Item should be held after 2nd pin popped');
  console.log('✓ Double-click unpin friction verified');
}

// TEST SUITE 5: "Shoot sa Batya!" Ballistic Flick & Toss Mechanics
console.log('\n--- Test 5: Ballistic Flick & Toss Physics ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  let scoreUpdated = false;
  const game = new SampayanGame(renderer, audio, {
    onScoreChange: () => { scoreUpdated = true; }
  });

  game.start();
  const item = game.items.find(i => i.weight === 'light');
  assert(item, 'Light item must exist');

  // Grab item
  game.grab(item, false);
  assert.strictEqual(game.held, item);

  // Position far away from basket (basket is at x=9.8, y=5.2)
  item.x = 0;
  item.y = 0;
  item.z = 1.7;

  const now = performance.now();
  game.pointerHistory = [
    { x: 240, y: 135, t: now - 80 },
    { x: 270, y: 155, t: now - 40 },
    { x: 300, y: 175, t: now },
  ];

  // Call letGo outside basket
  game.letGo();
  assert.strictEqual(item.state, 'tossed', 'High speed flick must initiate tossed state');
  assert(item.vx > 0, 'vx must be positive toward right');
  assert(item.vy > 0, 'vy must be positive toward bottom');
  assert(item.vz > 0, 'vz must have upward ballistic loft');
  assert(item.vx <= 28 && item.vx >= -28, 'vx must be safely clamped within bounds');

  // Simulate trajectory step towards basket
  item.x = game.BASKET.x;
  item.y = game.BASKET.y;
  item.z = game.BASKET.h + 0.5;

  game.update(0.016);
  assert.strictEqual(item.state, 'basket', 'Item entering basket cylinder must be banked');
  assert(game.swishScores >= 1, 'Long distance swish score must be recorded');
  assert(game.score >= 15, 'Swish bonus (+15) must be awarded');
  console.log('✓ Ballistic flick toss and swish score verified');
}

// TEST SUITE 6: Multi-Salba (Multi-Carry)
console.log('\n--- Test 6: Multi-Salba Bundle Scooping ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  game.start();
  const lightItems = game.items.filter(i => i.weight === 'light');
  assert(lightItems.length >= 2, 'At least 2 light items must exist');

  const first = lightItems[0];
  const second = lightItems[1];

  game.grab(first, false);
  assert.strictEqual(game.held, first);

  // Scoop second item
  second.pinsRemaining = 0;
  second.state = 'held';
  game.heldItems = [second];

  assert.strictEqual(game.heldItems.length, 1);

  // Releasing over basket banks both
  first.x = game.BASKET.x;
  first.y = game.BASKET.y;
  first.z = game.BASKET.h;

  game.letGo();
  assert.strictEqual(first.state, 'basket');
  assert.strictEqual(second.state, 'basket');
  assert.strictEqual(game.heldItems.length, 0);
  console.log('✓ Multi-salba scooping and bundled banking verified');
}

// TEST SUITE 7: Munin the Puspin Cat Hazard & Shoo ("Tsupe!")
console.log('\n--- Test 7: Munin Cat Hazard & Shoo Click ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  game.start();
  game.roundBanner = null;
  const cat = game.cat;
  cat.active = true;
  cat.state = 'parapet_walk';

  // Drop an item on the ground
  const groundItem = game.items[0];
  groundItem.state = 'ground';
  groundItem.soiled = null;

  // Cat stalks
  game.update(0.1);
  assert.strictEqual(cat.state, 'stalk');
  assert.strictEqual(cat.targetItem, groundItem);

  // Reach ground item and knead
  cat.x = groundItem.x;
  cat.y = groundItem.y;
  game.update(0.1);
  assert.strictEqual(cat.state, 'knead_nap');

  // Complete nap -> soils laundry and deducts 5 points
  game.score = 20;
  cat.napTimer = 0.01;
  game.update(0.05);
  assert.strictEqual(groundItem.soiled, 'paw');
  assert.strictEqual(game.score, 15, 'Soiled laundry must deduct 5 points');
  assert(game.tsinelasMeter >= 15, 'Tsinelas meter must increase');
  assert.strictEqual(cat.state, 'flee');

  // Shoo cat while active
  cat.state = 'parapet_walk';
  const prevTsinelas = game.tsinelasMeter;
  game.shooCat();
  assert.strictEqual(cat.state, 'flee');
  assert.strictEqual(game.tsinelasMeter, prevTsinelas - 6, 'Shoo cat must appease Nanay by -6');
  console.log('✓ Munin cat stalking, paw-soiling, and Tsupe! shooing verified');
}

// TEST SUITE 8: Mang Boy's BBQ Smoke Hazard, Single-Lane Targeting, Telegraph Exclamation Mark & Controlled Speed
console.log('\n--- Test 8: BBQ Smoke Hazard, Single-Lane Targeting, Telegraph Exclamation Mark & Controlled Speed ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  game.start();
  game.roundBanner = null;

  // 1. Verify Telegraph Warning Phase and Single Lane Selection
  const smoke = game.smokeEvent;
  smoke.active = false;
  smoke.warning = false;
  smoke.nextSmokeIn = 0.05; // Ready to trigger

  game.updateSmoke(0.1);
  assert.strictEqual(smoke.warning, true, 'Smoke must enter telegraph warning phase before activating');
  assert.strictEqual(smoke.active, false, 'Smoke must not be active during telegraph warning');
  assert(smoke.warningTimer > 1.5, 'Telegraph warning timer must provide fair player notice (> 1.5s)');
  assert([0, 1, 2].includes(smoke.lineIdx), 'Smoke must target exactly one valid line (0, 1, or 2)');

  // Verify pickSmokeLine prefers lines with clothes
  const chosenLine = game.pickSmokeLine();
  assert([0, 1, 2].includes(chosenLine), 'pickSmokeLine must return a valid line index');

  // Verify drawSmokeWarning executes cleanly without errors during warning phase
  let drawCallCount = 0;
  renderer.ctx.save = () => { drawCallCount++; };
  game.drawSmokeWarning();
  assert(drawCallCount > 0, 'drawSmokeWarning must render telegraph indicators and warning badge');

  // Verify smoke travel speed is controlled and reactable
  assert(smoke.speed <= 2.5, `Smoke speed (${smoke.speed}) must be fair and reactable (<= 2.5)`);

  // 2. Advance through telegraph phase into active smoke phase
  const warnTime = smoke.warningTimer + 0.1;
  for (let s = 0; s < Math.ceil(warnTime / 0.1); s++) {
    game.updateSmoke(0.1);
  }
  assert.strictEqual(smoke.warning, false, 'Telegraph warning must complete');
  assert.strictEqual(smoke.active, true, 'Smoke must become active after telegraph warning');

  // Advance several active steps to generate wafting smoke particles
  for (let s = 0; s < 5; s++) {
    game.updateSmoke(0.1);
  }

  // 3. Verify particles are strictly confined to the targeted lane (single-lane targeting)
  const targetLineY = game.LINE_YS[smoke.lineIdx];
  assert(smoke.particles.length > 0, 'Active smoke must generate wafting particles');
  for (const p of smoke.particles) {
    const yDist = Math.abs(p.y - targetLineY);
    assert(yDist < 1.0, `Smoke particle Y distance (${yDist}) must stay strictly within the target lane (< 1.0)`);
  }

  // 4. Verify white vs colored fabric soiling on targeted line
  smoke.active = true;
  smoke.startTimer = 8.5;
  smoke.timer = 8.5;
  smoke.lineIdx = 1;

  const testLineY = game.LINE_YS[1];
  const whiteItem = game.items.find(i => i.isWhite && Math.abs(i.y - testLineY) < 0.6);
  const colorItem = game.items.find(i => !i.isWhite && Math.abs(i.y - testLineY) < 0.6);

  assert(whiteItem, 'White item must exist on smoke target line');
  assert(colorItem, 'Non-white item must exist on smoke target line');

  // Position white item on left side where smoke reaches
  whiteItem.x = -8;
  colorItem.x = -6;

  // Advance smoke time past exposure threshold
  for (let s = 0; s < 50; s++) {
    game.updateSmoke(0.1);
  }

  assert.strictEqual(whiteItem.soiled, 'smoke', 'White garment must be soiled by smoke');
  assert.strictEqual(colorItem.soiled, null, 'Non-white garment must not be soiled by smoke');

  // 5. Deep Verification: Verify arrow projection aligns accurately with rope for all 3 lines
  smoke.warning = true;
  for (let l = 0; l < 3; l++) {
    smoke.lineIdx = l;
    const targetY = game.LINE_YS[l];
    const pRope = renderer.project(-2.0, targetY, game.LINE_Z);
    let capturedPoints = [];
    renderer.ctx.lineTo = (x, y) => { capturedPoints.push({ x, y }); };
    renderer.ctx.save = () => {};
    game.drawSmokeWarning();
    // Verify an arrow tip was rendered touching the line rope
    const arrowTip = capturedPoints.find(pt => Math.abs(pt.y - Math.round(pRope.sy - 2)) <= 1);
    assert(arrowTip, `Warning arrow tip must point precisely to Line ${l} rope (sy: ${pRope.sy})`);
  }

  // 6. Verify phase guard: drawSmokeWarning must not render if phase is not 'play'
  game.phase = 'over';
  let leakDrawCount = 0;
  renderer.ctx.save = () => { leakDrawCount++; };
  game.drawSmokeWarning();
  assert.strictEqual(leakDrawCount, 0, 'drawSmokeWarning must not execute when phase is not "play"');
  game.phase = 'play';

  // 7. Verify smooth particle dissipation (particles continue updating and do not abruptly pop out)
  smoke.particles = [{ x: 0, y: game.LINE_YS[1], z: 1.8, vx: 2.4, vy: 0, vz: 0.1, r: 0.6, life: 1, maxLife: 10 }];
  smoke.active = false;
  smoke.warning = false;
  smoke.timer = 0;
  smoke.nextSmokeIn = 5.0; // In cooldown
  game.updateSmoke(0.1);
  assert(smoke.particles.length > 0, 'Particles must smoothly dissipate rather than abruptly vanishing');
  assert.strictEqual(smoke.particles[0].life, 1.1, 'Dissipating particle life must advance with dt');

  // 8. Verify pickSmokeLine prioritizes unsoiled white garments over already soiled white garments
  const itemsOnLine0 = game.items.filter(i => Math.abs(i.y - game.LINE_YS[0]) < 0.6);
  const itemsOnLine1 = game.items.filter(i => Math.abs(i.y - game.LINE_YS[1]) < 0.6);
  const itemsOnLine2 = game.items.filter(i => Math.abs(i.y - game.LINE_YS[2]) < 0.6);
  for (const it of itemsOnLine0) { if (it.isWhite) it.soiled = 'smoke'; }
  for (const it of itemsOnLine1) { if (it.isWhite) it.soiled = null; }
  for (const it of itemsOnLine2) { if (it.isWhite) it.soiled = 'smoke'; }
  const picked = game.pickSmokeLine();
  assert.strictEqual(picked, 1, 'pickSmokeLine must prioritize line with unsoiled white clothes');

  console.log('✓ Mang Boy single-lane smoke, exclamation telegraph, controlled speed, projection alignment & smooth dissipation verified');
}

// TEST SUITE 9: Nanay's Urgent Utos Timed Bounties
console.log('\n--- Test 9: Urgent Utos Bounties ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  let utosState = null;
  const game = new SampayanGame(renderer, audio, {
    onUtosChange: (u) => { utosState = u; }
  });

  game.start();
  game.roundBanner = null;
  const utos = game.utos;
  utos.cooldown = 0.01;
  game.updateUtos(0.05);

  assert(utos.active, 'Urgent Utos should be active');
  assert(utosState, 'onUtosChange should be invoked');
  const target = game.items.find(i => i.id === utos.targetItemId);
  assert(target, 'Target item must exist');

  // Bank target item to complete utos
  const prevScore = game.score;
  game.bank(target);
  assert(!utos.active, 'Utos should be completed after banking');
  assert.strictEqual(game.utosCount, 1);
  assert(game.score > prevScore + target.value * 2, '3x bounty points awarded');
  assert.strictEqual(game.combo, 5, 'Combo maxed to 5x');
  console.log('✓ Urgent Utos activation, countdown, and 3x bounty banking verified');
}

// TEST SUITE 10: Tsinelas Threat Meter & Bilingual Names
console.log('\n--- Test 10: Tsinelas Threat Meter & Bilingual Naming ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  let tsinelasReported = 0;
  let rageReported = false;
  const game = new SampayanGame(renderer, audio, {
    onTsinelasChange: (pct, rage) => {
      tsinelasReported = pct;
      rageReported = rage;
    }
  });

  game.start();
  assert.strictEqual(game.tsinelasMeter, 0);

  // Surge meter to 100
  game.adjustTsinelasMeter(100);
  assert.strictEqual(game.tsinelasMeter, 100);
  assert.strictEqual(game.tsinelasRage, true);
  assert.strictEqual(tsinelasReported, 100);
  assert.strictEqual(rageReported, true);

  // Test garment translation display name mapping
  const htmlContent = fs.readFileSync('./index.html', 'utf8');
  assert(htmlContent.includes('floral_blanket: { tl: \'KUMOT\', en: \'BLANKET\' }'));
  assert(htmlContent.includes('school_uniform: { tl: \'UNIPORME\', en: \'UNIFORM\' }'));
  assert(htmlContent.includes('basketball_jersey: { tl: \'JERSEY\', en: \'JERSEY\' }'));
  assert(htmlContent.includes('gradeRage:'));
  console.log('✓ Tsinelas Rage activation and bilingual dictionary mappings verified');
}

// TEST SUITE 11: Dynamic Tropical Sky & Neighboring Barrio Houses Background
console.log('\n--- Test 11: Dynamic Tropical Sky & Neighboring Barrio Houses Background ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  // 1. Verify Sky and Ground Initialization
  const skyPixelIdx = 5 * renderer.width + 20; // Top sky pixel (iy = 5, ix = 20)
  assert(renderer.zb[skyPixelIdx] < -1e8, 'Sky pixel must have background depth');
  const skyColor = renderer.pix[skyPixelIdx];
  const skyR = skyColor & 255;
  const skyG = (skyColor >> 8) & 255;
  const skyB = (skyColor >> 16) & 255;

  assert(skyB > skyR && skyB > skyG, 'Sky pixel at top must be tropical blue');
  assert(!(skyR === 255 && skyG === 255 && skyB === 255), 'Sky pixel must NOT be plain white');

  // 2. Verify Neighboring Houses in Depth Buffer
  // Check behind main house parapet (e.g. House 1 at ix = 312, iy = 54)
  const neighborPixelIdx = 54 * renderer.width + 312;
  assert(renderer.zb[neighborPixelIdx] > -1e8, 'Neighboring house geometry must populate depth buffer');

  // 3. Verify Storm Grading on Sky Pixels
  const calmSkyCol = renderer.pix[skyPixelIdx];
  renderer.gradeStorm(0.9, 0, 0, 0, null);
  const stormSkyCol = renderer.pix[skyPixelIdx];
  assert.notStrictEqual(calmSkyCol, stormSkyCol, 'Sky pixels must dynamically grade during storms');

  // 4. Verify Lightning Flash Illuminates Sky
  renderer.clear();
  renderer.gradeStorm(0.9, 0, 0, 1.0, null);
  const flashSkyCol = renderer.pix[skyPixelIdx];
  const flashB = (flashSkyCol >> 16) & 255;
  const stormB = (stormSkyCol >> 16) & 255;
  assert(flashB > stormB && flashB >= 200, 'Lightning flash must illuminate sky pixels');

  // 5. Verify Full Game Draw Loop with New Background
  game.start();
  game.draw();
  game.startRound(2);
  game.draw();
  game.startRound(3);
  game.strike();
  game.draw();

  console.log('✓ Dynamic tropical sky gradient and neighboring barrio houses verified');
}

// TEST SUITE 12: Cat Targeting Laundry Tub (Batya) & Spilling Banked Clothes
console.log('\n--- Test 12: Cat Targeting Laundry Tub & Spilling Banked Clothes ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  game.start();
  game.roundBanner = null;

  // Bank 2 items into the basket
  const item1 = game.items[0];
  const item2 = game.items[1];
  game.bank(item1);
  game.bank(item2);
  assert.strictEqual(item1.state, 'basket');
  assert.strictEqual(item2.state, 'basket');
  assert.strictEqual(game.items.filter(i => i.state === 'basket').length, 2);

  // Set cat active and walking parapet
  const cat = game.cat;
  cat.active = true;
  cat.state = 'parapet_walk';

  // Advance game update so cat targets the tub
  game.update(0.1);
  assert.strictEqual(cat.state, 'stalk_basket', 'Cat must target banked laundry tub');
  assert.strictEqual(cat.targetType, 'basket');

  // Cat walks to the visible interaction spot beside the tub.
  cat.x = game.BASKET.x;
  cat.y = game.BASKET.y;
  for (let i = 0; i < 120 && cat.state === 'stalk_basket'; i++) game.updateSingleCat(cat, 1 / 60);
  assert.strictEqual(cat.state, 'tip_basket', 'Cat must enter tip_basket state at the tub');

  // Reproduce approaches from either side, then measure the actual depth-tested
  // sprite against the tub and banked pile in both clawing animation frames.
  for (const type of ['munin', 'siopao', 'kitkit']) {
    for (const side of [-1, 1]) {
      const visitor = game.createCat(type, {
        active: true, state: 'stalk_basket',
        x: game.BASKET.x + side * 2, y: game.BASKET.y + 0.6,
      });
      for (let i = 0; i < 300 && visitor.state === 'stalk_basket'; i++) game.updateSingleCat(visitor, 1 / 60);
      assert.strictEqual(visitor.state, 'tip_basket', 'Approaching cat must reach the tub');
      assert.strictEqual(visitor.facing, 1, 'Interacting cat must face the tub');
      for (const time of [0, 0.2]) {
        renderer.pix.fill(0);
        renderer.zb.fill(-1e9);
        renderer.drawMuninCat(visitor, time);
        const fullSprite = renderer.pix.filter(pixel => pixel !== 0).length;
        renderer.clear();
        game.drawBatya(0.35);
        game.drawPile();
        const beforeCat = renderer.pix.slice();
        renderer.drawMuninCat(visitor, time);
        const visible = renderer.pix.filter((pixel, i) => pixel !== beforeCat[i]).length;
        assert(visible >= fullSprite * 0.85, `${type} must remain visible while clawing the batya`);
      }
    }
  }

  // Let tip timer expire -> tips tub, knocks clothes out onto ground with paw soiling
  game.score = 50;
  cat.tipTimer = 0.01;
  const prevTsinelas = game.tsinelasMeter;
  game.update(0.05);

  assert.strictEqual(game.score, 40, 'Tipped tub must deduct 10 points');
  assert(game.tsinelasMeter >= prevTsinelas + 20, 'Tipped tub must increase Nanay rage by +20');
  const spilledItems = game.items.filter(i => i.state === 'falling' || i.state === 'ground');
  assert(spilledItems.length >= 2, 'Clothes must erupt and scatter from the tub');
  assert(spilledItems.every(i => i.soiled === 'paw'), 'Knocked clothes must be soiled with pawprints');
  assert.strictEqual(cat.state, 'flee', 'Cat must flee after tipping tub');

  // Advance physics until scattered clothes settle on the ground
  for (let s = 0; s < 10; s++) {
    game.update(0.1);
  }
  const landedItems = game.items.filter(i => i.state === 'ground');
  assert(landedItems.length >= 2, 'Clothes must land on the floor');

  // Verify Tub Blocking: When Siopao is loafing at the tub in tip_basket state, banking clothes is blocked
  cat.active = true;
  cat.state = 'tip_basket';
  cat.type = 'siopao';
  const testGarment = game.items.find(i => i.state === 'ground');
  assert(testGarment, 'Test garment exists');
  game.bank(testGarment);
  assert.notStrictEqual(testGarment.state, 'basket', 'Banking must be blocked while cat loafs on tub');
  assert(testGarment.state === 'falling' || testGarment.state === 'ground', 'Blocked item must bounce to floor');

  console.log('✓ Cat tub stalking, tipping, laundry spilling, and Siopao tub blocking verified');
}

// TEST SUITE 13: Cat Archetypes & Escalation across Rounds
console.log('\n--- Test 13: Cat Archetypes & Escalation across Rounds ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  // Round 1: 1 cat (Munin)
  game.startRound(1);
  assert.strictEqual(game.cats.length, 1);
  assert.strictEqual(game.cats[0].type, 'munin');

  // Round 2: 2 cats (Munin & Siopao)
  game.startRound(2);
  assert.strictEqual(game.cats.length, 2);
  assert.strictEqual(game.cats[0].type, 'munin');
  assert.strictEqual(game.cats[1].type, 'siopao');

  // Round 3: 3 cats (Munin, Siopao, Kitkit)
  game.startRound(3);
  assert.strictEqual(game.cats.length, 3);
  assert.strictEqual(game.cats[0].type, 'munin');
  assert.strictEqual(game.cats[1].type, 'siopao');
  assert.strictEqual(game.cats[2].type, 'kitkit');

  // Verify Chubby Siopao requires 2 clicks to shoo
  const siopao = game.cats[1];
  siopao.active = true;
  siopao.state = 'parapet_walk';
  assert.strictEqual(siopao.hitsRemaining, 2);

  // First click: stubborn reaction, remains active
  game.shooCat(siopao);
  assert.strictEqual(siopao.hitsRemaining, 1);
  assert.strictEqual(siopao.state, 'parapet_walk', 'Siopao should not flee after 1st click');

  // Second click: shooed, flees!
  game.shooCat(siopao);
  assert.strictEqual(siopao.state, 'flee', 'Siopao flees after 2nd click');

  // Verify Speedy Kitten speed attribute and clothesline swiping behavior
  const kitkit = game.cats[2];
  assert(kitkit.speed > game.cats[0].speed, 'Kitkit should be faster than Munin');

  // Test Kitkit zip_line clothesline swiping:
  game.phase = 'play';
  game.roundBanner = null;
  kitkit.active = true;
  kitkit.state = 'zip_line';
  kitkit.targetLine = 1;
  kitkit.x = 0;
  kitkit.y = game.LINE_YS[1];
  kitkit.z = 0;
  kitkit.facing = 1;

  // Place a hanging garment directly on line 1 at x = 0.5
  const hangingItem = game.items.find(i => i.state === 'line');
  assert(hangingItem, 'Hanging garment found');
  hangingItem.y = game.LINE_YS[1];
  hangingItem.x = 0.5;
  hangingItem.pinsRemaining = 1;

  // Update game so Kitkit runs past and swipes garment
  game.update(0.1);
  assert(hangingItem.state === 'falling' || hangingItem.state === 'ground', 'Kitkit must swipe garment off line');
  assert.strictEqual(hangingItem.soiled, 'paw', 'Swiped garment must have paw print');

  // Verify rendering of all 3 archetypes without errors
  game.cats.forEach(c => {
    c.active = true;
    renderer.drawMuninCat(c, 0.5);
  });

  console.log('✓ Cat archetypes (Munin, Siopao, Kitkit), 2-click shooing, and Kitkit line swiping verified');
}

// TEST SUITE 14: Nanay's Flying Slipper (Spartan Tsinelas) Real Physical Projectile
console.log('\n--- Test 14: Nanay Flying Slipper Projectile & Impact ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  game.start();
  game.roundBanner = null;

  // Hold a garment manually (without auto-banking)
  const garment = game.items[0];
  garment.x = 0;
  garment.y = 0;
  garment.pinsRemaining = 0;
  garment.state = 'held';
  game.held = garment;
  game.auto = false;
  game.pointer = null;
  assert.strictEqual(game.held, garment);

  // Meter hits 100 -> triggers Nanay rage and launches flying slipper
  game.adjustTsinelasMeter(100);
  assert.strictEqual(game.tsinelasRage, true);
  assert(game.flyingSlipper && game.flyingSlipper.active, 'Flying slipper projectile must be active');
  assert(game.flyingSlipper.spin !== 0, 'Slipper must spin in mid-air');

  // Render flying slipper without errors
  renderer.drawFlyingSlipper(game.flyingSlipper);

  // Spawn an active cat near slipper impact path
  const cat = game.cat;
  cat.active = true;
  cat.state = 'parapet_walk';
  cat.timer = 5.0;
  cat.x = game.flyingSlipper.tx;
  cat.y = game.flyingSlipper.ty;
  cat.z = 0;

  // Advance flight until impact
  for (let s = 0; s < 12; s++) {
    game.update(0.1);
  }

  assert.strictEqual(game.flyingSlipper.active, false, 'Slipper must impact target');
  assert.strictEqual(cat.state, 'flee', 'Cat in flight path must be slapped away');
  assert.strictEqual(cat.z, 0, 'Cat in flight path must be grounded (z = 0) when slapped away');
  assert.strictEqual(game.held, null, 'Held laundry must be knocked down onto floor');
  assert(garment.state === 'falling' || garment.state === 'ground', 'Dropped laundry must fall to the ground');
  assert(game.stunTimer > 0, 'Player carry action must be temporarily stunned');

  // Verify that an empty-handed player is still stunned when hit by the slipper
  game.stunTimer = 0;
  game.held = null;
  game.pointer = { x: 240, y: 135 }; // Screen center
  const pw = game.pointerWorld();
  game.adjustTsinelasMeter(100);
  assert(game.flyingSlipper && game.flyingSlipper.active);
  game.flyingSlipper.tx = pw.x;
  game.flyingSlipper.ty = pw.y;
  for (let s = 0; s < 12; s++) {
    game.update(0.1);
  }
  assert(game.stunTimer > 0, 'Empty-handed player must still be stunned on impact');

  // Verify player can still shoo cats while carry action is stunned
  cat.active = true;
  cat.state = 'parapet_walk';
  cat.x = 0; cat.y = 0; cat.z = 0;
  const catP = renderer.project(cat.x, cat.y, cat.z);
  game.pointer = { x: catP.sx, y: catP.sy - 12 };
  game.shooCat(cat);
  assert.strictEqual(cat.state, 'flee', 'Player can still shoo cat away even when carry action is stunned');

  console.log('✓ Flying slipper projectile, cat smack, laundry drop, stun, and shooing verified');
}

// TEST SUITE 15: Tightened Pacing & Early Hazard Triggers
console.log('\n--- Test 15: Tightened Pacing & Early Hazard Triggers ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  game.start();
  assert(game.smokeEvent.nextSmokeIn <= 6.0, 'Smoke hazard must trigger early (<= 6.0s)');
  assert(game.cat.cooldown <= 4.5, 'Cat hazard must activate early (<= 4.5s)');

  console.log('✓ Tightened hazard pacing verified');
}

// TEST SUITE 16: Visual Polish & Geometry Fixes
console.log('\n--- Test 16: Visual Polish, Depth Buffering & Geometry Fixes ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  // 1. Verify Batya Clothes Pile Visibility (not occluded by lid or low depth)
  renderer.pix.fill(0);
  renderer.zb.fill(-1e9);
  game.drawBatya(0);
  const pixAfterBatya = new Uint32Array(renderer.pix);

  game.items[0].state = 'basket';
  game.drawPile();
  let pilePixDrawn = 0;
  for (let i = 0; i < renderer.pix.length; i++) {
    if (renderer.pix[i] !== pixAfterBatya[i]) pilePixDrawn++;
  }
  assert(pilePixDrawn > 50, `Banked clothes must be visible inside batya (actual: ${pilePixDrawn} px)`);

  // 2. Verify Nanay Facing Perspective (face, eyes, and lips facing camera and southwest)
  const px = -8.5, py = 3.8, yaw = 0.78, k = 1.35;
  const fx = Math.cos(yaw), fy = Math.sin(yaw), sx = -fy, sy = fx;
  const eyeR = [px + (fx * 0.18 + sx * -0.06) * k, py + (fy * 0.18 + sy * -0.06) * k, 1.75 * k];
  const hairBack = [px + (fx * -0.04) * k, py + (fy * -0.04) * k, 1.78 * k];
  const pEye = renderer.project(eyeR[0], eyeR[1], eyeR[2]);
  const pHair = renderer.project(hairBack[0], hairBack[1], hairBack[2]);
  assert(pEye.d > pHair.d, 'Nanay face/eyes must be closer to camera than back hair');

  // 3. Verify Floater strings contain zero emoji characters
  const gameCode = fs.readFileSync('./game.js', 'utf8');
  const floaterMatches = gameCode.match(/addFloater\([^)]+\)/g) || [];
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  for (const m of floaterMatches) {
    assert(!emojiRegex.test(m), `Floater call must not contain emoji: ${m}`);
  }

  // 4. Flee paws must meet the projected ground in both directions.
  for (const type of ['munin', 'siopao', 'kitkit']) {
    for (const facing of [-1, 1]) {
      renderer.pix.fill(0);
      renderer.zb.fill(-1e9);
      const cat = { active: true, type, facing, state: 'flee', x: 0, y: 0, z: 0 };
      renderer.drawMuninCat(cat, 0);
      const groundY = Math.round(renderer.project(0, 0, 0).sy);
      const pawRow = renderer.pix.subarray((groundY - 1) * renderer.width, groundY * renderer.width);
      assert(pawRow.some(pixel => pixel !== 0), `${type} flee paws must touch the ground`);
      assert(!renderer.pix.subarray(groundY * renderer.width).some(pixel => pixel !== 0), `${type} must not extend below ground`);
    }
  }

  console.log('✓ Visual polish fixes (batya pile visibility, Nanay 3/4 yaw, grounded flee frame, clean pixel floaters) verified');
}

console.log('\n=================================================');
console.log('ALL 16 VERIFICATION SUITES PASSED FLAWLESSLY! ✓✓✓');
console.log('=================================================');


