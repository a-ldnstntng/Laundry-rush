'use strict';

/**
 * SampayanGame
 * Encapsulated game engine and state manager for Sampayan Rush ("Hala, May Ulan!").
 * Manages simulation physics, rooftop scene geometry, authentic Filipino laundry items,
 * Nanay character rendering, weather progression, input handling, and Nanay's Judgment.
 */
class SampayanGame {
  constructor(renderer, audio, options = {}) {
    this.renderer = renderer;
    this.audio = audio;
    this.options = options;

    // Rooftop & Line constants
    this.ROOF_X = 12.5;
    this.ROOF_Y = 7;
    this.WALL_DEPTH = 6;
    this.PARAPET_H = 0.6;
    this.POLE_X = 10;
    this.LINE_Z = 3.7;
    this.LINE_YS = [-4.2, -0.8, 2.6];
    this.SPAN = 17;

    // Basket (Batya / Planggana) & Hitbox
    this.BASKET = { x: 9.8, y: 5.2, r: 0.95, h: 1 };
    this.DROP_PX = Math.round(65 * (this.renderer.scale / 12.8)); // Generous magnetic drop hitbox scaled with zoom
    this.CARRY_Z = 1.7;

    // Game Pacing & Weather Timeline (seconds)
    // 28 full seconds of dry time!
    this.STORM_FROM = 10;
    this.STORM_TO = 28;
    this.RAIN_FROM = 28;
    this.RAIN_TO = 36;
    this.GAME_LENGTH = 48;

    // Authentic Filipino Rooftop Palettes
    this.PAVER = [182, 85, 70];        // Pulang semento (red-oxide concrete)
    this.PLASTER = [244, 236, 216];     // CHB plaster finish
    this.CONCRETE = [182, 180, 172];    // Grey concrete plinth
    this.STONE = [195, 188, 175];
    this.DARK = [38, 38, 44];
    this.REBAR = [115, 68, 48];         // Rusting rebar (bakal na nakausli)
    this.JALOUSIE = [172, 218, 220];    // Jalousie glass slats
    this.GRILLE = [42, 44, 52];         // Iron grilles (rehas na bakal)
    this.YERO = [190, 196, 204];        // Galvanized corrugated sheet
    this.YERO_RUST = [160, 78, 48];     // Rust patches on yero shed
    this.BATYA = [28, 98, 218];         // Royal blue laundry tub
    this.PLASTIC_WHITE = [246, 246, 248]; // Monobloc chair / paint pails
    this.DRUM = [24, 88, 198];          // Blue water drum
    this.TABO = [225, 42, 48];          // Red tabo with handle
    this.BOUGAINVILLEA = [238, 45, 132];
    this.CALAMANSI = [245, 175, 28];
    this.POLE = [90, 96, 105];
    this.ROPE = [245, 225, 55];         // Yellow nylon rope
    this.POT = [178, 92, 58];
    this.LEAF = [72, 128, 58];

    // Detailed Filipino Laundry Items (with authentic weight & clothespin attributes)
    this.KINDS = {
      floral_blanket: { w: 3.1, h: 2.3, value: 5, speed: 22.0, name: 'Floral Kumot', weight: 'heavy', pins: 2, isWhite: false },
      school_uniform: { w: 1.85, h: 2.2, value: 4, speed: 32.0, name: 'School Uniform', weight: 'medium', pins: 2, isWhite: true },
      daster: { w: 1.9, h: 2.25, value: 4, speed: 30.0, name: "Nanay's Daster", weight: 'medium', pins: 2, isWhite: false },
      maong: { w: 1.3, h: 2.2, value: 3, speed: 25.0, name: 'Maong Pants', weight: 'heavy', pins: 2, isWhite: false },
      basketball_jersey: { w: 1.6, h: 1.8, value: 3, speed: 38.0, name: 'Barangay Jersey', weight: 'medium', pins: 1, isWhite: false },
      sando: { w: 1.4, h: 1.7, value: 2, speed: 44.0, name: "Tatay's Sando", weight: 'light', pins: 1, isWhite: true },
      short_pambahay: { w: 1.35, h: 1.25, value: 2, speed: 46.0, name: 'Pambahay Shorts', weight: 'light', pins: 1, isWhite: false },
      bimpo: { w: 1.05, h: 1.35, value: 1, speed: 56.0, name: 'Good Morning Bimpo', weight: 'light', pins: 1, isWhite: true },
    };

    // Colorful plastic clothespins (sipit)
    this.SIPIT_COLORS = [
      this.renderer.rgb(235, 45, 55),   // bright red
      this.renderer.rgb(35, 145, 235),  // sky blue
      this.renderer.rgb(245, 215, 30),  // sunny yellow
      this.renderer.rgb(45, 185, 75),   // lime green
      this.renderer.rgb(235, 75, 155),  // hot pink
      this.renderer.rgb(245, 125, 35),  // bright orange
    ];

    this.LINE_SETS = [
      ['floral_blanket', 'school_uniform', 'sando', 'short_pambahay', 'bimpo', 'maong'],
      ['daster', 'basketball_jersey', 'floral_blanket', 'bimpo', 'sando', 'school_uniform'],
      ['school_uniform', 'sando', 'daster', 'maong', 'basketball_jersey', 'bimpo', 'short_pambahay'],
    ];

    // 3-Round Escalating Arcade Campaign Configurations (Tightened high-stakes pacing)
    this.ROUNDS = [
      {
        id: 1,
        stormFrom: 8,
        stormTo: 18,
        rainFrom: 18,
        rainTo: 26,
        gameLength: 36,
        gustMin: 5,
        gustMax: 8,
      },
      {
        id: 2,
        stormFrom: 4,
        stormTo: 14,
        rainFrom: 14,
        rainTo: 22,
        gameLength: 30,
        gustMin: 3,
        gustMax: 5.5,
      },
      {
        id: 3,
        stormFrom: 2,
        stormTo: 8,
        rainFrom: 10,
        rainTo: 18,
        gameLength: 25,
        gustMin: 1.8,
        gustMax: 3.5,
      },
    ];

    // State
    this.phase = 'title'; // 'title', 'play', 'over'
    this.t = 0;
    this.time = 0;
    this.items = [];
    this.held = null;
    this.auto = false;
    this.pointer = null;
    this.score = 0;
    this.best = this.loadBestScore();
    this.gustIn = 8;
    this.gustGlow = 0;
    this.flash = 0;
    this.boltIn = 22;
    this.bolt = null;
    this.overT = 0;
    this.wetness = 0;
    this.drops = [];
    this.splashes = [];

    // Arcade Gameplay Features
    this.combo = 1;
    this.comboTimer = 0;
    this.maxCombo = 1;
    this.airRescues = 0;
    this.freezeTimer = 0;
    this.basketBounce = 0;
    this.screenShake = 0;
    this.nanaySpeech = null;
    this.nanayPokeTimer = 0;
    this.rainWarned = false;
    this.floaters = [];
    this.round = 1;
    this.maxRounds = 3;
    this.roundBanner = null;
    this.roundTransitionTimer = 0;
    this.cumDry = 0;
    this.cumWet = 0;
    this.cumLost = 0;
    this.cumTotal = 0;
    this.cumBanked = 0;
    this.cumBankedItems = [];
    this.pointerDownPos = null;
    this.pointerDownTime = 0;
    this.paused = false;
    this.confirmingQuit = false;
    this.currentLang = options.lang || 'en';

    // Rooftop Chaos Twists State
    this.pointerHistory = [];
    this.heldItems = []; // Multi-salba support
    this.swishScores = 0; // Number of Shoot sa Batya swish tosses
    this.utosCount = 0; // Number of completed Urgent Utos

    // Tsinelas Threat Meter (0 to 100)
    this.tsinelasMeter = 0;
    this.tsinelasRage = false;
    this.tsinelasShake = 0;

    // Munin the Rooftop Puspin Cat Hazard
    this.cat = {
      active: false,
      state: 'inactive', // 'inactive', 'parapet_walk', 'stalk', 'jump_line', 'knead_nap', 'flee'
      x: -11,
      y: 5.8,
      z: 0.6,
      vx: 0,
      vy: 0,
      targetItem: null,
      targetLine: 1,
      cooldown: 5.5,
      timer: 0,
      animTime: 0,
      facing: 1,
      napTimer: 0,
    };

    // Usok ng Ihaw-Ihaw (Mang Boy's BBQ Smoke Hazard)
    this.smokeEvent = {
      active: false,
      timer: 0,
      duration: 8.5,
      lineIdx: 1,
      nextSmokeIn: 11.0,
      particles: [],
    };

    // Nanay's "Urgent Utos" Dynamic Timed Bounties
    this.utos = {
      active: false,
      targetItemId: null,
      timer: 0,
      maxTimer: 6.0,
      cooldown: 6.5,
      completed: false,
    };

    // Buffers
    this.itemBuf = new Uint16Array(this.renderer.width * this.renderer.height);
    this.puddle = new Float32Array(this.renderer.width * this.renderer.height);

    // Clouds
    this.clouds = [];
    for (let k = 0; k < 26; k++) {
      this.clouds.push({
        x: this.renderer.hash(k, 61) * this.renderer.width,
        y: 20 + this.renderer.hash(k, 62) * 26,
        r: 8 + this.renderer.hash(k, 63) * 9,
        speed: 3 + this.renderer.hash(k, 64) * 3,
        from: this.renderer.hash(k, 65),
      });
    }

    // Callbacks
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onWeatherChange = options.onWeatherChange || (() => {});
    this.onItemCountChange = options.onItemCountChange || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    this.onPhaseChange = options.onPhaseChange || (() => {});
    this.onComboChange = options.onComboChange || (() => {});
    this.onRoundChange = options.onRoundChange || (() => {});
    this.onPauseChange = options.onPauseChange || (() => {});
    this.onQuitConfirmChange = options.onQuitConfirmChange || (() => {});
    this.onTsinelasChange = options.onTsinelasChange || (() => {});
    this.onUtosChange = options.onUtosChange || (() => {});

    // Bind event handlers
    this.bindEvents();

    // Initial Rooftop Bake and hang clothes for title screen display
    this.bake();
    this.hangWashing();
  }

  setLanguage(lang) {
    this.currentLang = lang;
  }

  resetToTitle() {
    this.phase = 'title';
    this.t = 0;
    this.time = 0;
    this.score = 0;
    this.held = null;
    this.auto = false;
    this.pointer = null;
    this.gustIn = 8;
    this.gustGlow = 0;
    this.flash = 0;
    this.boltIn = 22;
    this.bolt = null;
    this.wetness = 0;
    this.overT = 0;
    this.drops.length = 0;
    this.splashes.length = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.maxCombo = 1;
    this.airRescues = 0;
    this.freezeTimer = 0;
    this.basketBounce = 0;
    this.screenShake = 0;
    this.nanaySpeech = null;
    this.nanayPokeTimer = 0;
    this.rainWarned = false;
    this.floaters.length = 0;
    this.round = 1;
    this.roundBanner = null;
    this.roundTransitionTimer = 0;
    this.cumDry = 0;
    this.cumWet = 0;
    this.cumLost = 0;
    this.cumTotal = 0;
    this.cumBanked = 0;
    this.cumBankedItems = [];
    this.pointerDownPos = null;
    this.pointerDownTime = 0;
    this.paused = false;
    this.confirmingQuit = false;
    this.pointerHistory = [];
    this.heldItems = [];
    this.swishScores = 0;
    this.utosCount = 0;
    this.tsinelasMeter = 0;
    this.tsinelasRage = false;
    this.tsinelasShake = 0;
    this.cat = {
      active: false,
      state: 'inactive',
      x: -11,
      y: 5.8,
      z: 0.6,
      vx: 0,
      vy: 0,
      targetItem: null,
      targetLine: 1,
      cooldown: 5.5,
      timer: 0,
      animTime: 0,
      facing: 1,
      napTimer: 0,
    };
    this.smokeEvent = {
      active: false,
      timer: 0,
      duration: 8.5,
      lineIdx: 1,
      nextSmokeIn: 11.0,
      particles: [],
    };
    this.utos = {
      active: false,
      targetItemId: null,
      timer: 0,
      maxTimer: 6.0,
      cooldown: 6.5,
      completed: false,
    };
    if (this.renderer.canvas) this.renderer.canvas.style.transform = '';

    this.audio.silence();
    this.hangWashing();
    this.onScoreChange(0);
    this.onComboChange(1, 1);
    this.onRoundChange(1, this.maxRounds);
    this.onTsinelasChange(0, false);
    this.onUtosChange(null);
    this.onPauseChange(false);
    if (this.onQuitConfirmChange) this.onQuitConfirmChange(false);
    this.onPhaseChange('title');
  }

  loadBestScore() {
    try {
      return +localStorage.getItem('sampayan_rush_best_score') || 0;
    } catch {
      return 0;
    }
  }

  saveBestScore(val) {
    try {
      localStorage.setItem('sampayan_rush_best_score', String(val));
    } catch {}
  }

  /* ---------- Helpers ---------- */
  lineZ(x) {
    return this.LINE_Z - 0.22 * (1 - (x / this.POLE_X) ** 2);
  }

  stormLevel() {
    return this.renderer.ease(this.renderer.clamp((this.t - this.STORM_FROM) / (this.STORM_TO - this.STORM_FROM), 0, 1));
  }

  rainLevel() {
    return this.renderer.clamp((this.t - this.RAIN_FROM) / (this.RAIN_TO - this.RAIN_FROM), 0, 1);
  }

  shuffle(list) {
    for (let k = list.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [list[k], list[j]] = [list[j], list[k]];
    }
    return list;
  }

  getKindPalette(kind) {
    if (kind === 'floral_blanket') {
      const bases = [[248, 244, 235], [225, 242, 232], [250, 230, 236]];
      return {
        color: bases[Math.floor(Math.random() * bases.length)],
        accent: [225, 45, 65],
      };
    }
    if (kind === 'school_uniform') {
      const skirts = [
        [24, 88, 48],   // Public school pine green
        [125, 24, 42],  // High school / university maroon
        [28, 48, 110],  // Academy navy blue
        [155, 125, 80], // Khaki / beige
      ];
      return {
        color: [246, 246, 250],
        accent: skirts[Math.floor(Math.random() * skirts.length)],
      };
    }
    if (kind === 'daster') {
      const dasterCombos = [
        { color: [38, 165, 175], accent: [248, 215, 60] },  // Turquoise + sunny yellow
        { color: [225, 55, 125], accent: [255, 235, 120] }, // Fuchsia + cream
        { color: [248, 180, 45], accent: [225, 55, 55] },   // Papaya orange + red
        { color: [142, 65, 165], accent: [245, 215, 75] },  // Purple + gold
      ];
      const combo = dasterCombos[Math.floor(Math.random() * dasterCombos.length)];
      return { color: combo.color, accent: combo.accent };
    }
    if (kind === 'sando') {
      const trims = [[45, 85, 180], [215, 45, 45], [40, 40, 45], [230, 230, 235]];
      return {
        color: [246, 246, 250],
        accent: trims[Math.floor(Math.random() * trims.length)],
      };
    }
    if (kind === 'basketball_jersey') {
      const jerseys = [
        { color: [205, 32, 38], accent: [248, 248, 252] }, // Barangay Ginebra Red & White
        { color: [24, 85, 185], accent: [245, 215, 45] },  // Gilas Blue & Gold
        { color: [95, 35, 140], accent: [245, 205, 35] },  // Purple & Gold
        { color: [35, 125, 65], accent: [248, 248, 252] }, // Green & White
      ];
      const j = jerseys[Math.floor(Math.random() * jerseys.length)];
      return { color: j.color, accent: j.accent };
    }
    if (kind === 'maong') {
      const denims = [[48, 76, 128], [72, 112, 168], [38, 56, 96]];
      return {
        color: denims[Math.floor(Math.random() * denims.length)],
        accent: [215, 145, 45],
      };
    }
    if (kind === 'short_pambahay') {
      const shorts = [
        [185, 35, 45],  // Red
        [32, 50, 115],  // Navy
        [28, 110, 60],  // Green
        [42, 42, 48],   // Black
      ];
      return {
        color: shorts[Math.floor(Math.random() * shorts.length)],
        accent: [248, 248, 252],
      };
    }
    if (kind === 'bimpo') {
      return {
        color: [248, 246, 242],
        accent: [215, 32, 42], // Good Morning red
      };
    }
    return { color: [240, 240, 240], accent: [100, 100, 100] };
  }

  /* ---------- Rooftop Scene Construction & Baking ---------- */
  groundColor(x, y, ix, iy) {
    if (Math.abs(x) > this.ROOF_X || Math.abs(y) > this.ROOF_Y) return 0;
    // Pulang Semento: polished red-oxide concrete roofdeck with expansion groove lines
    const fx = x / 2.2, row = Math.floor(fx), fy = y / 2.2, col = Math.floor(fy);
    const joint = Math.abs(fx - row) < 0.035 || Math.abs(fy - col) < 0.035;
    const ramp = this.renderer.rampOf(this.PAVER);
    if (joint) return ramp[1];
    const fine = this.renderer.hash(ix, iy);
    if (fine > 0.975) return ramp[4];
    // Moss (lumot) near the parapet edges where tropical rain dampens the concrete
    const edgeDamp = Math.max(Math.abs(x) / this.ROOF_X, Math.abs(y) / this.ROOF_Y);
    if (edgeDamp > 0.82 && this.renderer.noise(x * 0.6, y * 0.6) > 0.55 && fine > 0.4) {
      return this.renderer.rgb(92, 125, 62);
    }
    const tone = this.renderer.hash(row, col);
    return ramp[this.renderer.clamp(Math.floor(2.2 + tone * 1.5 + (this.renderer.bayerAt(ix, iy) - 0.5) * 0.5), 2, 4)];
  }

  wallColor(a, z, base) {
    // Tropical concrete hollow block (CHB) wall
    const course = Math.floor((z + 40) * 1.8), block = Math.floor(a * 1.1 + (course % 2) * 0.5);
    const isBase = z < -3.3;
    const palette = isBase ? this.CONCRETE : this.PLASTER;
    if (this.renderer.noise(a * 0.35, z * 0.45 + 3) > 0.72) {
      return this.renderer.rampOf(this.CONCRETE)[this.renderer.clamp(base - 1, 0, 4)];
    }
    const mortar = Math.abs((z + 40) * 1.8 - course) < 0.08 || Math.abs(a * 1.1 + (course % 2) * 0.5 - block) < 0.07;
    return this.renderer.rampOf(palette)[this.renderer.clamp(base - (mortar ? 1 : 0), 0, 4)];
  }

  wallPixel(x, y, z, a, base) {
    const fade = (-z - (this.WALL_DEPTH - 3)) / 3;
    if (fade > 0 && this.renderer.hash(a * 23 | 0, z * 23 | 0) < fade) return;
    this.renderer.plot(x, y, z, this.wallColor(a, z, base));
  }

  buildWalls() {
    const step = 0.045;
    for (let x = -this.ROOF_X; x <= this.ROOF_X; x += step) {
      for (let z = 0; z >= -this.WALL_DEPTH; z -= step) this.wallPixel(x, this.ROOF_Y, z, x, 3);
    }
    for (let y = -this.ROOF_Y; y <= this.ROOF_Y; y += step) {
      for (let z = 0; z >= -this.WALL_DEPTH; z -= step) this.wallPixel(this.ROOF_X, y, z, y, 2);
    }

    // Filipino Jalousie Windows with Ornamental Iron Grilles (Rehas)
    const windows = (place, count, span) => {
      for (let k = 0; k < count; k++) {
        const c = (k + 0.5) / count * span * 2 - span;
        for (let a = -0.55; a <= 0.55; a += step) {
          for (let z = -2.8; z <= -1; z += step) {
            const isBorder = Math.abs(a) > 0.48 || z < -2.72 || z > -1.08;
            const isMullion = Math.abs(a) < 0.04;
            if (isBorder || isMullion) {
              place(c + a, z, this.renderer.rampOf(this.DARK)[2]);
            } else {
              const slat = Math.floor((z + 10) * 4.6) % 2;
              place(c + a, z, this.renderer.rampOf(this.JALOUSIE)[slat ? 3 : 2]);
            }
          }
        }
        for (let a = -0.52; a <= 0.52; a += step) {
          for (let z = -2.75; z <= -1.05; z += step) {
            const isBar = Math.abs((a + 10) % 0.22 - 0.11) < 0.032;
            const isCross = Math.abs(z + 1.9) < 0.04;
            if (isBar || isCross) place(c + a, z, this.renderer.rampOf(this.GRILLE)[1], 0.08);
          }
        }
      }
    };
    windows((a, z, col, out = 0.04) => this.renderer.plot(a, this.ROOF_Y + out, z, col), 5, this.ROOF_X);
    windows((a, z, col, out = 0.04) => this.renderer.plot(this.ROOF_X + out, a, z, col), 3, this.ROOF_Y);
  }

  buildRoof() {
    const h = this.PARAPET_H, t = 0.3, step = 0.045;
    this.renderer.box(-this.ROOF_X, this.ROOF_Y - t, 0, this.ROOF_X, this.ROOF_Y, h, this.PLASTER, 1);
    this.renderer.box(this.ROOF_X - t, -this.ROOF_Y, 0, this.ROOF_X, this.ROOF_Y, h, this.PLASTER, 2);
    this.renderer.box(-this.ROOF_X, -this.ROOF_Y, 0, this.ROOF_X, -this.ROOF_Y + t, h, this.PLASTER, 3);
    this.renderer.box(-this.ROOF_X, -this.ROOF_Y, 0, -this.ROOF_X + t, this.ROOF_Y, h, this.PLASTER, 4);

    // 1. Exposed Rebars (Bakal na Nakausli) at Rooftop Corners
    const corners = [
      [-this.ROOF_X + 0.15, this.ROOF_Y - 0.15],
      [this.ROOF_X - 0.15, this.ROOF_Y - 0.15],
      [-this.ROOF_X + 0.15, -this.ROOF_Y + 0.15],
      [this.ROOF_X - 0.15, -this.ROOF_Y + 0.15],
    ];
    for (const [cx, cy] of corners) {
      this.renderer.box(cx - 0.28, cy - 0.28, 0, cx + 0.28, cy + 0.28, h + 0.2, this.CONCRETE, 1);
      for (const [dx, dy] of [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]]) {
        for (let z = h + 0.2; z <= h + 1.25; z += step) {
          this.renderer.plot(cx + dx, cy + dy, z, this.renderer.rampOf(this.REBAR)[Math.floor(z * 12) % 2 ? 2 : 1]);
        }
      }
    }

    // 2. Stairwell Landing with Corrugated Galvanized Iron (Yero) Shed Roof
    this.renderer.box(-12.2, -6.7, 0, -8.4, -3.2, 3.5, this.PLASTER, 5);
    for (let a = -10.9; a <= -9.7; a += step) {
      for (let z = 0; z <= 2.5; z += step) {
        const isFrame = Math.abs(a + 10.3) > 0.54 || z > 2.44;
        this.renderer.plot(a, -3.06, z, this.renderer.rampOf(isFrame ? this.DARK : [160, 115, 75])[Math.floor(a * 4) % 2 ? 2 : 1]);
      }
    }
    for (let x = -12.6; x <= -7.8; x += step) {
      for (let y = -7.2; y <= -2.6; y += step) {
        const slope = 3.65 - (y + 5) * 0.14;
        const wave = Math.sin(x * 18) * 0.04;
        const isEdge = x < -12.4 || x > -8.0 || y > -2.8;
        let yeroCol = isEdge ? this.renderer.rampOf(this.YERO_RUST)[2] : this.renderer.rampOf(this.YERO)[Math.floor(x * 6) % 5 === 0 ? 2 : 3];
        if (this.renderer.noise(x * 2, y * 2) > 0.65) yeroCol = this.renderer.rampOf(this.YERO_RUST)[3];
        this.renderer.plot(x, y, slope + wave, yeroCol);
      }
    }

    // 3. Big Blue Plastic Water Drum (Asul na Drum) & Red Tabo
    const drumX = -8.1, drumY = -2.1, drumR = 0.42, drumH = 1.05;
    for (let t = 0; t < 6.283; t += 0.04) {
      for (let z = 0; z <= drumH; z += step) {
        const nx = Math.cos(t), ny = Math.sin(t);
        this.renderer.plot(
          drumX + nx * drumR, drumY + ny * drumR, z,
          this.renderer.rampOf(this.DRUM)[this.renderer.clamp(Math.round(2.6 - 0.5 * nx + 0.85 * ny) + (z > drumH - 0.08 ? -1 : 0), 0, 4)]
        );
      }
    }
    for (let a = 0; a < 6.283; a += 0.06) {
      for (let q = 0; q < drumR; q += step) {
        this.renderer.plot(drumX + Math.cos(a) * q, drumY + Math.sin(a) * q, drumH - 0.03, this.renderer.rampOf(this.DARK)[1]);
      }
    }
    const taboX = drumX + 0.1, taboY = drumY - 0.08, taboZ = drumH + 0.02;
    for (let t = 0; t < 6.283; t += 0.12) {
      for (let z = 0; z <= 0.22; z += step) {
        this.renderer.plot(taboX + Math.cos(t) * 0.14, taboY + Math.sin(t) * 0.14, taboZ + z, this.renderer.rampOf(this.TABO)[3]);
      }
    }
    for (let d = 0; d <= 0.26; d += step) {
      this.renderer.plot(taboX + 0.14 + d, taboY, taboZ + 0.18, this.renderer.rampOf(this.TABO)[2]);
    }

    // 4. White Plastic Monobloc Chair
    const chairX = -6.6, chairY = -2.1;
    for (const [lx, ly] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
      for (let z = 0; z <= 0.55; z += step) this.renderer.plot(chairX + lx, chairY + ly, z, this.renderer.rampOf(this.PLASTIC_WHITE)[3]);
    }
    this.renderer.box(chairX - 0.26, chairY - 0.26, 0.55, chairX + 0.26, chairY + 0.26, 0.6, this.PLASTIC_WHITE, 14);
    for (let cx = -0.24; cx <= 0.24; cx += step) {
      for (let cz = 0.6; cz <= 1.22; cz += step) {
        const isSlit = Math.abs(cx % 0.1 - 0.05) < 0.02 && cz > 0.72 && cz < 1.1;
        if (!isSlit) this.renderer.plot(chairX + cx, chairY - 0.25, cz, this.renderer.rampOf(this.PLASTIC_WHITE)[2]);
      }
    }

    // 5. Classic Fishbone TV Aerial
    for (let z = 0; z <= 5.5; z += step) this.renderer.plot(6.8, -6.3, z, this.renderer.rampOf(this.DARK)[2]);
    for (const [z, w] of [[5.2, 0.75], [4.7, 1.1], [4.2, 1.45], [3.7, 0.9]]) {
      for (let a = -w; a <= w; a += step) this.renderer.plot(6.8 + a, -6.3 - a * 0.3, z, this.renderer.rampOf(this.DARK)[2]);
    }

    // 6. Tropical Plants: Bougainvillea, Calamansi, Recycled Paint Pail Pots
    for (const [x, y, r, plantType] of [
      [-3, 6.1, 0.5, 'bougainvillea'],
      [-1.6, 6.15, 0.42, 'calamansi'],
      [5.6, 6.1, 0.46, 'bougainvillea'],
      [11.5, -2.2, 0.5, 'calamansi'],
      [11.55, -0.9, 0.4, 'green'],
    ]) {
      const isPail = plantType === 'calamansi';
      this.renderer.box(x - r * 0.8, y - r * 0.8, 0, x + r * 0.8, y + r * 0.8, r * 1.4, isPail ? this.PLASTIC_WHITE : this.POT, x | 0);
      if (isPail) {
        for (let px = x - r * 0.82; px <= x + r * 0.82; px += step) {
          this.renderer.plot(px, y + r * 0.82, r * 0.7, this.renderer.rampOf(this.DRUM)[3]);
        }
      }
      for (let k = 0; k < 16; k++) {
        const a = this.renderer.hash(k, x * 3) * 6.28, d = this.renderer.hash(k, y * 5) * r;
        const lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d, lz = r * 1.7 + this.renderer.hash(k, 9) * r;
        this.renderer.sphere(lx, ly, lz, 0.22, this.LEAF, 'rough');
        if (plantType === 'bougainvillea' && k % 2 === 0) {
          this.renderer.sphere(lx + 0.05, ly + 0.05, lz + 0.08, 0.12, this.BOUGAINVILLEA, 'solid');
        } else if (plantType === 'calamansi' && k % 3 === 0) {
          this.renderer.sphere(lx + 0.04, ly + 0.04, lz + 0.06, 0.09, this.CALAMANSI, 'solid');
        }
      }
      this.renderer.castShadow(x, y, r, r);
    }
    this.renderer.box(-11.7, 4.6, 0, -10.5, 5.8, 0.9, this.POT, 12);
    this.renderer.growTree(-11.1, 5.2, 0.58, 200, 300);

    // 7. Sampayan Poles & Nylon Ropes
    for (const y of this.LINE_YS) {
      for (const x of [-this.POLE_X, this.POLE_X]) {
        this.renderer.box(x - 0.08, y - 0.08, 0, x + 0.08, y + 0.08, this.LINE_Z + 0.25, this.POLE, 13);
        for (let z = 0.3; z < this.LINE_Z; z += 0.4) this.renderer.castShadow(x, y, z, 0.12, 1, 0);
      }
      for (let x = -this.POLE_X; x <= this.POLE_X; x += 0.04) {
        this.renderer.plot(x, y, this.lineZ(x), this.renderer.rampOf(this.ROPE)[3]);
      }
      for (let x = -this.POLE_X; x <= this.POLE_X; x += 0.4) {
        this.renderer.castShadow(x, y, this.lineZ(x), 0.05, 1, 0);
      }
    }

    // 8. The Planggana / Batya Ground Shadow (tub is drawn dynamically in drawBatya)
    this.renderer.castShadow(this.BASKET.x, this.BASKET.y, 0.5, this.BASKET.r);

    // Shed and parapet shadows
    for (let x = -12.2; x <= -8.4; x += 0.5) {
      for (let y = -6.7; y <= -3.2; y += 0.5) {
        for (let z = 0.4; z < 3.5; z += 0.6) this.renderer.castShadow(x, y, z, 0.5);
      }
    }
    for (let z = 0.4; z < 3; z += 0.5) this.renderer.castShadow(drumX, drumY, z, 0.4);
    for (let x = -this.ROOF_X; x <= this.ROOF_X; x += 0.4) {
      for (const z of [0.1, 0.35, 0.55]) this.renderer.castShadow(x, -this.ROOF_Y + 0.15, z, 0.22);
    }
  }

  bake() {
    this.renderer.zb.fill(-1e9);
    this.renderer.pix.fill(this.renderer.rgb(255, 255, 255));
    const W = this.renderer.width, H = this.renderer.height;

    for (let iy = 0; iy < H; iy++) {
      for (let ix = 0; ix < W; ix++) {
        const g = this.renderer.unproject(ix + 0.5, iy + 0.5);
        const c = this.groundColor(g.x, g.y, ix, iy);
        const i = iy * W + ix;
        if (!c) continue;
        this.renderer.pix[i] = c;
        this.renderer.ground[i] = 1;
        const v = g.x * this.renderer.yawSin + g.y * this.renderer.yawCos;
        this.renderer.zb[i] = v * this.renderer.cos;
        this.puddle[i] = this.renderer.noise(g.x * 0.55 + 3, g.y * 0.8 + 7);
      }
    }

    this.renderer.groundZ.set(this.renderer.zb);
    this.buildWalls();
    this.buildRoof();
    this.renderer.bakeOcclusion();
    this.renderer.staticShadow.set(this.renderer.shadowMask);
    this.renderer.applyShadows(this.renderer.groundZ);
    this.renderer.bakedPix.set(this.renderer.pix);
    this.renderer.bakedZ.set(this.renderer.zb);
  }

  /* ---------- Laundry Management ---------- */
  hangWashing() {
    this.items = [];
    this.LINE_YS.forEach((y, line) => {
      const kinds = this.shuffle(this.LINE_SETS[line].slice());
      const total = kinds.reduce((sum, k) => sum + this.KINDS[k].w, 0);
      const gap = Math.min(1.1, (this.SPAN - total) / Math.max(1, kinds.length - 1));
      let x = -(total + gap * (kinds.length - 1)) / 2;
      for (const kind of kinds) {
        const spec = this.KINDS[kind], cx = x + spec.w / 2;
        const palette = this.getKindPalette(kind);
        this.items.push({
          id: this.items.length + 1,
          kind,
          ...spec,
          cx,
          ly: y,
          x: cx,
          y,
          z: this.lineZ(cx),
          vx: 0,
          vy: 0,
          vz: 0,
          state: 'line',
          wet: 0,
          pop: 0,
          rot: 0,
          spin: 0,
          phase: Math.random() * 6.28,
          color: palette.color,
          accent: palette.accent,
          sipitColor: this.SIPIT_COLORS[Math.floor(Math.random() * this.SIPIT_COLORS.length)],
          isGolden: false,
          totalPins: spec.pins || 1,
          pinsRemaining: spec.pins || 1,
          weight: spec.weight || 'medium',
          soiled: null,
          smokeExposure: 0,
        });
        x += spec.w + gap;
      }
    });

    // Spawn 1 Gintong Sipit (golden clothespin) power-up per round
    if (this.items.length > 0) {
      const gItem = this.items[Math.floor(Math.random() * this.items.length)];
      gItem.isGolden = true;
    }

    this.onItemCountChange(0, this.items.length);
  }

  inside(item, u, v) {
    const w = item.w, h = item.h, a = Math.abs(u);
    if (item.kind === 'floral_blanket') {
      return v <= h - 0.03 + Math.sin(u * 14) * 0.02;
    }
    if (item.kind === 'school_uniform') {
      if (v < h * 0.44) {
        if (v < 0.14 && a < 0.1) return false;
        if (v < h * 0.3) return a < w * 0.48;
        return a < w * 0.33;
      }
      const skirtProgress = (v - h * 0.44) / (h * 0.56);
      return a < w * (0.33 + 0.16 * skirtProgress);
    }
    if (item.kind === 'daster') {
      if (v < 0.16 && a < 0.16) return false;
      if (v > 0.06 && v < 0.4 && a > w * 0.33) return false;
      const dressProgress = v / h;
      const hemRuffle = v <= h - 0.04 + Math.sin(u * 20) * 0.03;
      return hemRuffle && a < w * (0.28 + 0.22 * dressProgress);
    }
    if (item.kind === 'sando') {
      if (v < 0.22 && a < 0.18) return false;
      if (v > 0.05 && v < 0.52 && a > w * 0.28) return false;
      return a < w * 0.38;
    }
    if (item.kind === 'basketball_jersey') {
      if (v < 0.2 && a < 0.16) return false;
      if (v > 0.05 && v < 0.48 && a > w * 0.32) return false;
      return a < w * 0.4;
    }
    if (item.kind === 'maong') {
      return v < h * 0.34 || a > 0.065;
    }
    if (item.kind === 'short_pambahay') {
      if (v > h * 0.42 && a <= 0.055) return false;
      if (v > h * 0.78 && a > w * 0.38) return false;
      return a < w * 0.45;
    }
    if (item.kind === 'bimpo') {
      return true;
    }
    return true;
  }

  getClothColor(item, u, v, level) {
    const w = item.w, h = item.h, a = Math.abs(u);
    let rgbColor = item.color;

    if (item.kind === 'floral_blanket') {
      const gridU = (u + 20) % 0.85 - 0.425;
      const gridV = (v + 20) % 0.85 - 0.425;
      const dist = Math.sqrt(gridU * gridU + gridV * gridV);
      const angle = Math.atan2(gridV, gridU);
      const petalDist = 0.21 + 0.045 * Math.sin(angle * 5);

      if (v > h - 0.18) {
        const band = Math.floor(v * 28) % 2;
        rgbColor = band ? [195, 42, 60] : [245, 210, 80];
      } else if (dist < 0.065) {
        rgbColor = [248, 215, 45];
      } else if (dist < petalDist) {
        const innerPetal = dist < petalDist * 0.6;
        rgbColor = innerPetal ? [185, 25, 45] : [230, 60, 85];
      } else if (dist < petalDist + 0.14 && Math.sin(angle * 3 + 1.2) > 0.35) {
        rgbColor = [45, 125, 55];
      } else {
        rgbColor = item.color;
      }
    } else if (item.kind === 'school_uniform') {
      if (v < h * 0.44) {
        if (a < 0.08 && v < h * 0.36) {
          rgbColor = item.accent;
        } else if (u > 0.14 && u < 0.26 && v > h * 0.2 && v < h * 0.27) {
          rgbColor = item.accent;
        } else if (v < 0.08) {
          rgbColor = [225, 225, 232];
        } else {
          rgbColor = [246, 246, 250];
        }
      } else {
        const pleat = Math.floor(u * 12 + 40) % 2;
        rgbColor = pleat ? item.accent : [item.accent[0] * 0.75 | 0, item.accent[1] * 0.75 | 0, item.accent[2] * 0.75 | 0];
      }
    } else if (item.kind === 'daster') {
      if (v > h - 0.14) {
        rgbColor = item.accent;
      } else if (v < 0.12 && a < w * 0.3) {
        rgbColor = item.accent;
      } else {
        const pu = (u + 20) % 0.3 - 0.15;
        const pv = (v + 20) % 0.3 - 0.15;
        const pdist = pu * pu + pv * pv;
        if (pdist < 0.0035) {
          rgbColor = [255, 235, 100];
        } else if (pdist < 0.0075) {
          rgbColor = item.accent;
        } else {
          rgbColor = item.color;
        }
      }
    } else if (item.kind === 'sando') {
      if ((v < 0.06 && a > 0.18) || (v < 0.24 && a < 0.2) || (a > w * 0.26 && v < 0.54)) {
        rgbColor = item.accent || [60, 95, 180];
      } else {
        const rib = Math.floor(u * 26 + 40) % 2;
        rgbColor = rib ? [248, 248, 252] : [236, 236, 242];
      }
    } else if (item.kind === 'basketball_jersey') {
      if (v < 0.08 || (a > w * 0.3 && v < 0.5)) {
        rgbColor = [245, 215, 45];
      } else if (v > h * 0.38 && v < h * 0.62) {
        const isNum = (a < 0.07 && v > h * 0.42 && v < h * 0.58) || (u > -0.07 && u < 0.07 && v > h * 0.42 && v < h * 0.46);
        rgbColor = isNum ? [255, 255, 255] : item.accent;
      } else {
        rgbColor = item.color;
      }
    } else if (item.kind === 'maong') {
      if (v < 0.14) {
        const loop = Math.floor(a * 8) % 2 === 0;
        rgbColor = loop ? [35, 60, 105] : [55, 88, 145];
      } else if (a > 0.055 && a < 0.085) {
        rgbColor = [215, 145, 45];
      } else if (a > w * 0.42) {
        rgbColor = [215, 145, 45];
      } else {
        const wash = (v > h * 0.45 && v < h * 0.7 && a < w * 0.3) ? 1.15 : 1.0;
        rgbColor = [item.color[0] * wash | 0, item.color[1] * wash | 0, item.color[2] * wash | 0];
      }
    } else if (item.kind === 'short_pambahay') {
      if (v < 0.12) {
        rgbColor = [item.color[0] * 0.8 | 0, item.color[1] * 0.8 | 0, item.color[2] * 0.8 | 0];
      } else if (a > w * 0.35 || v > h - 0.08) {
        rgbColor = [248, 248, 252];
      } else {
        rgbColor = item.color;
      }
    } else if (item.kind === 'bimpo') {
      if (v > h * 0.38 && v < h * 0.62) {
        const letter = Math.floor(u * 14 + 40) % 3 === 0 && (v > h * 0.44 && v < h * 0.56);
        rgbColor = letter ? [255, 255, 255] : [215, 32, 42];
      } else if (v < 0.08 || v > h - 0.08) {
        rgbColor = [215, 32, 42];
      } else {
        const waffle = (Math.floor(u * 20 + 40) + Math.floor(v * 20)) % 2;
        rgbColor = waffle ? [248, 246, 242] : [238, 236, 230];
      }
    }

    if (item.soiled === 'smoke') {
      rgbColor = [
        Math.round(rgbColor[0] * 0.45 + 32),
        Math.round(rgbColor[1] * 0.45 + 28),
        Math.round(rgbColor[2] * 0.45 + 24),
      ];
    } else if (item.soiled === 'paw') {
      rgbColor = [
        Math.round(rgbColor[0] * 0.65 + 40),
        Math.round(rgbColor[1] * 0.55 + 26),
        Math.round(rgbColor[2] * 0.45 + 16),
      ];
    }

    return this.renderer.rampOf(rgbColor)[level];
  }

  drawCloth(item, t) {
    const pinned = item.state === 'line' || item.state === 'loose';
    const flying = item.state === 'flying' || item.state === 'falling' || item.state === 'tossed';
    const flat = item.state === 'ground';
    const gusty = 1 + this.stormLevel() * 0.9 + this.gustGlow * 1.2;
    const amp = item.state === 'loose' ? 0.55 : flying || item.state === 'held' ? 0.4 : 0.12 * gusty;
    const speed = item.state === 'loose' ? 9 : 3 + this.stormLevel() * 2;
    const cr = Math.cos(item.rot), sr = Math.sin(item.rot), step = 0.055;
    const dryness = Math.floor(item.wet * 1.8);
    const trailX = item.state === 'held' ? this.renderer.clamp(item.vx * 0.05, -0.7, 0.7) : 0;
    const W = this.renderer.width, H = this.renderer.height;

    for (let u = -item.w / 2; u <= item.w / 2; u += step) {
      for (let v = 0; v <= item.h; v += step) {
        if (!this.inside(item, u, v)) continue;
        const wave = u * 3.2 + t * speed + item.phase + v * 1.2, s = Math.sin(wave), c = Math.cos(wave);
        let px, py, pz;
        if (flat) {
          px = item.x + u; py = item.y + v - item.h / 2; pz = 0.05 + (s + 1) * 0.03;
        } else {
          const reach = pinned ? v / item.h + 0.12 : 1;
          px = item.x + u * cr - v * sr - trailX * v;
          py = item.y + s * amp * reach;
          pz = item.z - v * cr - u * sr;
          if (pz < 0.05) pz = 0.05;
        }
        const level = this.renderer.clamp(3 + Math.round(c * 1.1) - dryness, 0, 4);
        const p = this.renderer.project(px, py, pz), ix = p.sx | 0, iy = p.sy | 0;
        if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
        const i = iy * W + ix;
        if (p.d <= this.renderer.zb[i]) continue;
        this.renderer.zb[i] = p.d;
        this.renderer.pix[i] = this.getClothColor(item, u, v, level);
        this.itemBuf[i] = item.id;
      }
    }

    if (pinned) {
      const total = item.totalPins || (item.kind === 'bimpo' || item.kind === 'sando' ? 1 : 2);
      const remaining = item.pinsRemaining != null ? item.pinsRemaining : total;
      for (let k = 0; k < total; k++) {
        if (remaining < total && k === 0) continue; // One pin already removed
        const a = total === 1 ? 0 : (k / (total - 1) - 0.5) * item.w * 0.82;
        let sipit;
        if (item.isGolden) {
          const glow = (Math.sin(this.time * 9 + k * 1.5) + 1) * 0.5;
          sipit = this.renderer.rgb(255, Math.round(200 + glow * 55), Math.round(30 + glow * 190));
        } else {
          sipit = item.state === 'loose' ? this.renderer.rgb(255, 214, 10) : item.sipitColor;
        }
        this.renderer.plot(item.x + a, item.y + 0.04, item.z + 0.06, sipit);
        const pp = this.renderer.project(item.x + a, item.y + 0.04, item.z + 0.06);
        const px = pp.sx | 0, py = pp.sy | 0;
        if (px >= 0 && py >= 0 && px < W && py < H) {
          this.itemBuf[py * W + px] = item.id;
        }
        // Shimmer glint for Gintong Sipit
        if (item.isGolden && (Math.floor(this.time * 6 + k) % 2 === 0)) {
          this.renderer.plot(item.x + a, item.y + 0.05, item.z + 0.12, this.renderer.rgb(255, 255, 220));
        }
      }
    }

    if (!flat) {
      const samples = item.kind === 'bimpo' ? 1 : (item.kind === 'floral_blanket' ? 4 : 3);
      for (let k = 0; k < samples; k++) {
        const a = samples === 1 ? 0 : (k / (samples - 1) - 0.5) * item.w * 0.75;
        this.renderer.castShadow(item.x + a, item.y, Math.max(0.05, item.z - item.h / 2), Math.max(0.22, item.h * 0.34), 1, 0.4);
      }
    }
  }

  drawBatya(bounce = 0) {
    const s = bounce > 0 ? Math.sin(bounce * Math.PI) : 0;
    const r = this.BASKET.r * (1 + s * 0.24);
    const h = this.BASKET.h * (1 - s * 0.30);
    const step = 0.05;
    for (let t = 0; t < 6.283; t += 0.04) {
      for (let z = 0; z <= h; z += step) {
        const nx = Math.cos(t), ny = Math.sin(t);
        const cr = r * (0.88 + 0.14 * (z / h));
        const isLip = z > h - 0.12;
        this.renderer.plot(
          this.BASKET.x + nx * cr, this.BASKET.y + ny * cr, z,
          this.renderer.rampOf(this.BATYA)[this.renderer.clamp(Math.round(2.6 - 0.5 * nx + 0.85 * ny) + (isLip ? 1 : 0), 0, 4)]
        );
      }
    }
    for (let a = 0; a < 6.283; a += 0.08) {
      for (let q = 0; q < r * 0.88; q += step) {
        this.renderer.plot(this.BASKET.x + Math.cos(a) * q, this.BASKET.y + Math.sin(a) * q, h - 0.04, this.renderer.rampOf(this.BATYA)[1]);
      }
    }
  }

  drawBouncingBatya(bounce) {
    this.drawBatya(bounce);
  }

  drawPile() {
    const bankedCurrent = this.items.filter(i => i.state === 'basket');
    const allBanked = (this.cumBankedItems || []).concat(bankedCurrent);
    const s = this.basketBounce > 0 ? Math.sin(this.basketBounce * Math.PI) : 0;
    const radScale = 1 + s * 0.22;
    const hScale = 1 - s * 0.28;

    allBanked.forEach((item, k) => {
      const a = this.renderer.hash(k, 51) * 6.28, d = this.renderer.hash(k, 52) * this.BASKET.r * 0.55 * radScale;
      this.renderer.sphere(
        this.BASKET.x + Math.cos(a) * d,
        this.BASKET.y + Math.sin(a) * d,
        (this.BASKET.h + Math.min(1.1, k * 0.06) + this.renderer.hash(k, 53) * 0.2) * hScale,
        (item.kind === 'bimpo' ? 0.22 : item.kind === 'floral_blanket' ? 0.46 : 0.36) * radScale,
        item.color,
        'solid'
      );
    });
  }

  /* ---------- Nanay Character Rendering ---------- */
  drawNanay(px, py, yaw, pose) {
    const fx = Math.cos(yaw), fy = Math.sin(yaw), sx = -fy, sy = fx;
    const base = pose.z || 0, k = pose.scale || 1.35;
    const P = (a, b, c) => [px + (fx * a + sx * b) * k, py + (fy * a + sy * b) * k, c * k + base];

    const addSphere = (pos, r, col) => this.renderer.dynamicAdd(pos, pos, r * k, r * k, () => col);
    const addCapsule = (p0, p1, r0, r1, colorOrFn) => {
      const fn = typeof colorOrFn === 'function' ? colorOrFn : () => colorOrFn;
      this.renderer.dynamicAdd(p0, p1, r0 * k, r1 * k, fn);
    };

    const SKIN = [218, 162, 122];
    const HAIR = [22, 20, 22];
    const TSINELAS_RED = [228, 38, 46];
    const TSINELAS_WHITE = [245, 245, 245];
    const DASTER_TEAL = [16, 144, 174];
    const FLOWER_PINK = [248, 92, 142];
    const FLOWER_YELLOW = [255, 196, 42];
    const FLOWER_WHITE = [255, 255, 255];
    const LEAF_GREEN = [46, 152, 68];
    const LIP_ROSE = [210, 80, 85];
    const SIPIT_YELLOW = [255, 215, 0];

    // 1. FEET & RED TSINELAS
    const footL = P(0.03, 0.12, 0.07), footR = P(0.03, -0.12, 0.07);
    addCapsule(P(-0.07, 0.12, 0.04), P(0.13, 0.12, 0.04), 0.085, 0.075, TSINELAS_RED);
    addCapsule(P(-0.07, -0.12, 0.04), P(0.13, -0.12, 0.04), 0.085, 0.075, TSINELAS_RED);
    addCapsule(P(-0.07, 0.12, 0.02), P(0.13, 0.12, 0.02), 0.07, 0.06, TSINELAS_WHITE);
    addCapsule(P(-0.07, -0.12, 0.02), P(0.13, -0.12, 0.02), 0.07, 0.06, TSINELAS_WHITE);

    // 2. LOWER LEGS
    const kneeL = P(0, 0.12, 0.54), kneeR = P(0, -0.12, 0.54);
    addCapsule(kneeL, footL, 0.08, 0.07, SKIN);
    addCapsule(kneeR, footR, 0.08, 0.07, SKIN);

    // 3. THE ICONIC FLORAL DASTER (Turquoise A-line with scattered flowers & shoulder ribbons)
    const hemZ = 0.54, hipZ = 0.96, bustZ = 1.34;
    addCapsule(P(0, 0, bustZ), P(0, 0, hipZ), 0.24, 0.27, DASTER_TEAL);
    addCapsule(P(0, 0, hipZ), P(0, 0, hemZ), 0.27, 0.30, DASTER_TEAL);
    addCapsule(P(0, 0.08, hemZ), P(0, -0.08, hemZ), 0.28, 0.28, DASTER_TEAL);

    const flowers = [
      [0.24, 0.08, 1.22, FLOWER_PINK, 0.042],
      [0.25, 0.11, 1.21, FLOWER_WHITE, 0.028],
      [0.24, -0.07, 1.25, FLOWER_YELLOW, 0.042],
      [0.25, -0.09, 1.24, LEAF_GREEN, 0.026],
      [0.27, 0.02, 1.08, FLOWER_PINK, 0.044],
      [0.27, 0.04, 1.07, FLOWER_YELLOW, 0.028],
      [0.27, -0.12, 1.02, FLOWER_WHITE, 0.04],
      [0.28, 0.12, 0.92, FLOWER_YELLOW, 0.044],
      [0.28, 0.14, 0.91, LEAF_GREEN, 0.028],
      [0.28, -0.02, 0.88, FLOWER_PINK, 0.046],
      [0.29, -0.04, 0.87, FLOWER_WHITE, 0.028],
      [0.29, 0.08, 0.74, FLOWER_WHITE, 0.044],
      [0.30, -0.10, 0.72, FLOWER_YELLOW, 0.046],
      [0.30, -0.12, 0.71, LEAF_GREEN, 0.03],
      [0.30, 0.02, 0.64, FLOWER_PINK, 0.048],
      [0.30, 0.04, 0.63, FLOWER_YELLOW, 0.028],
      [0.31, -0.07, 0.58, FLOWER_WHITE, 0.044],
      [0.31, 0.11, 0.58, FLOWER_PINK, 0.044],
    ];
    for (const [df, ds, dz, col, rad] of flowers) {
      addSphere(P(df, ds, dz), rad, col);
    }

    // Scooped neckline
    addSphere(P(0.10, 0, 1.40), 0.135, SKIN);

    // Shoulder straps & tied ribbon bows
    const shL = P(0, 0.24, 1.44), shR = P(0, -0.24, 1.44);
    addCapsule(P(0, 0.22, 1.35), shL, 0.075, 0.07, DASTER_TEAL);
    addCapsule(P(0, -0.22, 1.35), shR, 0.075, 0.07, DASTER_TEAL);
    addSphere(P(0.02, 0.24, 1.48), 0.075, DASTER_TEAL);
    addSphere(P(0.04, 0.28, 1.52), 0.055, FLOWER_PINK);
    addSphere(P(0.02, -0.24, 1.48), 0.075, DASTER_TEAL);
    addSphere(P(0.04, -0.28, 1.52), 0.055, FLOWER_PINK);

    // 4. NECK & HEAD
    const neck = P(0, 0, 1.48);
    const head = P(0, 0, 1.74);
    addCapsule(neck, head, 0.09, 0.105, SKIN);
    addSphere(head, 0.205, SKIN);

    const eyeL = P(0.18, 0.06, 1.75);
    const eyeR = P(0.18, -0.06, 1.75);
    addSphere(eyeL, 0.035, HAIR);
    addSphere(eyeR, 0.035, HAIR);
    addSphere(P(0.19, 0, 1.67), 0.038, LIP_ROSE);

    // Jet black hair & high Pusod bun with pink scrunchie
    addSphere(P(-0.04, 0, 1.78), 0.195, HAIR);
    addSphere(P(0, 0.14, 1.76), 0.11, HAIR);
    addSphere(P(0, -0.14, 1.76), 0.11, HAIR);
    const bunPos = P(-0.02, 0, 1.98);
    addSphere(bunPos, 0.125, HAIR);
    addSphere(P(0, 0, 1.92), 0.065, FLOWER_PINK);
    addSphere(P(0.03, 0.05, 1.94), 0.045, FLOWER_PINK);

    // 5. ARMS & CALLING GESTURE
    // Left arm: Nakapamewang (hand on hip)
    const elbowL = P(-0.04, 0.38, 1.18);
    const handL = P(0.03, 0.23, 0.98);
    addCapsule(shL, elbowL, 0.085, 0.075, SKIN);
    addCapsule(elbowL, handL, 0.075, 0.065, SKIN);

    // Right arm: animated based on storm progression
    const isWaving = pose.armR > 0.5;
    let elbowR, handR;
    if (isWaving) {
      elbowR = P(0.08, -0.34, 1.72);
      handR = P(0.12, -0.36, 2.06);
      addCapsule(shR, elbowR, 0.085, 0.075, SKIN);
      addCapsule(elbowR, handR, 0.075, 0.065, SKIN);
    } else {
      elbowR = P(0.02, -0.32, 1.14);
      handR = P(0.05, -0.26, 0.86);
      addCapsule(shR, elbowR, 0.085, 0.075, SKIN);
      addCapsule(elbowR, handR, 0.075, 0.065, SKIN);
      addCapsule(P(0.05, -0.26, 0.83), P(0.05, -0.26, 0.90), 0.035, 0.03, SIPIT_YELLOW);
    }

    return handR;
  }

  /* ---------- Gameplay Simulation & Physics ---------- */
  startRound(roundNum) {
    this.round = roundNum;
    if (this.audio && typeof this.audio.setRound === 'function') {
      this.audio.setRound(roundNum);
    }
    const rCfg = this.ROUNDS[roundNum - 1] || this.ROUNDS[0];
    this.STORM_FROM = rCfg.stormFrom;
    this.STORM_TO = rCfg.stormTo;
    this.RAIN_FROM = rCfg.rainFrom;
    this.RAIN_TO = rCfg.rainTo;
    this.GAME_LENGTH = rCfg.gameLength;
    this.gustIn = rCfg.gustMax;

    this.t = 0;
    this.held = null;
    this.heldItems = [];
    this.pointerHistory = [];
    this.auto = false;
    this.pointer = null;
    this.pointerDownPos = null;
    this.pointerDownTime = 0;
    this.roundTransitionTimer = 0;
    this.wetness = 0;
    this.drops.length = 0;
    this.splashes.length = 0;
    this.freezeTimer = 0;
    this.rainWarned = false;
    this.bolt = null;
    this.boltIn = roundNum === 3 ? 7 : (roundNum === 2 ? 14 : 22);

    // Reset hazards for new round
    this.cat = {
      active: false,
      state: 'inactive',
      x: -11,
      y: 5.8,
      z: 0.6,
      vx: 0,
      vy: 0,
      targetItem: null,
      targetLine: 1,
      cooldown: 5.0 + Math.random() * 3,
      timer: 0,
      animTime: 0,
      facing: 1,
      napTimer: 0,
    };
    this.smokeEvent = {
      active: false,
      timer: 0,
      duration: 8.5,
      lineIdx: 1,
      nextSmokeIn: 10.0 + Math.random() * 4,
      particles: [],
    };
    this.utos = {
      active: false,
      targetItemId: null,
      timer: 0,
      maxTimer: 6.0,
      cooldown: 6.0 + Math.random() * 3,
      completed: false,
    };
    if (this.onUtosChange) this.onUtosChange(null);

    this.hangWashing();
    this.showRoundBanner(roundNum, false);
    this.onRoundChange(roundNum, this.maxRounds);
    this.updateWeatherStatus();
  }

  start() {
    this.phase = 'play';
    this.paused = false;
    this.confirmingQuit = false;
    this.score = 0;
    this.held = null;
    this.heldItems = [];
    this.pointerHistory = [];
    this.swishScores = 0;
    this.utosCount = 0;
    this.tsinelasMeter = 0;
    this.tsinelasRage = false;
    this.tsinelasShake = 0;
    this.auto = false;
    this.pointer = null;
    this.pointerDownPos = null;
    this.pointerDownTime = 0;
    this.gustGlow = 0;
    this.flash = 0;
    this.overT = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.maxCombo = 1;
    this.airRescues = 0;
    this.basketBounce = 0;
    this.screenShake = 0;
    this.floaters.length = 0;
    this.cumDry = 0;
    this.cumWet = 0;
    this.cumLost = 0;
    this.cumTotal = 0;
    this.cumBanked = 0;
    this.cumBankedItems = [];
    this.roundTransitionTimer = 0;

    this.startRound(1);
    this.audio.startBgm();
    this.onScoreChange(0);
    this.onComboChange(1, 1);
    this.onTsinelasChange(0, false);
    this.onPauseChange(false);
    if (this.onQuitConfirmChange) this.onQuitConfirmChange(false);
    this.onPhaseChange('play');
  }

  togglePause() {
    if (this.phase !== 'play') return false;
    this.paused = !this.paused;
    this.confirmingQuit = false;
    this.audio.ensureContext();
    this.audio.playSfx('pop');
    if (this.paused) {
      this.audio.setWeather(0, 0);
      this.audio.stopBgm();
    } else {
      this.audio.startBgm();
      this.audio.setWeather(this.stormLevel(), this.rainLevel());
    }
    if (this.onQuitConfirmChange) {
      this.onQuitConfirmChange(false);
    }
    this.onPauseChange(this.paused);
    return this.paused;
  }

  resume() {
    if (this.phase === 'play' && this.paused) {
      this.togglePause();
    }
  }

  pause() {
    if (this.phase === 'play' && !this.paused) {
      this.togglePause();
    }
  }

  requestQuitConfirm() {
    if (this.phase !== 'play' || !this.paused) return;
    this.confirmingQuit = true;
    this.audio.ensureContext();
    this.audio.playSfx('pop');
    if (this.onQuitConfirmChange) {
      this.onQuitConfirmChange(true);
    }
  }

  cancelQuitConfirm() {
    if (!this.confirmingQuit) return;
    this.confirmingQuit = false;
    this.audio.ensureContext();
    this.audio.playSfx('pop');
    if (this.onQuitConfirmChange) {
      this.onQuitConfirmChange(false);
    }
  }

  confirmQuitToTitle() {
    this.confirmingQuit = false;
    if (this.onQuitConfirmChange) {
      this.onQuitConfirmChange(false);
    }
    this.audio.ensureContext();
    this.audio.playSfx('chime');
    this.resetToTitle();
  }

  restart() {
    if (this.phase !== 'play' && this.phase !== 'over') return;
    this.audio.ensureContext();
    this.start();
  }

  over() {
    this.endGame();
  }

  bank(item = this.held) {
    if (!item) return;
    if (this.held === item) {
      this.held = null;
      this.auto = false;
    }
    item.state = 'basket';
    this.basketBounce = 1.0;

    // Combo streak management (< 1.6s window)
    if (this.comboTimer > 0) {
      this.combo = Math.min(5, this.combo + 1);
    } else {
      this.combo = 1;
    }
    this.comboTimer = 1.6;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    // Screen shake on heavy garments (vintage floral blanket, wet maong)
    if (item.kind === 'floral_blanket' || item.kind === 'maong') {
      this.screenShake = 0.35;
    }

    // Score calculation with combo multiplier & soiled penalty
    const soilMultiplier = item.soiled ? 0.5 : 1.0;
    const basePoints = Math.round(item.value * (1 - item.wet * 0.7) * soilMultiplier * 10) / 10;
    const mult = this.combo;
    const pointsGained = Math.round(basePoints * mult * 10) / 10;
    this.score = Math.round((this.score + pointsGained) * 10) / 10;

    // Clean dry clothes appease Nanay
    if (item.wet < 0.25 && !item.soiled) {
      this.adjustTsinelasMeter(-3);
    }

    // Check Urgent Utos completion
    if (this.utos && this.utos.active && (item.id === this.utos.targetItemId || item === this.utos.item)) {
      this.completeUtos(item);
    }

    this.audio.playSfx('drop', this.combo);
    this.onScoreChange(this.score);
    this.onComboChange(this.combo, mult);

    // Compact floating score popup anchored near the balde base (away from hanging clothes)
    const p = this.renderer.project(this.BASKET.x, this.BASKET.y, 0.3);
    const sx = p.sx + (Math.random() - 0.5) * 8;
    const sy = p.sy + 10;

    let floaterMsg = `+${pointsGained}`;
    if (item.soiled) {
      floaterMsg += this.currentLang === 'tl' ? ' (MADUMI)' : ' (SOILED)';
    }
    if (this.combo > 1) {
      let col = '#00d8ff';
      if (this.combo === 3) col = '#ffd700';
      else if (this.combo === 4) col = '#ff9800';
      else if (this.combo >= 5) col = '#ff2a6d';

      this.addFloater(`${floaterMsg} x${this.combo}!`, sx, sy, col, 6);
    } else {
      this.addFloater(floaterMsg, sx, sy, item.soiled ? '#f87171' : '#fffefb', 6);
    }

    // Live Nanay speech reaction on high combo
    if (this.combo >= 3) {
      const cheerTl = this.combo >= 4 ? 'Yan, ganyan Nak! Ilagay mo na lahat!' : 'Aba, bilis ng kamay ah! Parang kidlat!';
      const cheerEn = this.combo >= 4 ? "That's it! Bring them all inside!" : 'Whoa, fast hands! Like lightning!';
      this.setNanaySpeech(cheerTl, cheerEn, 2.0, 'cheer');
    }

    const saved = this.items.filter(i => i.state === 'basket').length;
    this.onItemCountChange(saved, this.items.length);

    // Multi-Salba cascade banking
    if (this.heldItems && this.heldItems.length > 0) {
      const remainingItems = this.heldItems.slice();
      this.heldItems = [];
      remainingItems.forEach(extra => this.bank(extra));
    }
  }

  gust() {
    const storm = this.stormLevel(), count = 1 + Math.round(storm * 2);
    const hanging = this.shuffle(this.items.filter(i => i.state === 'line'));
    this.gustGlow = 1;
    this.audio.playSfx('gust');
    for (const item of hanging.slice(0, count)) {
      item.state = 'loose';
      item.pop = 0.9;
    }
    for (const item of this.items) {
      if (item.state === 'ground' && Math.random() < 0.5) this.launch(item);
    }

    // Live Nanay reaction to sudden wind gusts
    const gustQuotesTl = [
      'Nak, unahin mo yung uniporme at makakapal!',
      'Hala Nak, yung kumot nililipad na!',
      'Nak, bilis! Tanggalin mo na sa sampayan!',
    ];
    const gustQuotesEn = [
      'Grab the uniforms and thick clothes first!',
      'Oh no, the blanket is flying away!',
      'Hurry up! Pull them off the line!',
    ];
    const qIdx = Math.floor(Math.random() * gustQuotesTl.length);
    this.setNanaySpeech(gustQuotesTl[qIdx], gustQuotesEn[qIdx], 2.2, 'urgent');
  }

  launch(item) {
    const side = Math.abs(item.x) > 3 ? -Math.sign(item.x) : (Math.random() < 0.5 ? -1 : 1);
    const a = (Math.random() - 0.5) * 0.7, speed = 3.2 + this.stormLevel() * 1.8;
    item.state = 'flying';
    item.vx = side * Math.cos(a) * speed;
    item.vy = Math.sin(a) * speed;
    item.spin = (Math.random() - 0.5) * 2.6;
    item.z = Math.max(item.z, 2.4);
    item.flightTimer = 2.4 + Math.random() * 1.0;
    item.wasBlown = true;
  }

  strike() {
    this.flash = 1;
    this.screenShake = 0.55;
    const x0 = Math.random() < 0.5 ? 40 + Math.random() * 50 : 270 + Math.random() * 50;
    const points = [[x0, 44]];
    let x = x0, y = 44;
    while (y < 150) {
      x += (Math.random() - 0.5) * 18;
      y += 8 + Math.random() * 10;
      points.push([x, y]);
    }
    this.bolt = points;
    this.audio.playSfx('thunder');
  }

  pointerWorld() {
    if (!this.pointer) return { x: 0, y: 0 };
    const g = this.renderer.unproject(this.pointer.x, this.pointer.y + this.CARRY_Z * this.renderer.cos * this.renderer.scale);
    return {
      x: this.renderer.clamp(g.x, -this.ROOF_X - 1, this.ROOF_X + 1),
      y: this.renderer.clamp(g.y, -this.ROOF_Y - 1, this.ROOF_Y + 1),
    };
  }

  overBasket(item) {
    if (!item) return false;
    const b = this.renderer.project(this.BASKET.x, this.BASKET.y, this.BASKET.h);

    // 1. Screen-space proximity of cursor pointer to basket (only during manual drag)
    if (!this.auto && this.pointer) {
      const pDist = Math.hypot(this.pointer.x - b.sx, this.pointer.y - b.sy);
      if (pDist < this.DROP_PX) return true;
    }

    // 2. Screen-space proximity of item center with magnetic hitbox
    const a = this.renderer.project(item.x, item.y, item.z - item.h / 2);
    const screenDist = Math.hypot(a.sx - b.sx, a.sy - b.sy);
    if (screenDist < this.DROP_PX) return true;

    // 3. 3D world cylinder proximity check (without restrictive z-gate)
    const dx = item.x - this.BASKET.x, dy = item.y - this.BASKET.y;
    return Math.hypot(dx, dy) < this.BASKET.r * 1.35;
  }

  grab(item, auto = false) {
    // Double Clothespin (Sipit) Friction for heavy garments on the line
    if (item.state === 'line' && item.pinsRemaining > 1 && !auto) {
      item.pinsRemaining--;
      this.audio.playSfx('unpin');
      item.rot = (Math.random() - 0.5) * 0.22;
      const p = this.renderer.project(item.x, item.y, item.z);
      this.addFloater(
        this.currentLang === 'tl' ? 'SNAP! 1 SIPIT PA!' : 'SNAP! 1 PIN LEFT!',
        p.sx, p.sy - 12, '#ffd700', 6
      );
      return;
    }

    item.pinsRemaining = 0;
    this.held = item;
    this.auto = auto;

    // Mid-air "Air Rescue" Snatch Bonus ("Salag sa Hangin")
    if (item.state === 'flying' || (item.state === 'falling' && item.wasBlown) || item.state === 'tossed') {
      this.airRescues++;
      item.wasBlown = false;
      const bonus = 10;
      this.score = Math.round((this.score + bonus) * 10) / 10;
      this.audio.playSfx('rescue');
      const p = this.renderer.project(item.x, item.y, item.z);
      this.addFloater(
        this.currentLang === 'tl' ? '+10 SALAG!' : '+10 CATCH!',
        p.sx, Math.max(24, p.sy - 14), '#2ded82', 6
      );
      this.setNanaySpeech(
        'Ayun, buti nasalo mo! Sayang ang Downy!',
        "Nice catch! Can't waste the fabric conditioner!",
        2.2, 'cheer'
      );
      this.onScoreChange(this.score);
    }

    // "Gintong Sipit" (Golden Clothespin) Power-Up Activation
    if (item.isGolden) {
      item.isGolden = false;
      this.freezeTimer = 4.0;
      this.audio.playSfx('gold');
      const p = this.renderer.project(item.x, item.y, item.z);
      this.addFloater(
        this.currentLang === 'tl' ? '4s TIGIL-ORAS!' : '4s FREEZE!',
        p.sx, Math.max(24, p.sy - 14), '#ffd700', 6
      );
      this.setNanaySpeech(
        'Aba, Gintong Sipit! Suwerte!',
        'Golden Peg! Lucky find!',
        2.4, 'gold'
      );
      this.updateWeatherStatus();
    }

    item.state = 'held';
    item.vz = 0;
    this.audio.playSfx('pop');
  }

  letGo() {
    const item = this.held;
    if (!item) return;
    const itemsToRelease = [item, ...(this.heldItems || [])];
    this.held = null;
    this.heldItems = [];
    this.pointerDownPos = null;
    this.pointerDownTime = 0;

    if (this.overBasket(item)) {
      itemsToRelease.forEach(it => this.bank(it));
      return;
    }

    // Velocity calculation from recent pointerHistory (last ~120ms)
    let vx = 0, vy = 0;
    const now = performance.now();
    const recent = (this.pointerHistory || []).filter(h => now - h.t < 130);
    this.pointerHistory = [];
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const dtMs = (last.t - first.t) / 1000;
      if (dtMs > 0.015) {
        vx = (last.x - first.x) / dtMs;
        vy = (last.y - first.y) / dtMs;
      }
    }
    const speed = Math.hypot(vx, vy);

    if (speed > 220) {
      // 2.5D Ballistic Arcade Toss ("Shoot sa Batya!")
      this.audio.playSfx('toss');
      const maxSpeed = 750;
      const effectiveSpeed = Math.min(speed, maxSpeed);
      const ratio = effectiveSpeed / Math.max(speed, 0.001);
      const cvx = vx * ratio;
      const cvy = vy * ratio;

      itemsToRelease.forEach((it, idx) => {
        const spreadX = (idx - (itemsToRelease.length - 1) / 2) * 12;
        it.state = 'tossed';
        const worldScale = this.renderer.scale;
        const u = (cvx + spreadX) / worldScale;
        const v = cvy / (worldScale * this.renderer.sin);
        // Correct 2.5D unprojection taking camera yaw into account
        const dirX = u * this.renderer.yawCos + v * this.renderer.yawSin;
        const dirY = -u * this.renderer.yawSin + v * this.renderer.yawCos;

        it.vx = Math.max(-28, Math.min(28, dirX * 1.15));
        it.vy = Math.max(-28, Math.min(28, dirY * 1.15));
        it.vz = Math.max(2.0, Math.min(6.5, effectiveSpeed * 0.009 - (cvy < 0 ? cvy * 0.006 : 0)));
        it.spin = (Math.random() - 0.5) * 8 + (cvx > 0 ? 3.5 : -3.5);
        it.startTossPos = { x: it.x, y: it.y };
        it.wasTossed = true;
      });
    } else {
      itemsToRelease.forEach(it => {
        it.state = 'falling';
        it.vz = 0;
      });
    }
  }

  nextItem() {
    const order = { flying: 0, loose: 1, ground: 2, falling: 2, line: 3 };
    return this.items
      .filter(i => order[i.state] != null)
      .sort((p, q) => order[p.state] - order[q.state] || q.value - p.value)[0];
  }

  updateRain(dt, rain) {
    const want = Math.floor(rain * 520);
    while (this.drops.length < want) this.drops.push(this.newDrop(true));
    if (this.drops.length > want) this.drops.length = want;
    const wind = 3 + this.gustGlow * 5;
    for (let k = 0; k < this.drops.length; k++) {
      const d = this.drops[k];
      d.z -= 26 * dt;
      d.x += wind * dt;
      if (d.z <= 0) {
        if (Math.abs(d.x) < this.ROOF_X && Math.abs(d.y) < this.ROOF_Y) {
          this.splashes.push({ x: d.x, y: d.y, life: 0.12 });
        }
        this.drops[k] = this.newDrop(false);
      }
    }
    for (const s of this.splashes) s.life -= dt;
    while (this.splashes.length && this.splashes[0].life <= 0) this.splashes.shift();
  }

  newDrop(anywhere) {
    return {
      x: (Math.random() - 0.5) * (this.ROOF_X * 2 + 4) - 2,
      y: (Math.random() - 0.5) * this.ROOF_Y * 2.2,
      z: anywhere ? Math.random() * 14 : 12 + Math.random() * 3,
    };
  }

  updateWeatherStatus() {
    const t = this.t;
    let label = 'Maaliwalas pa ☀️';
    let urgency = 'calm';
    let progress = Math.min(1, t / this.RAIN_FROM);

    if (this.freezeTimer > 0) {
      label = this.currentLang === 'tl' ? 'TIGIL-ORAS! ⏳' : 'TIME FROZEN! ⏳';
      urgency = 'freeze';
    } else if (t < this.STORM_FROM) {
      label = 'Maaliwalas pa ☀️';
      urgency = 'calm';
    } else if (t < this.RAIN_FROM) {
      label = 'Lumalamig ang simoy 💨';
      urgency = 'breezy';
    } else if (t < this.RAIN_TO) {
      label = 'Pumapatak na ang ulan! 🌧️';
      urgency = 'rain';
      progress = 1;
    } else {
      label = 'Bumabagsak na ang ulan! ⛈️';
      urgency = 'storm';
      progress = 1;
    }

    this.onWeatherChange({
      label,
      urgency,
      timeRemaining: Math.max(0, Math.ceil(this.GAME_LENGTH - t)),
      dryTimeRemaining: Math.max(0, Math.ceil(this.RAIN_FROM - t)),
      progress,
      freezeTimer: this.freezeTimer,
    });
  }

  update(dt) {
    if (this.phase === 'play' && this.paused) {
      return;
    }

    this.time += dt;
    this.gustGlow = Math.max(0, this.gustGlow - dt * 0.8);
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (this.bolt && this.flash < 0.35) this.bolt = null;

    // Arcade timers decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.onComboChange(1, 1);
      }
    }
    if (this.basketBounce > 0) {
      this.basketBounce = Math.max(0, this.basketBounce - dt * 4.2);
    }
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 3.5);
      const mag = this.screenShake * 5.0;
      if (this.renderer.canvas && this.renderer.canvas.style) {
        this.renderer.canvas.style.transform = (mag > 0.08) ? `translate(${(Math.random()-0.5)*mag}px, ${(Math.random()-0.5)*mag}px)` : '';
      }
    } else if (this.renderer.canvas && this.renderer.canvas.style && this.renderer.canvas.style.transform) {
      this.renderer.canvas.style.transform = '';
    }

    if (this.nanaySpeech) {
      this.nanaySpeech.timer -= dt;
      if (this.nanaySpeech.timer <= 0) this.nanaySpeech = null;
    }
    if (this.nanayPokeTimer > 0) {
      this.nanayPokeTimer -= dt;
      if (this.nanayPokeTimer < 0) this.nanayPokeTimer = 0;
    }
    if (this.roundBanner) {
      const prevStep = this.getCountdownStep();
      this.roundBanner.timer -= dt;
      const nextStep = this.getCountdownStep();
      if (dt < 1.0 && nextStep && nextStep !== prevStep) {
        this.audio.playSfx(nextStep === 'GO!' ? 'countdownGo' : 'countdown');
      }
      if (this.roundBanner.timer <= 0) this.roundBanner = null;
    }
    this.updateFloaters(dt);

    // Weather freeze handling from Gintong Sipit
    const isFrozen = this.freezeTimer > 0;
    if (isFrozen) {
      this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    }

    if (this.phase === 'title') {
      // Idle rooftop breeze: silence audio, clear weather effects, keep t at 0
      this.t = 0;
      this.wetness = 0;
      this.drops.length = 0;
      this.splashes.length = 0;
      this.audio.silence();
      return;
    }

    // Round transition delay before next yugto
    if (this.roundTransitionTimer > 0) {
      this.roundTransitionTimer -= dt;
      if (this.roundTransitionTimer <= 0) {
        this.startRound(this.round + 1);
      }
      return;
    }

    if (this.phase === 'play') {
      if (!isFrozen && !this.isInCutscene()) {
        this.t += dt;
        if ((this.gustIn -= dt) <= 0) {
          this.gust();
          const rCfg = this.ROUNDS[this.round - 1];
          const minG = rCfg ? rCfg.gustMin : 5;
          const maxG = rCfg ? rCfg.gustMax : 9;
          this.gustIn = this.renderer.lerp(maxG, minG, this.stormLevel()) * (0.8 + Math.random() * 0.4);
        }
      }
      this.updateWeatherStatus();

      const anyRemaining = this.items.some(i => i.state !== 'basket' && i.state !== 'lost');
      if (this.t >= this.GAME_LENGTH || !anyRemaining) {
        if (this.round < this.maxRounds) {
          // Advance to next round in the 3-round campaign!
          if (this.held) {
            this.held.state = 'falling';
            this.held = null;
            this.auto = false;
          }
          if (this.heldItems && this.heldItems.length > 0) {
            this.heldItems.forEach(it => { it.state = 'falling'; });
            this.heldItems = [];
          }
          const banked = this.items.filter(i => i.state === 'basket');
          const dry = banked.filter(i => i.wet < 0.25).length;
          const wetBanked = banked.length - dry;
          const unbanked = this.items.filter(i => i.state !== 'basket' && i.state !== 'lost').length;
          const wet = wetBanked + unbanked;
          const lost = this.items.filter(i => i.state === 'lost').length;
          this.cumDry += dry;
          this.cumWet += wet;
          this.cumLost += lost;
          this.cumTotal += this.items.length;
          this.cumBanked = (this.cumBanked || 0) + banked.length;
          this.cumBankedItems = (this.cumBankedItems || []).concat(
            banked.map(i => ({ kind: i.kind, color: i.color }))
          );

          // Clear rain drops and silence stormy weather audio for triumphant victory banner
          this.drops.length = 0;
          this.splashes.length = 0;
          this.audio.setWeather(0, 0);

          this.audio.playSfx('roundClear');
          this.showRoundBanner(this.round, true);
          this.setNanaySpeech(
            'Magaling! Nakaligtas sa bagyo!',
            'Great job! Saved from the storm!',
            2.2, 'cheer'
          );
          this.roundTransitionTimer = 2.2;
        } else {
          this.endGame();
        }
      }
    } else if (this.phase === 'over') {
      this.overT += dt;
      this.drops.length = 0;
      this.splashes.length = 0;
      this.audio.setWeather(0, 0);
      return;
    }

    if (this.t > 18 && (this.boltIn -= dt) <= 0) {
      this.strike();
      this.boltIn = 3.5 + Math.random() * 4;
    }

    const rain = this.rainLevel();
    if (rain > 0 && !this.rainWarned) {
      this.rainWarned = true;
      const drizzleQuotesTl = [
        'NAK! Yung sinampay! Umaambon na oh!',
        'Nak! Kakaselpon mo, di mo napansing umuulan na!',
        'Nak, kilos na! Mag-aamoy kulob na naman yan!',
      ];
      const drizzleQuotesEn = [
        "SON! The laundry! It's starting to drizzle!",
        "Always on that phone—you didn't notice the rain!",
        'Move it, son! The clothes are gonna smell musty!',
      ];
      // Round 1 uses the iconic "NAK! Yung sinampay! Umaambon na oh!", later rounds rotate
      const rIdx = this.round === 1 ? 0 : Math.floor(Math.random() * drizzleQuotesTl.length);
      this.setNanaySpeech(
        drizzleQuotesTl[rIdx],
        drizzleQuotesEn[rIdx],
        2.8, 'urgent'
      );
    }

    this.wetness = Math.min(1, this.wetness + rain * dt / 14);
    this.audio.setWeather(this.stormLevel(), rain);

    // Laundry item physics
    for (const item of this.items) {
      if (item.state === 'basket' || item.state === 'lost') continue;
      item.wet = Math.min(1, item.wet + rain * dt / 8);

      if (item.state === 'loose') {
        if ((item.pop -= dt) <= 0) {
          this.launch(item);
          this.audio.playSfx('pop');
        }
      } else if (item.state === 'flying') {
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        item.rot += item.spin * dt;
        const away = Math.abs(item.x) > this.ROOF_X + 1.2 || Math.abs(item.y) > this.ROOF_Y + 1.2;
        if (item.flightTimer != null) item.flightTimer -= dt;
        if (away) {
          item.vz = -9;
          item.z += item.vz * dt;
          if (item.z < -7) {
            item.state = 'lost';
            this.adjustTsinelasMeter(+20);
            if (!this.nanaySpeech || this.nanaySpeech.timer < 0.5) {
              const lostQuotesTl = [
                'Hala! Nalipad na sa kalsada ang sinampay!',
                'Naku, tangay ng hangin ang damit! Hahabulin pa natin sa baba!',
              ];
              const lostQuotesEn = [
                'Oh no! The laundry blew away into the street!',
                'The wind took the clothes! We have to chase them downstairs!',
              ];
              const lIdx = Math.floor(Math.random() * lostQuotesTl.length);
              this.setNanaySpeech(lostQuotesTl[lIdx], lostQuotesEn[lIdx], 2.4, 'scold');
            }
          }
        } else if (item.flightTimer != null && item.flightTimer <= 0) {
          // Blown garment loses wind lift and starts descending to the rooftop floor
          item.state = 'falling';
          item.vz = -1.5;
        } else {
          item.vz = Math.sin(this.time * 2.7 + item.phase) * 1.1 + (3 - item.z) * 0.7;
          item.z += item.vz * dt;
          if (item.z <= 0.6) {
            item.state = 'ground';
            item.wasBlown = false;
            item.rot = 0;
            item.vz = 0;
          }
        }
      } else if (item.state === 'falling') {
        item.vz -= 14 * dt;
        item.z += item.vz * dt;
        item.rot *= 0.9;
        if (item.z < 0.6) {
          item.state = 'ground';
          item.wasBlown = false;
          item.rot = 0;
          item.vz = 0;
          this.adjustTsinelasMeter(+5);
          // Live Nanay reaction to dropped clothing
          if (!this.nanaySpeech || this.nanaySpeech.timer < 0.5) {
            const dropQuotesTl = [
              "Hala, ba't mo binagsak sa semento?! Kakalaba ko lang niyan!",
              "Wag sa lapag! Pag 'yan namantsahan, ikaw magkukuskos niyan!",
            ];
            const dropQuotesEn = [
              "Why'd you drop it on the cement?! I just washed that!",
              "Not on the floor! If that stains, you're hand-scrubbing it!",
            ];
            const dIdx = Math.floor(Math.random() * dropQuotesTl.length);
            this.setNanaySpeech(dropQuotesTl[dIdx], dropQuotesEn[dIdx], 2.2, 'scold');
          }
        }
      } else if (item.state === 'tossed') {
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        item.z += item.vz * dt;
        item.vz -= 12.5 * dt; // 2.5D rooftop gravity
        item.rot += item.spin * dt;
        item.vx *= (1 - dt * 0.35);
        item.vy *= (1 - dt * 0.35);

        // Check if entered the Batya (Shoot sa Batya / Swish)
        const dx = item.x - this.BASKET.x;
        const dy = item.y - this.BASKET.y;
        const dist = Math.hypot(dx, dy);
        const inCylinder = dist < this.BASKET.r * 1.45;
        const inHeight = item.z <= this.BASKET.h + 0.95 && item.z >= 0.45;
        const isOverScreen = this.overBasket(item);
        const enteredBasket = (inCylinder && inHeight) || (isOverScreen && item.z <= this.BASKET.h + 0.95 && item.z >= 0.45);

        if (enteredBasket) {
          const tossDist = item.startTossPos ? Math.hypot(item.startTossPos.x - this.BASKET.x, item.startTossPos.y - this.BASKET.y) : 0;
          this.bank(item);
          if (tossDist > 2.8) {
            this.swishScores = (this.swishScores || 0) + 1;
            const swishBonus = 15;
            this.score = Math.round((this.score + swishBonus) * 10) / 10;
            this.onScoreChange(this.score);
            this.audio.playSfx('swish');
            this.screenShake = 0.35;
            const p = this.renderer.project(this.BASKET.x, this.BASKET.y, this.BASKET.h + 0.6);
            this.addFloater(
              this.currentLang === 'tl' ? '+15 SWISH! SHOOT!' : '+15 SWISH! BUCKET!',
              p.sx, p.sy - 12, '#ffd700', 8
            );
            const swishQuotesTl = [
              'SHOOT! Parang si Justin Brownlee!',
              'Aba, tres puntos sa batya! Galing!',
              'Shoot na shoot! Walang mintis, Nak!'
            ];
            const swishQuotesEn = [
              'SWISH! Like Justin Brownlee in the PBA!',
              'Three points into the tub! Great shot!',
              'Nothing but net, son! What a shot!'
            ];
            const sqIdx = Math.floor(Math.random() * swishQuotesTl.length);
            this.setNanaySpeech(swishQuotesTl[sqIdx], swishQuotesEn[sqIdx], 2.4, 'cheer');
            this.adjustTsinelasMeter(-12);
          }
        } else if (item.z <= 0.6) {
          item.state = 'ground';
          item.z = 0.6;
          item.vz = 0;
          item.rot = 0;
          this.adjustTsinelasMeter(+5);
          if (!this.nanaySpeech || this.nanaySpeech.timer < 0.4) {
            this.setNanaySpeech(
              "Ay sumablay! Dumapa sa semento!",
              "Missed the basket! It fell on the cement!",
              2.0, 'scold'
            );
          }
        } else if (Math.abs(item.x) > this.ROOF_X + 1.2 || Math.abs(item.y) > this.ROOF_Y + 1.2) {
          item.state = 'lost';
          this.adjustTsinelasMeter(+20);
        }
      } else if (item.state === 'held') {
        const target = this.auto ? { x: this.BASKET.x, y: this.BASKET.y } : this.pointerWorld();
        const dx = target.x - item.x, dy = target.y - item.y, d = Math.hypot(dx, dy);
        const px = item.x;

        if (this.auto) {
          const move = Math.min(d, item.speed * dt);
          if (d > 0) {
            item.x += dx / d * move;
            item.y += dy / d * move;
          }
        } else {
          // Snappy, ultra-responsive cursor drag (with slight garment weight inertia)
          const followRate = item.weight === 'heavy' ? 55 : (item.weight === 'light' ? 85 : 75);
          const follow = Math.min(1, dt * followRate);
          item.x += dx * follow;
          item.y += dy * follow;
        }

        item.vx = (item.x - px) / Math.max(dt, 0.001);
        item.z += (this.CARRY_Z + item.h / 2 - item.z) * Math.min(1, dt * 14);
        item.rot *= 0.8;

        if (this.heldItems && this.heldItems.length > 0) {
          this.heldItems.forEach((extra, idx) => {
            extra.x = item.x + (idx + 1) * 0.25;
            extra.y = item.y;
            extra.z = item.z;
            extra.vx = item.vx;
            extra.rot = item.rot;
          });
        }

        if (this.auto && this.overBasket(item)) {
          this.held = null;
          this.auto = false;
          this.bank(item);
        }
      }
    }

    if (this.phase === 'play') {
      if (this.tsinelasShake > 0) {
        this.tsinelasShake = Math.max(0, this.tsinelasShake - dt * 2.5);
      }
      this.updateCat(dt);
      this.updateSmoke(dt);
      this.updateUtos(dt);
    }

    this.updateRain(dt, rain);
  }

  /* ---------- Rooftop Chaos Hazard Logic (Munin, Smoke, Utos, Tsinelas) ---------- */
  adjustTsinelasMeter(amount) {
    this.tsinelasMeter = Math.max(0, Math.min(100, (this.tsinelasMeter || 0) + amount));
    if (amount > 0) {
      this.tsinelasShake = 0.45;
      if (this.tsinelasMeter >= 100 && !this.tsinelasRage) {
        this.tsinelasRage = true;
        this.audio.playSfx('tsinelas');
        this.screenShake = 0.5;
        this.setNanaySpeech(
          "HUMANDA KA SA TSINELAS! Napuno mo na 'ko!",
          "WATCH OUT FOR THE SLIPPER! You've pushed me too far!",
          3.0, 'scold'
        );
        this.addFloater(
          this.currentLang === 'tl' ? 'HUMANDA SA TSINELAS! 🩴' : 'SLIPPER INCOMING! 🩴',
          this.renderer.width / 2, 60, '#ce1126', 8
        );
      }
    }
    if (this.onTsinelasChange) {
      this.onTsinelasChange(this.tsinelasMeter, this.tsinelasRage);
    }
  }

  updateCat(dt) {
    if (this.phase !== 'play' || this.paused || this.isInCutscene()) return;
    const cat = this.cat;
    cat.animTime += dt;

    if (cat.state === 'inactive') {
      cat.cooldown -= dt;
      if (cat.cooldown <= 0) {
        cat.active = true;
        const fromLeft = Math.random() < 0.5;
        cat.x = fromLeft ? -10.5 : 10.5;
        cat.y = 5.8;
        cat.z = 0.6;
        cat.facing = fromLeft ? 1 : -1;
        cat.state = 'parapet_walk';
        cat.timer = 5.0 + Math.random() * 4.0;
        this.audio.playSfx('meow');
      }
      return;
    }

    if (cat.state === 'parapet_walk') {
      cat.x += cat.facing * 1.8 * dt;
      cat.timer -= dt;

      // Detect fallen unsoiled clothes on ground
      const groundItem = this.items.find(i => i.state === 'ground' && !i.soiled);
      if (groundItem) {
        cat.targetItem = groundItem;
        cat.state = 'stalk';
        cat.timer = 8.0;
      } else if (cat.timer <= 0) {
        if (Math.random() < 0.5) {
          cat.state = 'jump_line';
          cat.timer = 3.2;
          cat.targetLine = Math.floor(Math.random() * 3);
          this.audio.playSfx('meow');
        } else {
          cat.state = 'flee';
          cat.facing = cat.x > 0 ? 1 : -1;
        }
      }
    } else if (cat.state === 'stalk') {
      if (!cat.targetItem || cat.targetItem.state !== 'ground') {
        cat.targetItem = null;
        cat.state = 'parapet_walk';
        cat.timer = 3.0;
        return;
      }
      const dx = cat.targetItem.x - cat.x;
      const dy = cat.targetItem.y - cat.y;
      const dist = Math.hypot(dx, dy);
      cat.facing = dx >= 0 ? 1 : -1;

      if (dist > 0.7) {
        cat.x += (dx / dist) * 2.2 * dt;
        cat.y += (dy / dist) * 2.2 * dt;
      } else {
        cat.state = 'knead_nap';
        cat.napTimer = 1.8;
        this.setNanaySpeech(
          "Hala, si Munin! Lalapitan ang sinampay sa lapag!",
          "Look out, Munin! He's heading for the fallen laundry!",
          2.4, 'urgent'
        );
      }
    } else if (cat.state === 'knead_nap') {
      cat.napTimer -= dt;
      if (!cat.targetItem || cat.targetItem.state !== 'ground') {
        cat.state = 'flee';
        cat.facing = cat.x > 0 ? 1 : -1;
        return;
      }
      if (cat.napTimer <= 0) {
        cat.targetItem.soiled = 'paw';
        this.audio.playSfx('meow');
        this.adjustTsinelasMeter(+15);
        this.score = Math.max(0, Math.round((this.score - 5) * 10) / 10);
        this.onScoreChange(this.score);
        const p = this.renderer.project(cat.targetItem.x, cat.targetItem.y, 0.6);
        this.addFloater(this.currentLang === 'tl' ? 'MADUMI! -5' : 'SOILED! -5', p.sx, p.sy - 10, '#ce1126', 6);
        this.setNanaySpeech(
          "Jusko! Tinapakan ng pusa ang puti! Munin, tsupe!",
          "Good grief! The cat stepped on the laundry! Shoo, Munin!",
          2.6, 'scold'
        );
        cat.state = 'flee';
        cat.facing = cat.x > 0 ? 1 : -1;
      }
    } else if (cat.state === 'jump_line') {
      const lineY = this.LINE_YS[cat.targetLine || 1];
      cat.y = lineY;
      cat.z = this.LINE_Z;
      cat.timer -= dt;
      // Line shaking causes fluttering
      for (const item of this.items) {
        if (item.state === 'line' && Math.abs(item.y - lineY) < 0.6) {
          item.rot += (Math.random() - 0.5) * 0.16;
        }
      }
      if (cat.timer <= 0) {
        cat.z = 0.6;
        cat.y = 5.8;
        cat.state = 'parapet_walk';
        cat.timer = 4.0;
      }
    } else if (cat.state === 'flee') {
      cat.x += cat.facing * 5.4 * dt;
      if (Math.abs(cat.x) > 13.0) {
        cat.active = false;
        cat.state = 'inactive';
        cat.cooldown = 8.0 + Math.random() * 8.0;
      }
    }
  }

  shooCat() {
    if (!this.cat || !this.cat.active || this.cat.state === 'flee') return;
    this.audio.playSfx('catHiss');
    this.cat.state = 'flee';
    this.cat.facing = this.cat.x >= 0 ? 1 : -1;
    this.cat.z = 0.6;
    this.adjustTsinelasMeter(-6);
    const catProj = this.renderer.project(this.cat.x, this.cat.y, this.cat.z);
    this.addFloater(this.currentLang === 'tl' ? 'TSUPE! 🐾' : 'SHOO! 🐾', catProj.sx, catProj.sy - 12, '#2ded82', 7);
    const shooQuotesTl = [
      'Tsupe, Munin! Huwag mong galawin ang labada!',
      'Ayan, buti naitaboy mo ang pusang gala!',
      'Tsupe! Dudumihan na naman ang mga damit!'
    ];
    const shooQuotesEn = [
      'Shoo, Munin! Leave the laundry alone!',
      'Nice! You chased away the stray cat!',
      'Shoo! It would have dirtied the clean clothes!'
    ];
    const sIdx = Math.floor(Math.random() * shooQuotesTl.length);
    this.setNanaySpeech(shooQuotesTl[sIdx], shooQuotesEn[sIdx], 2.2, 'cheer');
  }

  updateSmoke(dt) {
    if (this.phase !== 'play' || this.paused || this.isInCutscene()) return;
    const smoke = this.smokeEvent;

    if (!smoke.active) {
      smoke.nextSmokeIn -= dt;
      if (smoke.nextSmokeIn <= 0) {
        smoke.active = true;
        smoke.timer = 8.5;
        smoke.lineIdx = Math.floor(Math.random() * 3);
        this.audio.playSfx('sizzle');
        this.setNanaySpeech(
          "Hala! Nag-iihaw na naman si Mang Boy! Usok sa sampayan, iligtas ang mga puti!",
          "Oh no! Mang Boy is grilling BBQ downstairs! Save the white clothes from the smoke!",
          3.2, 'urgent'
        );
        const p = this.renderer.project(0, this.LINE_YS[smoke.lineIdx], this.LINE_Z);
        this.addFloater(this.currentLang === 'tl' ? 'USOK ALERT! ♨️' : 'SMOKE ALERT! ♨️', p.sx, p.sy - 14, '#f59e0b', 7);
      }
      return;
    }

    smoke.timer -= dt;

    // Spawn smoke particles wafting horizontally
    if (Math.random() < 0.70) {
      smoke.particles.push({
        x: -this.ROOF_X - 1 + Math.random() * 2,
        y: this.LINE_YS[smoke.lineIdx] + (Math.random() - 0.5) * 1.6,
        z: this.LINE_Z - 0.5 + Math.random() * 1.5,
        vx: 4.6 + Math.random() * 1.8,
        vy: (Math.random() - 0.5) * 0.4,
        vz: 0.2 + Math.random() * 0.4,
        r: 0.65 + Math.random() * 0.5,
        life: 0,
        maxLife: 5.6,
        color: Math.random() < 0.25 ? [75, 70, 65] : [135, 130, 125],
      });
    }

    // Update particles
    for (let i = smoke.particles.length - 1; i >= 0; i--) {
      const sp = smoke.particles[i];
      sp.life += dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.z += sp.vz * dt;
      sp.r += dt * 0.35;
      if (sp.life >= sp.maxLife) smoke.particles.splice(i, 1);
    }

    // Check white clothes on that line reached by the wafting smoke plume
    const targetY = this.LINE_YS[smoke.lineIdx];
    const smokeFrontX = -this.ROOF_X + (8.5 - smoke.timer) * 4.6;
    for (const item of this.items) {
      if (item.state === 'line' && Math.abs(item.y - targetY) < 0.6) {
        const isWhite = item.isWhite || item.kind === 'school_uniform' || item.kind === 'sando' || item.kind === 'bimpo';
        if (isWhite && !item.soiled && item.x <= smokeFrontX) {
          item.smokeExposure = (item.smokeExposure || 0) + dt;
          if (item.smokeExposure >= 3.8) {
            item.soiled = 'smoke';
            this.adjustTsinelasMeter(+15);
            const p = this.renderer.project(item.x, item.y, item.z);
            this.addFloater(this.currentLang === 'tl' ? 'AMOY USOK! ♨️' : 'SMOKED! ♨️', p.sx, p.sy - 10, '#ce1126', 6);
            this.setNanaySpeech(
              "Ayan na nga ba sinasabi ko! Nangamoy uling ang uniporme!",
              "Just as I warned! The uniform smells like charcoal BBQ!",
              2.6, 'scold'
            );
          }
        }
      }
    }

    if (smoke.timer <= 0) {
      smoke.active = false;
      smoke.nextSmokeIn = 16.0 + Math.random() * 10;
    }
  }

  updateUtos(dt) {
    if (this.phase !== 'play' || this.paused || this.isInCutscene()) return;
    const utos = this.utos;

    if (!utos.active) {
      utos.cooldown -= dt;
      if (utos.cooldown <= 0) {
        const candidates = this.items.filter(i => i.state !== 'basket' && i.state !== 'lost');
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.value - a.value);
          const chosen = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
          utos.active = true;
          utos.targetItemId = chosen.id;
          utos.item = chosen;
          utos.kind = chosen.kind;
          utos.name = chosen.name;
          utos.timer = 6.0;
          utos.maxTimer = 6.0;
          utos.completed = false;
          this.audio.playSfx('pop');

          let tlLine, enLine;
          if (chosen.kind === 'school_uniform') {
            tlLine = "Nak! Yung uniporme mo muna, may pasok ka bukas!";
            enLine = "Son! Get your school uniform first, you have class tomorrow!";
          } else if (chosen.kind === 'daster') {
            tlLine = "Yung daster ko unahin mo, kakalaba ko lang niyan!";
            enLine = "Get my daster first, I just washed that!";
          } else if (chosen.kind === 'basketball_jersey') {
            tlLine = "Yung paboritong jersey ni Tatay, iligtas mo!";
            enLine = "Save Tatay's favorite jersey first!";
          } else if (chosen.kind === 'floral_blanket') {
            tlLine = "Yung kumot! Baka maulanan, ang hirap patuyuin!";
            enLine = "The floral blanket! If it gets soaked it will take days to dry!";
          } else {
            tlLine = `Nak! Unahin mo agad ang ${chosen.name}!`;
            enLine = `Son! Prioritize the ${chosen.name} right now!`;
          }
          this.setNanaySpeech(tlLine, enLine, 3.2, 'urgent');
          const p = this.renderer.project(chosen.x, chosen.y, chosen.z);
          this.addFloater(this.currentLang === 'tl' ? 'URGENT UTOS! ⚡' : 'PRIORITY TASK! ⚡', p.sx, p.sy - 14, '#ffd700', 7);

          if (this.onUtosChange) {
            this.onUtosChange({
              active: true,
              name: chosen.kind,
              itemName: chosen.name,
              timer: utos.timer,
              maxTimer: utos.maxTimer
            });
          }
        } else {
          utos.cooldown = 5.0;
        }
      }
      return;
    }

    utos.timer -= dt;
    const target = (utos.targetItemId != null ? this.items.find(i => i.id === utos.targetItemId) : null) || utos.item;

    if (this.onUtosChange) {
      this.onUtosChange({
        active: true,
        name: target ? target.kind : (utos.kind || ''),
        itemName: target ? target.name : '',
        timer: Math.max(0, utos.timer),
        maxTimer: utos.maxTimer
      });
    }

    if (!target || target.state === 'lost') {
      utos.active = false;
      utos.cooldown = 10.0;
      this.adjustTsinelasMeter(+20);
      this.setNanaySpeech(
        "Naku, nalipad tuloy ang pinapakuha ko!",
        "Oh no, the clothes I asked for flew away!",
        2.6, 'scold'
      );
      if (this.onUtosChange) this.onUtosChange(null);
    } else if (target.state === 'basket') {
      this.completeUtos(target);
    } else if (utos.timer <= 0) {
      utos.active = false;
      utos.cooldown = 10.0;
      this.adjustTsinelasMeter(+20);
      this.setNanaySpeech(
        "Sabi ko unahin mo 'yun eh! Matigas talaga ulo mo!",
        "I told you to get that one first! You never listen!",
        2.6, 'scold'
      );
      if (this.onUtosChange) this.onUtosChange(null);
    }
  }

  completeUtos(target) {
    if (!this.utos || !this.utos.active) return;
    this.utos.active = false;
    this.utos.cooldown = 12.0;
    this.utosCount = (this.utosCount || 0) + 1;
    const bountyPoints = Math.round((target.value || 3) * 3 * 10) / 10;
    this.score = Math.round((this.score + bountyPoints) * 10) / 10;
    this.combo = 5;
    this.comboTimer = 2.0;
    this.onScoreChange(this.score);
    this.onComboChange(5, 5);
    this.adjustTsinelasMeter(-15);
    this.audio.playSfx('rescue');
    const p = this.renderer.project(this.BASKET.x, this.BASKET.y, this.BASKET.h + 0.5);
    this.addFloater(
      this.currentLang === 'tl' ? `+${bountyPoints} MASUNURIN! 3X` : `+${bountyPoints} OBEDIENT! 3X`,
      p.sx, p.sy - 12, '#ffd700', 8
    );
    this.setNanaySpeech(
      "Napakabait talagang bata! May dagdag baon ka mamaya!",
      "Such a good child! Extra pocket money for you later!",
      2.8, 'cheer'
    );
    if (this.onUtosChange) this.onUtosChange(null);
  }

  drawUtosBeacon(targetItem) {
    const item = targetItem || (this.utos && this.utos.active ? (this.utos.item || (this.utos.targetItemId != null ? this.items.find(i => i.id === this.utos.targetItemId) : null)) : null);
    if (!item) return;
    const ctx = this.renderer.ctx;
    if (!ctx) return;
    const p = this.renderer.project(item.x, item.y, item.z + 0.3);
    if (p.d < -1e8) return;
    const pulse = (Math.sin(this.time * 9) + 1) * 0.5;
    const size = Math.round(item.w * this.renderer.scale * 0.6) + 4;

    ctx.save();
    // Glowing golden target bracket
    ctx.strokeStyle = `rgba(245, 184, 0, ${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    const bx = Math.round(p.sx - size / 2);
    const by = Math.round(p.sy - size / 2);
    const cornerL = 6;
    ctx.beginPath(); ctx.moveTo(bx, by + cornerL); ctx.lineTo(bx, by); ctx.lineTo(bx + cornerL, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + size - cornerL, by); ctx.lineTo(bx + size, by); ctx.lineTo(bx + size, by + cornerL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by + size - cornerL); ctx.lineTo(bx, by + size); ctx.lineTo(bx + cornerL, by + size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + size - cornerL, by + size); ctx.lineTo(bx + size, by + size); ctx.lineTo(bx + size, by + size - cornerL); ctx.stroke();

    // Floating pulsing arrow / badge above
    const arrowY = by - 12 - Math.round(pulse * 4);
    ctx.font = '6.5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#181210';
    ctx.fillText(`⚡${Math.ceil(this.utos.timer)}s⚡`, p.sx + 1, arrowY + 1);
    ctx.fillStyle = '#f5b800';
    ctx.fillText(`⚡${Math.ceil(this.utos.timer)}s⚡`, p.sx, arrowY);

    ctx.restore();
  }

  endGame() {
    this.phase = 'over';
    this.paused = false;
    this.confirmingQuit = false;
    this.overT = 0;
    this.nanaySpeech = null;
    this.roundBanner = null;
    this.roundTransitionTimer = 0;
    this.floaters.length = 0;
    this.audio.stopBgm();
    this.audio.setWeather(0, 0);
    this.onPauseChange(false);
    if (this.onQuitConfirmChange) this.onQuitConfirmChange(false);
    if (this.held) {
      this.held.state = 'falling';
      this.held = null;
      this.auto = false;
    }
    this.heldItems = [];

    const currentBanked = this.items.filter(i => i.state === 'basket');
    const currentDry = currentBanked.filter(i => i.wet < 0.25).length;
    const currentWetBanked = currentBanked.length - currentDry;
    const currentUnbanked = this.items.filter(i => i.state !== 'basket' && i.state !== 'lost').length;
    const currentWet = currentWetBanked + currentUnbanked;
    const currentLost = this.items.filter(i => i.state === 'lost').length;

    const dry = currentDry + this.cumDry;
    const wet = currentWet + this.cumWet;
    const lost = currentLost + this.cumLost;
    const total = this.items.length + this.cumTotal;

    const isBest = this.score > this.best;
    if (isBest) {
      this.best = this.score;
      this.saveBestScore(this.score);
    }

    // Nanay's Judgment rating
    let grade = 'F';
    let commentary = '';
    let badgeClass = 'grade-f';

    if (dry === total) {
      grade = 'S';
      badgeClass = 'grade-s';
      commentary = "ABA, HIMALA! PERPEKTO! Tuyong-tuyo lahat at walang nalaglag! Dahil dyan, may bente ka sa'kin at mag-merienda ka na sa baba!";
      this.audio.playSfx('victory');
    } else if (dry >= Math.ceil(total * 0.75)) {
      grade = 'A';
      badgeClass = 'grade-a';
      commentary = 'ANG GALING, NAK! Naisalba halos lahat bago bumuhos ang ulan. Isampay mo na lang sa loob yung medyo malamig pa.';
      this.audio.playSfx('victory');
    } else if (dry >= Math.ceil(total * 0.45)) {
      grade = 'B';
      badgeClass = 'grade-b';
      commentary = "HAY NAKO, MEDYO MABAGAL! Naambunan na yung iba! Mag-aamoy kulob 'to pag tinupi—iharap mo nga muna sa electric fan!";
      this.audio.playSfx('victory');
    } else {
      grade = 'F';
      badgeClass = 'grade-f';
      commentary = "JUSKO NAMAN, NAK! Basang-basa lahat! Kakaselpon mo 'yan eh! Banlawan mo ulit 'to lahat bago ako ma-highblood!";
      this.audio.playSfx('fail');
    }

    // Tsinelas Rage alters commentary if anger meter hit max
    if (this.tsinelasRage && grade !== 'S') {
      commentary = this.currentLang === 'tl'
        ? "HUMANDA KA TALAGA SA TSINELAS! Napuno mo 'ko sa kabagalan mo! Banlawan mo ulit 'yan bago lumipad 'tong spartan!"
        : "WATCH OUT FOR THE SLIPPER! You tested my patience today! Wash that laundry again before this slipper flies!";
    }

    this.onPhaseChange('over');
    this.onGameOver({
      grade,
      badgeClass,
      commentary,
      score: this.score,
      bestScore: this.best,
      isNewRecord: isBest,
      dry,
      wet,
      lost,
      total,
      maxCombo: this.maxCombo,
      airRescues: this.airRescues,
      swishScores: this.swishScores || 0,
      utosCount: this.utosCount || 0,
      tsinelasRage: Boolean(this.tsinelasRage),
      roundsCleared: this.round >= this.maxRounds ? 3 : Math.max(0, this.round - 1),
    });
  }

  /* ---------- Floaters, Speech Bubbles & 2D Arcade Feedback ---------- */
  addFloater(text, sx, sy, color = '#f5b800', size = 6) {
    this.floaters.push({
      text,
      sx,
      sy,
      color,
      size,
      life: 0,
      maxLife: 0.85,
      vy: 14,
    });
  }

  updateFloaters(dt) {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life += dt;
      f.sy -= f.vy * dt;
      if (f.life >= f.maxLife) {
        this.floaters.splice(i, 1);
      }
    }
  }

  drawFloaters() {
    const ctx = this.renderer.ctx;
    if (!ctx || !this.floaters.length) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const w = this.renderer.width;
    for (const f of this.floaters) {
      const alpha = Math.max(0, 1 - (f.life / f.maxLife) ** 2);
      ctx.globalAlpha = alpha;
      ctx.font = `${f.size}px "Press Start 2P", monospace`;
      const halfW = Math.ceil(ctx.measureText(f.text).width / 2);
      const cx = Math.max(halfW + 4, Math.min(w - halfW - 4, Math.round(f.sx)));
      const cy = Math.round(f.sy);
      ctx.fillStyle = '#1c1b19';
      ctx.fillText(f.text, cx + 1, cy + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, cx, cy);
    }
    ctx.restore();
  }

  /* ---------- Nanay Portrait & Bottom-Left Chat Bubble ---------- */
  initNanayPortraits() {
    if (typeof document === 'undefined') return;
    const NANAY_PAL = {
      '#': '#181210', // crisp dark ink outline
      'h': '#281a14', // deep dark brown hair base
      'H': '#462e24', // hair midtone
      'x': '#6e4c3d', // hair sheen / highlight wisp
      'p': '#f43f5e', // coral pink hairclip / floral accent
      'P': '#fb7185', // clip highlight
      's': '#e29a65', // authentic warm Filipino Morena skin base
      'S': '#f4be92', // skin light highlight (forehead/nose)
      'd': '#bf7442', // skin contour & shadow
      'D': '#854620', // deep jaw / neck shadow
      'b': '#f472b6', // rosy cheek blush
      'B': '#fda4af', // soft blush highlight
      'e': '#181210', // eye pupil / lash line
      'w': '#ffffff', // eye catchlight / white / teeth
      'm': '#9f1239', // deep rose lips border / shadow
      'M': '#e11d48', // vibrant lips
      'u': '#fb7185', // tongue pink
      'g': '#f59e0b', // gold earring / flower stamen
      'G': '#fde047', // gold earring glint highlight
      't': '#0d9488', // daster teal base
      'T': '#14b8a6', // daster bright teal highlight
      'c': '#0f766e', // daster dark shadow
      'y': '#fbbf24', // daster floral yellow petal
      'k': '#fef3c7', // sweetheart collar cream
      'r': '#dc2626', // bimpo towel red stripe
      'o': '#f8fafc', // bimpo towel clean white
      'O': '#cbd5e1', // bimpo towel shadow fold
      'q': '#0284c7', // sweat drop blue
      'Q': '#bae6fd', // sweat drop highlight
    };

    const BASE_GRID = [
      "............########............", // 0: Top bun top edge
      "...........##hHHHHh##...........", // 1: Bun volume
      "..........#hHxxxxxxHh#..........", // 2: Bun sheen highlight
      "..........#hHxxxxxxHh#..........", // 3: Bun sheen
      "..........#hHHHHHHHHh#..........", // 4: Bun lower
      "...........#h#pPPp#h#...........", // 5: Pink floral scrunchie
      ".........####ppgGgpp####........", // 6: Gold flower stamen buckle
      "........#hhhhh####hhhhh#........", // 7: Crown of hair
      ".......#hHHHHhhhhhhHHHHh#.......", // 8: Hair volume
      "......#hHxxxxHHHHHHxxxxHh#......", // 9: Hair sheen wisps
      ".....#hHHhsssssssssssshHHh#.....", // 10: Hairline with soft side bangs
      ".....#hhssSSssssssssSSsshh#.....", // 11: Forehead with soft highlight
      ".....#hs##ee#ssssss#ee##sh#.....", // 12: Arched natural eyebrows
      ".....#h#weee#ssssss#weee#h#.....", // 13: Expressive eyes with catchlights
      ".....#h#weee#ssssss#weee#h#.....", // 14: Luminous pupils
      "....#GgssssbbssssssbbssssgG#....", // 15: Gold hoop earrings & blush cheeks
      "....#g#dssssssssssssssssd#g#....", // 16: Earring bottom & soft cheek shadow
      ".....#dsssssssSddSsssssssd#.....", // 17: Defined cute nose tip
      "......#dssssssssssssssssd#......", // 18: Philtrum / upper lip contour
      "......#ddssssssmmssssssdd#......", // 19: Warm maternal smile
      ".......#dsssssmMMmsssssd#.......", // 20: Curved lower lip
      "........#DDssssssssssDD#........", // 21: Rounded defined chin
      ".........##DDddddddDD##.........", // 22: Chin shadow separating neck
      ".......##kkkkDssssDkkkk##.......", // 23: Cream sweetheart ruffled collar
      "......#kktctk######ktctkk#......", // 24: Sweetheart collar shape
      ".....#ootcttttttttttttcttk#.....", // 25: Bimpo towel draped on left shoulder
      "....#oootrctyttttttttyttcttk#...", // 26: Towel white/red stripe & floral daster
      "...#oootrcttppttttttpptttcttt#..", // 27: Towel fold & pink floral print
      "..#OOotrctttttttttttttttttcttt#.", // 28: Towel drape & daster body
      "..#OOOtrctttttttttttttttttcttt#.", // 29: Towel shadow & daster drape
      "..#OO######################OO#..", // 30: Bottom frame edge
      "...##......................##..."  // 31
    ];

    const getMoodGrid = (mood, stage = 'default') => {
      const g = [...BASE_GRID];

      if (mood === 'urgent') {
        // Alarmed, worried eyes glancing up/right, sweat at temple
        g[10] = ".....#hHHhssssssssssqQhHHh#....."; // Sweat drop at hairline
        g[11] = ".....#hh#e#SSssssssqQ#e#hh#....."; // Raised worried eyebrows
        g[12] = ".....#hsS#ee#ssssss#ee#Ssh#....."; // Inner brows raised in worry
        g[13] = ".....#h##eee#ssssss#eee##h#....."; // Wide alarmed eyes
        g[14] = ".....#h#weee#ssssss#weee#h#.....";

        if (stage === 'talk1') {
          g[19] = "......#ddsssss####sssssdd#......";
          g[20] = ".......#dssss#MMMM#ssssd#.......";
          g[21] = "........#DDsss####sssDD#........";
        } else if (stage === 'talk2') {
          g[19] = "......#ddssss######ssssdd#......";
          g[20] = ".......#dsss#wwwwww#sssd#.......";
          g[21] = "........#DDs#MMMMMM#sDD#........";
        } else {
          // Default urgent: parted lips gasping
          g[19] = "......#ddsssss####sssssdd#......";
          g[20] = ".......#dssss#MMMM#ssssd#.......";
          g[21] = "........#DDsss####sssDD#........";
        }
      } else if (mood === 'scold') {
        // Stern, fiercely caring motherly scold: sharp angled brows, determined mouth
        g[11] = ".....#hh#ee#ssssssss#ee#hh#....."; // Lowered stern brow angle
        g[12] = ".....#hsS#ee#ssssss#ee#Ssh#....."; // Angled fierce brows
        g[13] = ".....#h##eee#ssssss#eee##h#....."; // Focused reprimanding eyes
        g[14] = ".....#h#weee#ssssss#weee#h#.....";

        if (stage === 'talk1') {
          g[19] = "......#ddssss######ssssdd#......";
          g[20] = ".......#dsss#MMMMMM#sssd#.......";
          g[21] = "........#DDsss####sssDD#........";
        } else if (stage === 'talk2') {
          g[19] = "......#ddsss########sssdd#......";
          g[20] = ".......#dss#wwwwwwww#ssd#.......";
          g[21] = "........#DD#MMMMMMMM#DD#........";
        } else {
          // Default scold: firm, resolute pouting/frowning mouth
          g[19] = "......#ddsssssmmmmsssssdd#......";
          g[20] = ".......#dsssss#mm#sssssd#.......";
          g[21] = "........#DDssssssssssDD#........";
        }
      } else if (mood === 'cheer') {
        // Delighted, proud mother: joyful curved eyes (^ ^), wide radiant smile, prominent blush
        g[11] = ".....#hhssSSssssssssSSsshh#.....";
        g[12] = ".....#hs#eee#ssssss#eee#sh#....."; // High happy eyebrows
        g[13] = ".....#hss#ee#ssssss#ee#ssh#....."; // Joyful curved eye arc (⌒ ⌒)
        g[14] = ".....#hs##ss#ssssss#ss##sh#....."; // Eye smile crease & cheek rise
        g[15] = "....#GgsSbbbssssssssbbbSsgG#...."; // Radiant blushing cheeks

        if (stage === 'talk1') {
          g[19] = "......#ddssss######ssssdd#......";
          g[20] = ".......#dsss#wwwwww#sssd#.......";
          g[21] = "........#DDss#MMuu#ssDD#........";
        } else if (stage === 'talk2') {
          g[19] = "......#ddsss########sssdd#......";
          g[20] = ".......#dss#wwwwwwww#ssd#.......";
          g[21] = "........#DDs#MMuuuu#sDD#........";
        } else {
          // Default cheer: warm happy smile with white teeth showing
          g[19] = "......#ddsssss####sssssdd#......";
          g[20] = ".......#dssss#wwww#ssssd#.......";
          g[21] = "........#DDsss#MM#sssDD#........";
        }
      } else if (mood === 'gold') {
        // Golden Clothespin excited / amazed: sparkling gold diamond glint in eyes, enthusiastic smile
        g[12] = ".....#hs#eee#ssssss#eee#sh#.....";
        g[13] = ".....#h#sGGws#ssss#sGGws#h#....."; // Golden star shine in eyes!
        g[14] = ".....#h#gGGws#ssss#gGGws#h#.....";
        g[15] = "....#GgsSgGgbbssssbbgGgSsgG#....";

        if (stage === 'talk1') {
          g[19] = "......#ddssss######ssssdd#......";
          g[20] = ".......#dsss#wwwwww#sssd#.......";
          g[21] = "........#DDss#MMuu#ssDD#........";
        } else if (stage === 'talk2') {
          g[19] = "......#ddsss########sssdd#......";
          g[20] = ".......#dss#wwwwwwww#ssd#.......";
          g[21] = "........#DDs#MMuuuu#sDD#........";
        } else {
          // Default gold: excited grin
          g[19] = "......#ddsssss####sssssdd#......";
          g[20] = ".......#dssss#wwww#ssssd#.......";
          g[21] = "........#DDsss#MM#sssDD#........";
        }
      } else { // normal
        if (stage === 'talk1') {
          g[19] = "......#ddsssss####sssssdd#......";
          g[20] = ".......#dssss#MMMM#ssssd#.......";
          g[21] = "........#DDsss####sssDD#........";
        } else if (stage === 'talk2') {
          g[19] = "......#ddssss######ssssdd#......";
          g[20] = ".......#dsss#wwwwww#sssd#.......";
          g[21] = "........#DDss#MMuu#ssDD#........";
        } else if (stage === 'blink_half') {
          g[13] = ".....#h#ssssssssssssssss#h#.....";
          g[14] = ".....#hs##ee#ssssss#ee##sh#.....";
        } else if (stage === 'blink_full') {
          g[13] = ".....#h#ssssssssssssssss#h#.....";
          g[14] = ".....#hss##esssssssse##ssh#.....";
        } else if (stage === 'glance') {
          g[13] = ".....#h#eeew#ssssss#eeew#h#.....";
          g[14] = ".....#h#seee#ssssss#seee#h#.....";
        } else if (stage === 'poke') {
          g[11] = ".....#hh#e#SSssssssSS#e#hh#.....";
          g[12] = ".....#hs##ee#ssssss#ee##sh#.....";
          g[13] = ".....#h#weee#ssssss#weee#h#.....";
          g[14] = ".....#h#weee#ssssss#weee#h#.....";
          g[19] = "......#ddsssss####sssssdd#......";
          g[20] = ".......#dssss#uuuu#ssssd#.......";
          g[21] = "........#DDsss####sssDD#........";
        }
      }
      return g;
    };

    const renderGridToCanvas = (grid) => {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      const pctx = c.getContext('2d');
      for (let y = 0; y < 32; y++) {
        const row = grid[y];
        for (let x = 0; x < 32; x++) {
          const ch = row[x];
          if (ch in NANAY_PAL) {
            pctx.fillStyle = NANAY_PAL[ch];
            pctx.fillRect(x, y, 1, 1);
          }
        }
      }
      return c;
    };

    this.nanayPortraits = {};
    this.nanayPortraitsTalk1 = {};
    this.nanayPortraitsTalk2 = {};
    for (const mood of ['normal', 'urgent', 'scold', 'cheer', 'gold']) {
      this.nanayPortraits[mood] = renderGridToCanvas(getMoodGrid(mood, 'default'));
      this.nanayPortraitsTalk1[mood] = renderGridToCanvas(getMoodGrid(mood, 'talk1'));
      this.nanayPortraitsTalk2[mood] = renderGridToCanvas(getMoodGrid(mood, 'talk2'));
    }
    // Backwards compatibility alias
    this.nanayPortraitsTalk = this.nanayPortraitsTalk2;

    // Natural idle micro-expressions & interactive poke reaction
    this.nanayPortraitBlinkHalf = renderGridToCanvas(getMoodGrid('normal', 'blink_half'));
    this.nanayPortraitBlinkFull = renderGridToCanvas(getMoodGrid('normal', 'blink_full'));
    this.nanayPortraitBlink = this.nanayPortraitBlinkFull;
    this.nanayPortraitGlance = renderGridToCanvas(getMoodGrid('normal', 'glance'));
    this.nanayPortraitPoke = renderGridToCanvas(getMoodGrid('normal', 'poke'));
  }

  setNanaySpeech(textTl, textEn, duration = 2.4, mood = 'normal') {
    this.nanaySpeech = {
      textTl,
      textEn,
      timer: duration,
      maxTimer: duration,
      mood,
    };
  }

  drawNanayBubble() {
    if (this.phase !== 'play') return;
    const ctx = this.renderer.ctx;
    if (!ctx) return;

    if (!this.nanayPortraits) {
      this.initNanayPortraits();
    }

    const hasSpeech = Boolean(this.nanaySpeech);
    const mood = (hasSpeech && this.nanaySpeech.mood) ? this.nanaySpeech.mood : 'normal';
    const text = hasSpeech ? (this.currentLang === 'tl' ? this.nanaySpeech.textTl : this.nanaySpeech.textEn) : null;

    ctx.save();

    // 1. Mother Icon around bottom left (visible throughout gameplay as retro arcade HUD avatar)
    const ix = 8;
    const iy = this.renderer.height - 56;
    const pw = 34;
    const ph = 34;

    // Avatar HUD frame is ALWAYS fully opaque solid (alpha = 1.0) so it NEVER flashes or pops on speech exit!
    ctx.globalAlpha = 1.0;

    // Dynamic physics offsets: gentle breathing when idle, speech bobbing when talking, vibration on scold
    let bobY = 0;
    let bobX = 0;
    const speechElapsed = hasSpeech ? (this.nanaySpeech.maxTimer - this.nanaySpeech.timer) : 0;
    if (hasSpeech) {
      bobY = Math.round(Math.sin(speechElapsed * 14) * 0.85);
      if (mood === 'scold') {
        bobX = (Math.floor(speechElapsed * 24) % 2 === 0) ? -1 : 1;
      } else if (mood === 'cheer') {
        bobY = Math.round(Math.sin(speechElapsed * 10) * 1.4);
      }
    } else {
      // Gentle breathing idle rhythm
      const animTime = this.time || this.t || 0;
      const breathCycle = (animTime * 2.5) % (Math.PI * 2);
      bobY = Math.sin(breathCycle) > 0.65 ? -1 : 0;
    }

    // Interactive squish & stretch on tap / click
    let squishX = 0;
    let squishY = 0;
    if (this.nanayPokeTimer > 0) {
      const p = this.nanayPokeTimer / 0.45;
      const elastic = Math.sin(p * Math.PI * 4) * p;
      squishX = elastic * 2.5;
      squishY = -elastic * 2.5;
    }

    // Dynamic portrait: smooth 4-stage mouth flapping during speech, natural multi-stage blink and glance when idle
    let portraitCanvas = null;
    const animTime = this.time || this.t || 0;
    if (this.nanayPokeTimer > 0.15 && this.nanayPortraitPoke) {
      portraitCanvas = this.nanayPortraitPoke;
    } else if (hasSpeech) {
      const talkCycle = Math.floor(speechElapsed * 9) % 4;
      if (talkCycle === 1 && this.nanayPortraitsTalk1 && this.nanayPortraitsTalk1[mood]) {
        portraitCanvas = this.nanayPortraitsTalk1[mood];
      } else if (talkCycle === 2 && this.nanayPortraitsTalk2 && this.nanayPortraitsTalk2[mood]) {
        portraitCanvas = this.nanayPortraitsTalk2[mood];
      } else if (talkCycle === 3 && this.nanayPortraitsTalk1 && this.nanayPortraitsTalk1[mood]) {
        portraitCanvas = this.nanayPortraitsTalk1[mood];
      } else {
        portraitCanvas = this.nanayPortraits && (this.nanayPortraits[mood] || this.nanayPortraits.normal);
      }
    } else {
      const glanceCycle = animTime % 9.0;
      const blinkCycle = animTime % 4.6;

      if (blinkCycle < 0.05 && this.nanayPortraitBlinkHalf) {
        portraitCanvas = this.nanayPortraitBlinkHalf;
      } else if (blinkCycle < 0.16 && this.nanayPortraitBlinkFull) {
        portraitCanvas = this.nanayPortraitBlinkFull;
      } else if (blinkCycle < 0.22 && this.nanayPortraitBlinkHalf) {
        portraitCanvas = this.nanayPortraitBlinkHalf;
      } else if (glanceCycle > 4.2 && glanceCycle < 5.0 && this.nanayPortraitGlance) {
        portraitCanvas = this.nanayPortraitGlance;
      } else {
        portraitCanvas = this.nanayPortraits && this.nanayPortraits.normal;
      }
    }

    // Outer drop shadow
    ctx.fillStyle = '#181210';
    ctx.fillRect(ix + 2, iy + 2, pw, ph);

    // Frame outer border
    ctx.fillRect(ix - 2, iy - 2, pw + 4, ph + 4);

    // Frame background fill based on mood (with subtle urgency pulse if urgent)
    let frameBg = '#f8fafc';
    if (mood === 'urgent') {
      const pulse = Math.sin(animTime * 8) > 0;
      frameBg = pulse ? '#fee2e2' : '#fff1f2';
    } else if (mood === 'scold') {
      frameBg = '#ffe4e6';
    } else if (mood === 'cheer') {
      frameBg = '#dcfce7';
    } else if (mood === 'gold') {
      frameBg = '#fef9c3';
    }
    ctx.fillStyle = frameBg;
    ctx.fillRect(ix, iy, pw, ph);

    // Inner tactile bevel highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(ix, iy, pw, 1);
    ctx.fillRect(ix, iy, 1, ph);
    ctx.fillStyle = 'rgba(24, 18, 16, 0.18)';
    ctx.fillRect(ix, iy + ph - 1, pw, 1);
    ctx.fillRect(ix + pw - 1, iy, 1, ph);

    // Corner stud accents (metallic rivets)
    const studColor = mood === 'gold' ? '#d97706' : (mood === 'urgent' || mood === 'scold' ? '#dc2626' : '#64748b');
    ctx.fillStyle = studColor;
    ctx.fillRect(ix, iy, 2, 2);
    ctx.fillRect(ix + pw - 2, iy, 2, 2);
    ctx.fillRect(ix, iy + ph - 2, 2, 2);
    ctx.fillRect(ix + pw - 2, iy + ph - 2, 2, 2);
    // Stud glint highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillRect(ix, iy, 1, 1);
    ctx.fillRect(ix + pw - 2, iy, 1, 1);
    ctx.fillRect(ix, iy + ph - 2, 1, 1);
    ctx.fillRect(ix + pw - 2, iy + ph - 2, 1, 1);

    // Render portrait canvas cleanly clipped inside avatar HUD frame
    if (portraitCanvas) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(ix, iy, pw, ph);
      ctx.clip();
      if (Math.abs(squishX) > 0.05 || Math.abs(squishY) > 0.05) {
        const cx = ix + pw / 2;
        const cy = iy + ph - 1;
        ctx.translate(cx, cy);
        ctx.scale(1 + squishX / pw, 1 + squishY / ph);
        ctx.drawImage(portraitCanvas, -16 + bobX, -32 + 1 + bobY);
      } else {
        ctx.drawImage(portraitCanvas, ix + 1 + bobX, iy + 1 + bobY);
      }
      ctx.restore();
    }

    // Dynamic Emotion Overlays & Emotes (anchored cleanly to avatar)
    if (mood === 'scold') {
      // Animated Anger Vein Mark (💢) pulsing at top-right over her dark hair
      const aPhase = Math.floor(animTime * 6) % 2;
      const ax = ix + 24;
      const ay = iy + 3;
      ctx.fillStyle = aPhase === 0 ? '#ef4444' : '#fbbf24';
      ctx.fillRect(ax + 1, ay, 1, 5);
      ctx.fillRect(ax + 3, ay, 1, 5);
      ctx.fillRect(ax, ay + 1, 5, 1);
      ctx.fillRect(ax, ay + 3, 5, 1);
    } else if (mood === 'urgent') {
      // Animated dripping sweat bead (💧)
      const drip = Math.floor((animTime * 4) % 3);
      const sx = ix + 24;
      const sy = iy + 9 + drip;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(sx, sy, 2, 2);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(sx, sy, 1, 1);
    } else if (mood === 'cheer') {
      // Twinkling sparkle stars (✦)
      const spPhase = Math.sin(animTime * 7);
      if (spPhase > 0.1) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(ix + pw - 6, iy + 3, 1, 3);
        ctx.fillRect(ix + pw - 7, iy + 4, 3, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ix + pw - 6, iy + 4, 1, 1);
      }
      if (spPhase < -0.1) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(ix + 4, iy + 5, 1, 3);
        ctx.fillRect(ix + 3, iy + 6, 3, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ix + 4, iy + 6, 1, 1);
      }
    } else if (mood === 'gold') {
      // Golden shimmering diamond glimmers (✨)
      const gPhase = Math.sin(animTime * 8);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(ix + pw - 6, iy + (gPhase > 0 ? 3 : 7), 2, 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(ix + pw - 6, iy + (gPhase > 0 ? 3 : 7), 1, 1);
    }

    // Tap / Poke Startle Emote (!) popping up centered above head bun
    if (this.nanayPokeTimer > 0.12) {
      const popP = (0.45 - this.nanayPokeTimer) / 0.33;
      const popY = iy - 9 - Math.round(Math.min(1, popP) * 4);
      const popX = ix + Math.round(pw / 2) - 3;
      ctx.fillStyle = '#181210';
      ctx.fillRect(popX, popY, 6, 8);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(popX + 1, popY + 1, 4, 6);
      ctx.fillStyle = '#181210';
      ctx.fillRect(popX + 2, popY + 2, 2, 3);
      ctx.fillRect(popX + 2, popY + 6, 2, 1);
    }

    // 2. Chat Bubble Connecting to Mother's Icon (when Mother has speech)
    if (hasSpeech && text) {
      let bubbleAlpha = 1;
      const timer = this.nanaySpeech.timer;
      if (timer < 0.35) {
        bubbleAlpha = timer / 0.35;
      }
      bubbleAlpha = Math.max(0, Math.min(1, bubbleAlpha));
      ctx.globalAlpha = bubbleAlpha;

      ctx.font = '6px "Press Start 2P", monospace';
      const maxLineW = 160;

      // Robust word wrap with splitting for ultra-long tokens
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      for (const w of words) {
        if (ctx.measureText(w).width > maxLineW) {
          if (currentLine) { lines.push(currentLine); currentLine = ''; }
          let sub = '';
          for (const ch of w) {
            if (ctx.measureText(sub + ch + '-').width > maxLineW) {
              lines.push(sub + '-');
              sub = ch;
            } else {
              sub += ch;
            }
          }
          if (sub) currentLine = sub;
          continue;
        }

        const testLine = currentLine ? `${currentLine} ${w}` : w;
        if (ctx.measureText(testLine).width > maxLineW && currentLine) {
          lines.push(currentLine);
          currentLine = w;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const speakerTag = this.currentLang === 'tl' ? 'NANAY' : 'MOM';
      ctx.font = '6px "Press Start 2P", monospace';
      const tagW = ctx.measureText(speakerTag).width;
      const maxMeasuredW = Math.max(tagW + 12, ...lines.map(l => ctx.measureText(l).width));
      const bw = Math.min(185, Math.max(82, Math.round(maxMeasuredW + 18)));
      const lineHeight = 10;
      const bh = Math.max(ph, 20 + lines.length * lineHeight);

      const bx = 50;
      let by = iy + Math.round((ph - bh) / 2);
      by = Math.max(this.renderer.height - 120, Math.min(this.renderer.height - bh - 6, by));

      // Record rect for interactive dismiss click
      this.lastNanayBubbleRect = { x: bx - 2, y: by - 2, w: bw + 4, h: bh + 4 };

      // Outer drop shadow
      ctx.fillStyle = '#181210';
      ctx.fillRect(bx + 2, by + 2, bw, bh);

      // Outer card border
      ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);

      // Bubble card background fill
      let cardBg = '#fffefb';
      if (mood === 'urgent' || mood === 'scold') cardBg = '#fff5f5';
      if (mood === 'gold') cardBg = '#fffde7';
      if (mood === 'cheer') cardBg = '#f0fff4';
      ctx.fillStyle = cardBg;
      ctx.fillRect(bx, by, bw, bh);

      // Connecting pointer tail: connects left edge of chat bubble (bx) directly to Mother's icon frame
      const tailTipX = ix + pw + 2; // Right edge of Mother's frame border (x=44)
      const my = Math.min(by + bh - 6, Math.max(by + 8, iy + 20 + bobY)); // Aligned to Mother's mouth level

      // Black tail outline triangle
      ctx.fillStyle = '#181210';
      ctx.beginPath();
      ctx.moveTo(bx, my - 5);
      ctx.lineTo(tailTipX, my);
      ctx.lineTo(bx, my + 5);
      ctx.fill();

      // Card interior + tail seamless fill
      ctx.fillStyle = cardBg;
      ctx.beginPath();
      ctx.moveTo(bx + 1, my - 3);
      ctx.lineTo(tailTipX + 1.5, my);
      ctx.lineTo(bx + 1, my + 3);
      ctx.fill();

      // Clear the border seam between bubble and tail so they form one contiguous speech balloon
      ctx.fillRect(bx - 2, my - 3, 3, 7);

      // Speaker Name Tag Badge
      let tagBg = '#0e8fa9';
      if (mood === 'urgent' || mood === 'scold') tagBg = '#ce1126';
      if (mood === 'gold') tagBg = '#d97706';
      if (mood === 'cheer') tagBg = '#059669';

      const badgeW = Math.round(tagW + 8);
      const badgeH = 10;
      const badgeX = bx + 7;
      const badgeY = by + 5;

      // Badge outline & fill
      ctx.fillStyle = '#1c1b19';
      ctx.fillRect(badgeX - 1, badgeY - 1, badgeW + 2, badgeH + 2);
      ctx.fillStyle = tagBg;
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

      // Badge text in white
      ctx.font = '5.5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(speakerTag, badgeX + Math.round(badgeW / 2), badgeY + Math.round(badgeH / 2) + 0.5);

      // Dialogue text in crisp dark ink
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1c1b19';
      lines.forEach((line, idx) => {
        ctx.fillText(line, bx + 8, by + 19 + idx * lineHeight);
      });
    } else {
      this.lastNanayBubbleRect = null;
    }

    ctx.restore();
  }

  showRoundBanner(roundNum, isClear = false) {
    // When starting a Yugto (!isClear), show the Yugto banner for 1.3s (3.6 -> 2.3),
    // then immediately flash the giant retro Japanese arcade 3-2-1-GO! for 2.3s (2.3 -> 0.0).
    this.roundBanner = {
      round: roundNum,
      isClear,
      timer: isClear ? 2.2 : 3.6,
      totalTimer: isClear ? 2.2 : 3.6,
    };
  }

  isInCutscene() {
    return Boolean(this.roundTransitionTimer > 0 || (this.roundBanner && this.roundBanner.timer > 0));
  }

  getCountdownStep() {
    if (this.roundBanner && !this.roundBanner.isClear && this.roundBanner.timer <= 2.30) {
      const t = this.roundBanner.timer;
      if (t > 1.70) return '3';
      if (t > 1.10) return '2';
      if (t > 0.50) return '1';
      if (t > 0.00) return 'GO!';
    }
    return null;
  }

  drawRoundBanner() {
    if (!this.roundBanner || this.phase !== 'play') return;
    const ctx = this.renderer.ctx;
    if (!ctx) return;

    const b = this.roundBanner;
    const countdownStep = this.getCountdownStep();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const w = this.renderer.width;
    const h = this.renderer.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    // Phase 1: Yugto Intro Card or Round Cleared Card (Warm Paper & Ink Aesthetic)
    if (!countdownStep) {
      const boxW = 284;
      const boxH = 58;
      const bx = Math.round(cx - boxW / 2);
      const by = Math.round(cy - boxH / 2 - 6);

      // Hard offset ink block shadow
      ctx.fillStyle = '#1c1b19';
      ctx.fillRect(bx + 5, by + 5, boxW, boxH);

      // Warm cream card body
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(bx, by, boxW, boxH);

      // Crisp 3px ink border
      ctx.strokeStyle = '#1c1b19';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, boxW, boxH);

      // Top flag accent stripe
      ctx.fillStyle = b.isClear ? '#1e9e52' : '#f5b800';
      ctx.fillRect(bx + 3, by + 3, boxW - 6, 5);

      // Inner dashed komiks/stamp frame
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#ded8cc';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + 6, by + 11, boxW - 12, boxH - 17);
      ctx.restore();

      let titleText, subText;
      if (b.isClear) {
        const nextRound = Math.min(this.maxRounds, b.round + 1);
        titleText = this.currentLang === 'tl' ? `YUGTO ${b.round} TAPOS NA!` : `ROUND ${b.round} CLEARED!`;
        subText = this.currentLang === 'tl'
          ? `MAGHANDA SA YUGTO ${nextRound}!`
          : `GET READY FOR ROUND ${nextRound}!`;
      } else {
        if (b.round === 1) {
          titleText = this.currentLang === 'tl' ? 'YUGTO 1: MAALIWALAS' : 'ROUND 1: CLEAR SKIES';
          subText = this.currentLang === 'tl' ? 'Banayad na simoy. Magsanay ng combo!' : 'Gentle breeze. Practice quick combos!';
        } else if (b.round === 2) {
          titleText = this.currentLang === 'tl' ? 'YUGTO 2: HANGING HABAGAT' : 'ROUND 2: MONSOON WINDS';
          subText = this.currentLang === 'tl' ? 'Malakas na hangin! Saluhin sa ere!' : 'Strong gusts! Catch flying clothes!';
        } else {
          titleText = this.currentLang === 'tl' ? 'YUGTO 3: SIGNAL NO. 1' : 'ROUND 3: TYPHOON PANIC';
          subText = this.currentLang === 'tl' ? 'Dumidilim na! Ipasok ang lahat!' : 'Heavy storm incoming! Save everything!';
        }
      }

      // Layered flat pixel title (matching .title-logo)
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#f5b800';
      ctx.fillText(titleText, cx + 1, by + 25);
      ctx.fillStyle = b.isClear ? '#1e9e52' : '#0d5cc6';
      ctx.fillText(titleText, cx, by + 24);

      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#1c1b19';
      ctx.fillText(subText, cx, by + 42);
    }

    // Phase 2: True Pixel-Grid Retro Arcade Countdown (3 - 2 - 1 - GO!)
    // Drawn with exact integer pixel blocks (zero font anti-aliasing blur, no box hiding the clothes!)
    if (countdownStep) {
      const isGo = countdownStep === 'GO!';
      let beatProgress = 0;
      if (countdownStep === '3') {
        beatProgress = (2.30 - b.timer) / 0.60;
      } else if (countdownStep === '2') {
        beatProgress = (1.70 - b.timer) / 0.60;
      } else if (countdownStep === '1') {
        beatProgress = (1.10 - b.timer) / 0.60;
      } else {
        beatProgress = (0.50 - b.timer) / 0.50;
      }
      beatProgress = Math.max(0, Math.min(1, beatProgress));

      const GLYPHS = {
        '3': [
          '11111110',
          '11111111',
          '00000111',
          '00111110',
          '00111110',
          '00000111',
          '11000111',
          '11111111',
          '01111110',
        ],
        '2': [
          '01111110',
          '11111111',
          '11000111',
          '00001110',
          '00111100',
          '01110000',
          '11100000',
          '11111111',
          '11111111',
        ],
        '1': [
          '00011100',
          '00111100',
          '01111100',
          '00011100',
          '00011100',
          '00011100',
          '00011100',
          '01111111',
          '01111111',
        ],
        'G': [
          '01111110',
          '11111111',
          '11100000',
          '11101111',
          '11101111',
          '11100111',
          '11100111',
          '11111111',
          '01111110',
        ],
        'O': [
          '01111110',
          '11111111',
          '11100111',
          '11100111',
          '11100111',
          '11100111',
          '11100111',
          '11111111',
          '01111110',
        ],
        '!': [
          '111',
          '111',
          '111',
          '111',
          '111',
          '111',
          '000',
          '111',
          '111',
        ],
      };

      // Integer pixel scale pops on beat entry (e.g. 8px -> 7px for digits, 7px -> 6px for GO!)
      const isSlam = beatProgress < 0.22;
      const isFlash = beatProgress < 0.36 && (Math.floor(this.time * 24) % 2 === 0);
      const px = isGo ? (isSlam ? 7 : 6) : (isSlam ? 8 : 7);
      const gapCols = 1;

      const chars = countdownStep.split('');
      const rows = 9;
      let totalCols = 0;
      for (let i = 0; i < chars.length; i++) {
        totalCols += GLYPHS[chars[i]][0].length + (i < chars.length - 1 ? gapCols : 0);
      }

      // Build combined bitmap grid
      const grid = Array.from({ length: rows }, () => new Uint8Array(totalCols));
      let colCursor = 0;
      for (let i = 0; i < chars.length; i++) {
        const g = GLYPHS[chars[i]];
        const gw = g[0].length;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < gw; c++) {
            if (g[r][c] === '1') grid[r][colCursor + c] = 1;
          }
        }
        colCursor += gw + gapCols;
      }

      const startX = Math.round(cx - (totalCols * px) / 2);
      const startY = Math.round(cy - (rows * px) / 2);

      // Palette matching Sampayan Rush (Warm Cream, Sun Gold, Flag Blue, Flag Red, Fiesta Green, Ink)
      let topColor, botColor, bevelColor;
      if (isFlash) {
        topColor = '#fffdf8';
        botColor = '#f5b800';
        bevelColor = '#ffffff';
      } else if (countdownStep === '3') {
        topColor = '#ffd034';
        botColor = '#f5b800';
        bevelColor = '#fffdf8';
      } else if (countdownStep === '2') {
        topColor = '#f5b800';
        botColor = '#e65100';
        bevelColor = '#fffdf8';
      } else if (countdownStep === '1') {
        topColor = '#ef5350';
        botColor = '#d32f2f';
        bevelColor = '#fffdf8';
      } else {
        topColor = '#2ded82';
        botColor = '#1e9e52';
        bevelColor = '#fffdf8';
      }

      const borderPx = Math.max(3, Math.round(px * 0.55));
      const shadowPx = Math.max(5, Math.round(px * 0.85));

      // Pass 1: Hard Neo-Brutalist Ink Block Shadow & Outline (#1c1b19)
      ctx.fillStyle = '#1c1b19';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < totalCols; c++) {
          if (!grid[r][c]) continue;
          const x = startX + c * px;
          const y = startY + r * px;
          // Crisp pixel outline around cell
          ctx.fillRect(x - borderPx, y - borderPx, px + borderPx * 2, px + borderPx * 2);
          // Deep 3D offset block shadow
          ctx.fillRect(x + shadowPx, y + shadowPx, px + borderPx, px + borderPx);
        }
      }

      // Pass 2: Sun Gold / Cream Mid-Extrusion Layer
      ctx.fillStyle = isGo ? '#f5b800' : '#1c1b19';
      const midOff = Math.max(2, Math.round(px * 0.35));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < totalCols; c++) {
          if (!grid[r][c]) continue;
          const x = startX + c * px;
          const y = startY + r * px;
          ctx.fillRect(x + midOff, y + midOff, px, px);
        }
      }

      // Pass 3: Crisp Flat Pixel Face (2-tone stepped split, zero smooth gradient!)
      for (let r = 0; r < rows; r++) {
        ctx.fillStyle = r < 4 ? topColor : botColor;
        for (let c = 0; c < totalCols; c++) {
          if (!grid[r][c]) continue;
          const x = startX + c * px;
          const y = startY + r * px;
          ctx.fillRect(x, y, px, px);
        }
      }

      // Pass 4: Crisp Top-Edge Pixel Specular Highlight (on cells with no active cell above)
      const hiH = Math.max(2, Math.round(px * 0.32));
      ctx.fillStyle = bevelColor;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < totalCols; c++) {
          if (!grid[r][c]) continue;
          if (r === 0 || !grid[r - 1][c]) {
            const x = startX + c * px;
            const y = startY + r * px;
            ctx.fillRect(x, y, px, hiH);
          }
        }
      }
    }

    ctx.restore();
  }

  drawGoldenAura() {
    const ctx = this.renderer.ctx;
    if (!ctx) return;
    const pulse = (Math.sin(this.time * 10) + 1) * 0.5;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.45 + pulse * 0.45})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, this.renderer.width - 4, this.renderer.height - 4);
    ctx.restore();
  }

  /* ---------- Render Frame ---------- */
  draw() {
    this.renderer.clear();
    this.itemBuf.fill(0);

    const windT = Math.floor(this.time * 8) / 8;
    const storm = this.stormLevel();
    const isRaining = this.rainLevel() > 0;
    const isStorming = storm > 0.25;

    // Nanay's posture: Nakapamewang (left hand on hip), right arm waves when weather turns stormy
    const armR = isRaining ? 2.65 + Math.sin(this.time * 6) * 0.35 : isStorming ? 0.65 + Math.sin(this.time * 2.5) * 0.2 : 0.18;
    const armL = isRaining ? 2.60 - Math.sin(this.time * 6) * 0.35 : 0.18;

    const nanayYaw = this.nanayFacingYaw != null ? this.nanayFacingYaw : (this.renderer.yaw + 0.12);
    this.drawNanay(-8.5, 3.8, nanayYaw, {
      scale: 1.35,
      armR,
      armL,
      stance: 0.12,
      lean: Math.sin(this.time * 1.8) * 0.015,
    });

    this.drawBatya(this.basketBounce);
    this.drawPile();

    for (const item of this.items) {
      if (item.state !== 'basket' && item.state !== 'lost') this.drawCloth(item, windT);
    }

    if (this.cat && this.cat.active) {
      this.renderer.castShadow(this.cat.x, this.cat.y, this.cat.z, 0.45);
    }

    this.renderer.drawLeaves(windT);
    this.renderer.flushShadows();
    this.renderer.applyShadows(this.renderer.groundZ);
    this.renderer.shadeEdges();

    if (this.smokeEvent && this.smokeEvent.particles && this.smokeEvent.particles.length > 0) {
      this.renderer.drawSmokeParticles(this.smokeEvent.particles);
    }

    this.renderer.gradeStorm(storm, windT, this.wetness, this.flash, this.puddle);
    this.renderer.drawClouds(storm, windT, this.clouds);
    this.renderer.drawBolt(this.bolt);
    this.renderer.drawRain(this.drops, this.splashes, this.gustGlow);

    if (this.held && !this.auto) {
      const isOver = this.overBasket(this.held);
      const p = this.renderer.project(this.BASKET.x, this.BASKET.y, this.BASKET.h + 1.3);
      this.renderer.drawArrow(p.sx, p.sy, this.time, isOver);
    }

    this.renderer.present();

    // 2D Arcade Feedback overlays rendered on canvas ctx
    if (this.freezeTimer > 0) {
      this.drawGoldenAura();
    }

    // Soot & Paw smudges on soiled clothes
    for (const item of this.items) {
      if (item.soiled && (item.state === 'line' || item.state === 'falling' || item.state === 'tossed' || item.state === 'loose' || item.state === 'ground' || item.state === 'held')) {
        const p = this.renderer.project(item.x, item.y, item.z - 0.4);
        if (p.d > -1e8) {
          this.renderer.drawSootSmudge(this.renderer.ctx, p.sx, p.sy, item.soiled === 'paw' ? 'paw' : 'smoke');
        }
      }
    }

    // Munin Cat pixel art
    if (this.cat && this.cat.active) {
      this.renderer.drawMuninCat(this.cat, this.time);
    }

    // Urgent Utos beacon indicator
    if (this.utos && this.utos.active && this.utos.item) {
      this.drawUtosBeacon(this.utos.item);
    }

    this.drawFloaters();
    this.drawNanayBubble();
    this.drawRoundBanner();
    if (this.phase === 'play' && this.paused) {
      this.drawPauseOverlay();
    }
  }

  drawPauseOverlay() {
    const ctx = this.renderer.ctx;
    if (!ctx) return;

    ctx.save();
    // Dimmer backdrop
    ctx.fillStyle = 'rgba(28, 27, 25, 0.72)';
    ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);

    if (this.confirmingQuit) {
      // Centered pixel quit confirmation box
      const boxW = 260;
      const boxH = 76;
      const bx = Math.round((this.renderer.width - boxW) / 2);
      const by = Math.round((this.renderer.height - boxH) / 2);

      ctx.fillStyle = '#1c1b19';
      ctx.fillRect(bx + 4, by + 4, boxW, boxH);
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = '#ce1126';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, boxW, boxH);

      // Top warning stripe
      ctx.fillStyle = '#ce1126';
      ctx.fillRect(bx + 3, by + 3, boxW - 6, 4);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const titleText = this.currentLang === 'tl' ? 'BABALIK SA TITLE?' : 'QUIT TO MAIN MENU?';
      const promptText = this.currentLang === 'tl' ? 'SIGURADO KA BA?' : 'ARE YOU SURE?';
      const subText = this.currentLang === 'tl' ? '[ENTER/Y] OO  •  [ESC/N] HINDI' : '[ENTER/Y] YES  •  [ESC/N] NO';

      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#ce1126';
      ctx.fillText(titleText, this.renderer.width / 2, by + 22);

      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#1c1b19';
      ctx.fillText(promptText, this.renderer.width / 2, by + 40);

      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#0d5cc6';
      ctx.fillText(subText, this.renderer.width / 2, by + 58);
    } else {
      // Centered pixel pause banner box
      const boxW = 260;
      const boxH = 74;
      const bx = Math.round((this.renderer.width - boxW) / 2);
      const by = Math.round((this.renderer.height - boxH) / 2);

      ctx.fillStyle = '#1c1b19';
      ctx.fillRect(bx + 4, by + 4, boxW, boxH);
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = '#1c1b19';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, boxW, boxH);

      // Inner accent stripe
      ctx.fillStyle = '#f5b800';
      ctx.fillRect(bx + 3, by + 3, boxW - 6, 4);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const titleText = this.currentLang === 'tl' ? 'NAKA-PAUSE ANG LARO' : 'GAME PAUSED';
      const subText = this.currentLang === 'tl' ? '[P] ITULOY  •  [R] ULITIN' : '[P] RESUME  •  [R] RESTART';
      const menuText = this.currentLang === 'tl' ? '[M] MAIN MENU' : '[M] MAIN MENU';

      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillStyle = '#1c1b19';
      ctx.fillText(titleText, this.renderer.width / 2, by + 24);

      ctx.font = '7.5px "Press Start 2P", monospace';
      ctx.fillStyle = '#0d5cc6';
      ctx.fillText(subText, this.renderer.width / 2, by + 44);

      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#ce1126';
      ctx.fillText(menuText, this.renderer.width / 2, by + 58);
    }

    ctx.restore();
  }

  /* ---------- User Input Event Handling ---------- */
  toCanvas(e) {
    const r = this.renderer.canvas.getBoundingClientRect();
    const rw = r.width || 1, rh = r.height || 1;
    return {
      x: (e.clientX - r.left) * this.renderer.width / rw,
      y: (e.clientY - r.top) * this.renderer.height / rh,
    };
  }

  pickAt(sx, sy) {
    // 1. Pixel buffer search with generous radius
    for (let radius = 0; radius <= 14; radius++) {
      const foundItems = [];
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const ix = Math.round(sx) + dx, iy = Math.round(sy) + dy;
          if (ix < 0 || iy < 0 || ix >= this.renderer.width || iy >= this.renderer.height) continue;
          const id = this.itemBuf[iy * this.renderer.width + ix];
          if (id) {
            const item = this.items[id - 1];
            if (item && item.state !== 'basket' && item.state !== 'lost' && item.state !== 'held' && !foundItems.includes(item)) {
              foundItems.push(item);
            }
          }
        }
      }
      if (foundItems.length > 0) {
        if (foundItems.length === 1) return foundItems[0];
        foundItems.sort((a, b) => {
          const da = this.renderer.project(a.x, a.y, a.state === 'ground' ? 0.6 : a.z).d;
          const db = this.renderer.project(b.x, b.y, b.state === 'ground' ? 0.6 : b.z).d;
          return db - da;
        });
        return foundItems[0];
      }
    }

    // 2. Geometric screen-space bounding fallback (detects clicks on clothespins, lines, fluttering & ground items)
    const candidates = [];
    for (const item of this.items) {
      if (item.state === 'basket' || item.state === 'lost' || item.state === 'held') continue;

      if (item.state === 'ground') {
        const p = this.renderer.project(item.x, item.y, 0.6);
        const dist = Math.hypot(sx - p.sx, sy - p.sy);
        const hitR = Math.max(item.w * this.renderer.scale * 0.8, 18);
        if (dist <= hitR) {
          candidates.push({ item, dist, d: p.d });
        }
      } else {
        const top = this.renderer.project(item.x, item.y, item.z + 0.15);
        const bot = this.renderer.project(item.x, item.y, item.z - item.h);
        const mid = this.renderer.project(item.x, item.y, item.z - item.h * 0.45);

        const halfW = Math.max(item.w * this.renderer.scale * 0.65, 14);
        const minY = Math.min(top.sy, bot.sy) - 10;
        const maxY = Math.max(top.sy, bot.sy) + 10;

        if (sx >= mid.sx - halfW && sx <= mid.sx + halfW && sy >= minY && sy <= maxY) {
          const dist = Math.hypot(sx - mid.sx, sy - mid.sy);
          const p = this.renderer.project(item.x, item.y, item.z);
          candidates.push({ item, dist, d: p.d });
        }
      }
    }

    if (candidates.length > 0) {
      // Sort front-to-back (d descending), breaking ties with distance to click center
      candidates.sort((a, b) => (b.d - a.d) || (a.dist - b.dist));
      return candidates[0].item;
    }

    return null;
  }

  bindEvents() {
    const canvas = this.renderer.canvas;

    canvas.addEventListener('pointerdown', e => {
      this.audio.ensureContext();
      canvas.focus({ preventScroll: true });

      // Canvas clicks must never trigger game restart; block interaction while paused or in a Yugto / 3-2-1-GO! cutscene.
      if (this.phase !== 'play' || this.paused || this.isInCutscene()) return;

      this.pointer = this.toCanvas(e);

      // Interactive click / tap reaction on Mother's Icon at bottom-left
      if (!this.held && this.pointer.x >= 6 && this.pointer.x <= 44 && this.pointer.y >= this.renderer.height - 60 && this.pointer.y <= this.renderer.height - 18) {
        this.nanayPokeTimer = 0.45;
        if (!this.nanaySpeech || (this.nanaySpeech.maxTimer - this.nanaySpeech.timer) >= 0.25) {
          const clickQuotesTl = [
            "Kilos na, Nak! Mag-aamoy kulob ang mga damit!",
            "Aba, bakit ako pinipindot mo? Yung sampayan asikasuhin mo!",
            "Huwag kang tatanga-tanga dyan, bilisan mo!",
            "Unahin mo yung mga uniporme at makakapal!",
          ];
          const clickQuotesEn = [
            "Move it, son! The clothes will smell musty!",
            "Why are you tapping me? Take care of the clotheslines!",
            "Don't just daydream, hurry up!",
            "Grab the uniforms and thick clothes first!",
          ];
          const cIdx = Math.floor(Math.random() * clickQuotesTl.length);
          this.setNanaySpeech(clickQuotesTl[cIdx], clickQuotesEn[cIdx], 2.4, 'scold');
          this.audio.playSfx('pop');
        }
        return;
      }

      // Interactive click on Chat Bubble dismisses it
      if (!this.held && this.nanaySpeech && this.lastNanayBubbleRect) {
        const br = this.lastNanayBubbleRect;
        if (this.pointer.x >= br.x && this.pointer.x <= br.x + br.w &&
            this.pointer.y >= br.y && this.pointer.y <= br.y + br.h) {
          this.nanaySpeech = null;
          this.audio.playSfx('pop');
          return;
        }
      }

      // Munin Cat interaction ("Tsupe!")
      if (this.cat && this.cat.active && this.cat.state !== 'flee') {
        const catProj = this.renderer.project(this.cat.x, this.cat.y, this.cat.z);
        if (catProj.d > -1e8) {
          const dx = this.pointer.x - catProj.sx;
          const dy = this.pointer.y - (catProj.sy - 12);
          if (Math.abs(dx) <= 24 && Math.abs(dy) <= 20) {
            this.shooCat();
            return;
          }
        }
      }

      // If already holding an item, clicking drops or banks it (ignore clicks during auto-salba flight)
      if (this.held) {
        if (this.auto) return;

        // Multi-salba: If currently holding a light item and clicked another light item, scoop it!
        if (this.held.weight === 'light' && (!this.heldItems || this.heldItems.length < 1)) {
          const secondItem = this.pickAt(this.pointer.x, this.pointer.y);
          if (secondItem && secondItem !== this.held && secondItem.weight === 'light' && (secondItem.state === 'line' || secondItem.state === 'falling' || secondItem.state === 'ground')) {
            if (!this.heldItems) this.heldItems = [];
            secondItem.pinsRemaining = 0;
            secondItem.state = 'held';
            this.heldItems.push(secondItem);
            this.audio.playSfx('pop');
            const p = this.renderer.project(secondItem.x, secondItem.y, secondItem.z);
            this.addFloater(this.currentLang === 'tl' ? 'MULTI-SALBA! 🧺' : 'MULTI-CARRY! 🧺', p.sx, p.sy - 12, '#38bdf8', 6);
            return;
          }
        }

        this.letGo();
        return;
      }

      const item = this.pickAt(this.pointer.x, this.pointer.y);
      if (!item) return;

      this.pointerDownItem = item;
      this.pointerDownPos = { x: this.pointer.x, y: this.pointer.y };
      this.pointerDownTime = performance.now();
      this.pointerHistory = [{ x: this.pointer.x, y: this.pointer.y, t: this.pointerDownTime }];

      try { canvas.setPointerCapture(e.pointerId); } catch {}
      this.grab(item, false);
    });

    // Window-level tracking ensures fluid 1:1 movement even when cursor exits canvas
    window.addEventListener('pointermove', e => {
      if (this.paused || this.isInCutscene()) return;

      // Decisive yank pull for stubborn 2-sipit heavy items during drag
      if (!this.held && this.pointerDownPos && this.pointerDownItem && this.pointerDownItem.state === 'line' && this.pointerDownItem.pinsRemaining === 1) {
        const cur = this.toCanvas(e);
        const distMoved = Math.hypot(cur.x - this.pointerDownPos.x, cur.y - this.pointerDownPos.y);
        if (distMoved > 12) {
          this.grab(this.pointerDownItem, false);
          this.pointer = cur;
          this.pointerDownItem = null;
          return;
        }
      }

      if (this.held && !this.auto) {
        this.pointer = this.toCanvas(e);
        const now = performance.now();
        if (!this.pointerHistory) this.pointerHistory = [];
        this.pointerHistory.push({ x: this.pointer.x, y: this.pointer.y, t: now });
        if (this.pointerHistory.length > 20) {
          this.pointerHistory.splice(0, this.pointerHistory.length - 20);
        }

        // Multi-salba: swiping across a second light item scoops it into carry bundle
        if (this.held.weight === 'light' && (!this.heldItems || this.heldItems.length < 1)) {
          const secondItem = this.pickAt(this.pointer.x, this.pointer.y);
          if (secondItem && secondItem !== this.held && secondItem.weight === 'light' && (secondItem.state === 'line' || secondItem.state === 'falling' || secondItem.state === 'ground')) {
            if (!this.heldItems) this.heldItems = [];
            secondItem.pinsRemaining = 0;
            secondItem.state = 'held';
            this.heldItems.push(secondItem);
            this.audio.playSfx('pop');
            const p = this.renderer.project(secondItem.x, secondItem.y, secondItem.z);
            this.addFloater(this.currentLang === 'tl' ? 'MULTI-SALBA! 🧺' : 'MULTI-CARRY! 🧺', p.sx, p.sy - 12, '#38bdf8', 6);
          }
        }
      }
    });

    const onPointerRelease = (e) => {
      if (this.paused) return;
      if (this.pointerDownItem) this.pointerDownItem = null;

      // pointercancel immediately drops the item without preserving click-to-carry
      if (e && e.type === 'pointercancel') {
        if (this.held && !this.auto) {
          this.letGo();
        }
        return;
      }

      if (!this.auto && this.held) {
        const now = performance.now();
        if (e && e.clientX != null) {
          this.pointer = this.toCanvas(e);
          if (!this.pointerHistory) this.pointerHistory = [];
          this.pointerHistory.push({ x: this.pointer.x, y: this.pointer.y, t: now });
        }
        const downPos = this.pointerDownPos || this.pointer || { x: 0, y: 0 };
        const currentPos = this.pointer || downPos;
        const distMoved = Math.hypot(currentPos.x - downPos.x, currentPos.y - downPos.y);
        const elapsed = now - (this.pointerDownTime || 0);

        const isOverBasket = this.overBasket(this.held);
        const isQuickTap = distMoved < 6 && elapsed < 180;

        // If quick tap outside basket, keep held for click-to-carry until next click
        if (isQuickTap && !isOverBasket) {
          return;
        }

        this.letGo();
      }
    };

    // Listening on window captures all pointerup & pointercancel events (bubbled from canvas or released outside)
    window.addEventListener('pointerup', onPointerRelease);
    window.addEventListener('pointercancel', onPointerRelease);

    window.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if ((e.key === 'p' || e.key === 'P') && !e.repeat) {
        if (this.phase === 'play') {
          if (this.confirmingQuit) {
            e.preventDefault();
            this.cancelQuitConfirm();
            return;
          }
          e.preventDefault();
          this.togglePause();
        }
        return;
      }

      if ((e.key === 'm' || e.key === 'M') && !e.repeat) {
        if (this.phase === 'play' && this.paused && !this.confirmingQuit) {
          e.preventDefault();
          this.requestQuitConfirm();
        }
        return;
      }

      if ((e.key === 'r' || e.key === 'R') && !e.repeat) {
        if (this.confirmingQuit) return;
        if (this.phase === 'play' || this.phase === 'over') {
          e.preventDefault();
          this.restart();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (this.confirmingQuit) {
          e.preventDefault();
          this.cancelQuitConfirm();
          return;
        }
        if (this.held && !this.auto && !this.paused) {
          this.letGo();
          return;
        }
        if (this.phase === 'play') {
          e.preventDefault();
          this.togglePause();
          return;
        }
      }

      if ((e.key === 'y' || e.key === 'Y') && this.confirmingQuit) {
        e.preventDefault();
        this.confirmQuitToTitle();
        return;
      }

      if ((e.key === 'n' || e.key === 'N') && this.confirmingQuit) {
        e.preventDefault();
        this.cancelQuitConfirm();
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        if (this.confirmingQuit) {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.confirmQuitToTitle();
          }
          return;
        }
        if (this.phase === 'play' && !this.paused && !this.isInCutscene()) {
          e.preventDefault();
          this.audio.ensureContext();
          if (e.repeat || this.held) return;
          const item = this.nextItem();
          if (item) this.grab(item, true);
        } else if (this.phase === 'title') {
          e.preventDefault();
          this.audio.ensureContext();
          this.start();
        } else if (this.phase === 'over' && this.overT > 0.5) {
          e.preventDefault();
          this.audio.ensureContext();
          this.start();
        }
      }
    });

    window.addEventListener('resize', () => {
      this.renderer.fit();
    });
  }
}

// Support both script-tag globals and ES modules
if (typeof window !== 'undefined') {
  window.SampayanGame = SampayanGame;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SampayanGame };
}
