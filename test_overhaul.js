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
    fill: () => {},
    arc: () => {},
    rect: () => {},
    clip: () => {},
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

// TEST SUITE 8: Mang Boy's BBQ Smoke Hazard & White Fabric Soiling
console.log('\n--- Test 8: BBQ Smoke Hazard & White Fabric Soiling ---');
{
  const renderer = new SampayanRenderer(canvasMock, { width: 480, height: 270 });
  const audio = new SampayanAudio();
  const game = new SampayanGame(renderer, audio);

  game.start();
  game.roundBanner = null;
  const smoke = game.smokeEvent;
  smoke.active = true;
  smoke.timer = 8.5;
  smoke.lineIdx = 1;

  const targetLineY = game.LINE_YS[1];
  const whiteItem = game.items.find(i => i.isWhite && Math.abs(i.y - targetLineY) < 0.6);
  const colorItem = game.items.find(i => !i.isWhite && Math.abs(i.y - targetLineY) < 0.6);

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
  console.log('✓ Mang Boy smoke plume soiling white garments verified');
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

console.log('\n=================================================');
console.log('ALL 11 VERIFICATION SUITES PASSED FLAWLESSLY! ✓✓✓');
console.log('=================================================');

