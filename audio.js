'use strict';

/**
 * SampayanAudio
 * 100% Procedural Web Audio engine for Sampayan Rush.
 * Eliminates external MP3 dependencies with:
 * - Dynamic procedural retro Filipino chiptune background music (Calm vs Storm themes)
 * - Synthesized sound effects (sipit snap, batya drop + score chime, wind gust, thunder, rain, victory, fail)
 * - Procedural dynamic rain generator tied to weather progression
 * - Clean localStorage-backed mute state management
 */
class SampayanAudio {
  constructor(options = {}) {
    this.ac = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.rainGain = null;
    this.rainSource = null;
    this.noiseBuffer = null;

    // Load persistent mute state
    this.muted = this.loadMuteState();

    // Sequencer state
    this.step = 0;
    this.stepTimer = null;
    this.nextNoteTime = 0;
    this.tempo = 124; // BPM
    this.currentRound = 1;
    this.stormLevel = 0;
    this.rainLevel = 0;
    this.isPlayingBgm = false;

    // Callback listeners
    this.onMuteChangeCallbacks = [];

    // Scale notes in Hz
    this.N = {
      C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, Gs2: 103.83, A2: 110.00, B2: 123.47,
      C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Gs4: 415.30, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Gs5: 830.61, A5: 880.00, B5: 987.77,
      C6: 1046.50, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, Gs6: 1661.22, A6: 1760.00, B6: 1975.53,
      C7: 2093.00, D7: 2349.32, E7: 2637.02, G7: 3135.96, C8: 4186.01,
    };

    const N = this.N;

    // YUGTO 1: "Bahay Kubo" (Traditional Tagalog Folk Song — 100% Public Domain)
    // 192-step authentic arcade 3/4 waltz arrangement in C Major (16 bars × 12 sixteenths).
    // Every Filipino instantly recognizes: "Bahay kubo, kahit munti, ang halaman doon ay sari-sari..."
    // Rhythm: Authentic 3/4 waltz holding downbeat syllables for 2 beats with pickup on Beat 3.
    this.melodyRound1 = [
      // Pickup Beat 3 (4 steps): Ba-
      N.G4, 0, 0, 0,
      // Bar 1 (12 steps): -hay (2 beats = 8 steps), ku- (1 beat = 4 steps)
      N.C5, 0, 0, 0,  0, 0, 0, 0,   N.D5, 0, 0, 0,
      // Bar 2 (12 steps): -bo (7 steps + -1 breath), ka- (4 steps)
      N.B4, 0, 0, 0,  0, 0, 0, -1,  N.G4, 0, 0, 0,
      // Bar 3 (12 steps): -hit (8 steps), mun- (4 steps)
      N.A4, 0, 0, 0,  0, 0, 0, 0,   N.B4, 0, 0, 0,
      // Bar 4 (12 steps): -ti (7 steps + -1 breath), Ang ha- (two 8th notes on Beat 3)
      N.G4, 0, 0, 0,  0, 0, 0, -1,  N.E4, 0, N.F4, 0,
      // Bar 5 (12 steps): -la- (4 steps), -man (4 steps), do- (4 steps)
      N.G4, 0, 0, 0,  N.A4, 0, 0, 0,  N.G4, 0, 0, 0,
      // Bar 6 (12 steps): -on (7 steps + -1 breath), ay (4 steps)
      N.F4, 0, 0, 0,  0, 0, 0, -1,  N.D5, 0, 0, 0,
      // Bar 7 (12 steps): sa- (4 steps), -ri- (4 steps), sa- (4 steps)
      N.D5, 0, 0, 0,  N.E5, 0, 0, 0,  N.D5, 0, 0, 0,
      // Bar 8 (12 steps): -ri (7 steps + -1 breath), Sing-ka- (two 8th notes on Beat 3)
      N.C5, 0, 0, 0,  0, 0, 0, -1,  N.G4, 0, N.G4, 0,
      // Bar 9 (12 steps): -mas (4 steps), at (4 steps), ta- (4 steps)
      N.C5, 0, 0, 0,  N.D5, 0, 0, 0,  N.C5, 0, 0, 0,
      // Bar 10 (12 steps): -long (7 steps + -1 breath), si-ga- (two 8th notes on Beat 3)
      N.B4, 0, 0, 0,  0, 0, 0, -1,  N.G4, 0, N.G4, 0,
      // Bar 11 (12 steps): -ril- (4 steps), -yas (4 steps), at (4 steps)
      N.A4, 0, 0, 0,  N.B4, 0, 0, 0,  N.A4, 0, 0, 0,
      // Bar 12 (12 steps): ma- (4 steps), -ni (3 steps + -1 breath), Si- (4 steps)
      N.G4, 0, 0, 0,  N.G4, 0, 0, -1,  N.G4, 0, 0, 0,
      // Bar 13 (12 steps): -taw (7 steps + -1 breath), ba- (4 steps)
      N.A4, 0, 0, 0,  0, 0, 0, -1,  N.A4, 0, 0, 0,
      // Bar 14 (12 steps): -taw (7 steps + -1 breath), pa-ta- (two 8th notes on Beat 3)
      N.B4, 0, 0, 0,  0, 0, 0, -1,  N.A4, 0, N.B4, 0,
      // Bar 15 (12 steps): -ni! (held full 3-beat waltz downbeat)
      N.C5, 0, 0, 0,  0, 0, 0, 0,   0, 0, 0, 0,
      // Bar 16 (8 steps): Final turnaround cadence / breath before loop pickup
      -1, -1, -1, -1,  -1, -1, -1, -1,
    ];
    this.bassRound1 = [
      // Pickup Beat 3 (4 steps): light silence for solo pickup
      0, 0, 0, 0,
      // Bar 1 (12 steps): C Major (Root C3 on beat 1, chords on beats 2 & 3)
      N.C3, 0, 0, 0,  N.G3, 0, 0, 0,  N.G3, 0, 0, 0,
      // Bar 2 (12 steps): G7 (Root G2, chords D3)
      N.G2, 0, 0, 0,  N.D3, 0, 0, 0,  N.D3, 0, 0, 0,
      // Bar 3 (12 steps): G7 (Root G2, chords D3)
      N.G2, 0, 0, 0,  N.D3, 0, 0, 0,  N.D3, 0, 0, 0,
      // Bar 4 (12 steps): C Major (Root C3, chords G3)
      N.C3, 0, 0, 0,  N.G3, 0, 0, 0,  N.G3, 0, 0, 0,
      // Bar 5 (12 steps): C Major (Root C3, chords G3)
      N.C3, 0, 0, 0,  N.G3, 0, 0, 0,  N.G3, 0, 0, 0,
      // Bar 6 (12 steps): Dm (Root D3, chords A2)
      N.D3, 0, 0, 0,  N.A2, 0, 0, 0,  N.A2, 0, 0, 0,
      // Bar 7 (12 steps): G7 (Root G2, chords D3)
      N.G2, 0, 0, 0,  N.D3, 0, 0, 0,  N.D3, 0, 0, 0,
      // Bar 8 (12 steps): C Major (Root C3, chords G3)
      N.C3, 0, 0, 0,  N.G3, 0, 0, 0,  N.G3, 0, 0, 0,
      // Bar 9 (12 steps): C Major (Root C3, chords G3)
      N.C3, 0, 0, 0,  N.G3, 0, 0, 0,  N.G3, 0, 0, 0,
      // Bar 10 (12 steps): G7 (Root G2, chords D3)
      N.G2, 0, 0, 0,  N.D3, 0, 0, 0,  N.D3, 0, 0, 0,
      // Bar 11 (12 steps): G7 (Root G2, chords D3)
      N.G2, 0, 0, 0,  N.D3, 0, 0, 0,  N.D3, 0, 0, 0,
      // Bar 12 (12 steps): C Major (Root C3, chords G3)
      N.C3, 0, 0, 0,  N.G3, 0, 0, 0,  N.G3, 0, 0, 0,
      // Bar 13 (12 steps): F Major (Root F2, chords C3)
      N.F2, 0, 0, 0,  N.C3, 0, 0, 0,  N.C3, 0, 0, 0,
      // Bar 14 (12 steps): G7 (Root G2, chords D3)
      N.G2, 0, 0, 0,  N.D3, 0, 0, 0,  N.D3, 0, 0, 0,
      // Bar 15 (12 steps): C Major resolution (Root C3, chords G3)
      N.C3, 0, 0, 0,  N.G3, 0, 0, 0,  N.G3, 0, 0, 0,
      // Bar 16 (8 steps): Final cadence chord
      N.C3, 0, 0, 0,  N.G3, 0, 0, 0,
    ];

    // YUGTO 2: "Leron, Leron Sinta" (Traditional Tagalog Folk Song — 100% Public Domain)
    // 128-step authentic brisk 2/4 polka-march arcade arrangement in C Major.
    // Every Filipino instantly recognizes: "Leron, leron sinta, buko ng papaya..."
    // Full stanza: "Leron, leron sinta, buko ng papaya, dala-dala'y buslo, sisidlan ng bunga,
    // pagdating sa dulo'y nabali ang sanga, kapos kapalaran, humanap ng iba!"
    this.melodyRound2 = [
      // Bar 1 (16 steps): Le-ron, le-ron sin-ta
      N.G4, 0, N.G4, 0,  N.F4, 0, N.E4, 0,  N.F4, 0, 0, 0,  N.G4, 0, 0, -1,
      // Bar 2 (16 steps): bu-ko ng pa-pa-ya
      N.G4, 0, N.A4, 0,  N.G4, 0, N.E4, 0,  N.G4, 0, 0, 0,  N.F4, 0, 0, -1,
      // Bar 3 (16 steps): da-la-da-la'y bus-lo
      N.F4, 0, N.F4, 0,  N.E4, 0, N.D4, 0,  N.E4, 0, 0, 0,  N.F4, 0, 0, -1,
      // Bar 4 (16 steps): si-sid-lan ng bu-nga
      N.G4, 0, N.G4, 0,  N.A4, 0, N.G4, 0,  N.F4, 0, 0, 0,  N.E4, 0, 0, -1,
      // Bar 5 (16 steps): pag-da-ting sa du-lo'y
      N.G4, 0, N.G4, 0,  N.F4, 0, N.E4, 0,  N.F4, 0, 0, 0,  N.G4, 0, 0, -1,
      // Bar 6 (16 steps): na-ba-li ang sa-nga
      N.E4, 0, N.E4, 0,  N.E4, 0, N.F4, 0,  N.G4, 0, 0, 0,  N.A4, 0, 0, -1,
      // Bar 7 (16 steps): ka-pos ka-pa-la-ran
      N.A4, 0, N.A4, 0,  N.C5, 0, N.B4, 0,  N.A4, 0, 0, 0,  N.G4, 0, 0, -1,
      // Bar 8 (16 steps): hu-ma-nap ng i-ba!
      N.B4, 0, N.B4, 0,  N.B4, 0, N.A4, 0,  N.B4, 0, 0, 0,  N.C5, 0, 0, -1,
    ];
    this.bassRound2 = [
      // Bar 1 (C Major polka bounce)
      N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,
      // Bar 2 (G7 bounce)
      N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,
      // Bar 3 (G7 bounce)
      N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,
      // Bar 4 (C resolution)
      N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,
      // Bar 5 (C Major bounce)
      N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,
      // Bar 6 (F modulation)
      N.F2, 0, N.C3, 0,  N.F2, 0, N.C3, 0,  N.F2, 0, N.C3, 0,  N.F2, 0, N.C3, 0,
      // Bar 7 (C to G7)
      N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,
      // Bar 8 (G7 to C cadence)
      N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, 0, 0,
    ];

    // YUGTO 3: "Magtanim Ay 'Di Biro" (Traditional Tagalog Work Song — 100% Public Domain)
    // 128-step authentic high-energy arcade work-song arrangement in C Major.
    // Every Filipino instantly recognizes: "Magtanim ay 'di biro, maghapong nakayuko..."
    // Stanza 1: "Magtanim ay 'di biro, maghapong nakayuko, 'di man lang makaupo, 'di man lang makatayo!"
    // Stanza 2: "Braso ko'y namamanhid, baywang ko'y nangangawit, binti ko'y namimintig, sa pagkababad sa tubig!"
    this.melodyRound3 = [
      // Bar 1 (16 steps): Mag-ta-nim ay di bi-ro
      N.E4, 0, N.F4, 0,  N.G4, 0, N.C5, 0,  N.E4, 0, N.G4, 0,  N.C4, 0, 0, -1,
      // Bar 2 (16 steps): mag-ha-pong na-ka-yu-ko
      N.C4, 0, N.D4, 0,  N.E4, 0, N.G4, 0,  N.F4, 0, N.E4, 0,  N.D4, 0, 0, -1,
      // Bar 3 (16 steps): 'Di man lang ma-ka-u-po
      N.D4, 0, N.E4, 0,  N.F4, 0, N.A4, 0,  N.D4, 0, N.F4, 0,  N.B4, 0, 0, -1,
      // Bar 4 (16 steps): 'di man lang ma-ka-ta-yo
      N.B3, 0, N.C4, 0,  N.D4, 0, N.F4, 0,  N.E4, 0, N.D4, 0,  N.C4, 0, 0, -1,
      // Bar 5 (16 steps): Bra-so ko'y na-ma-man-hid
      N.E4, 0, N.F4, 0,  N.G4, 0, 0, -1,    N.E4, 0, N.F4, 0,  N.G4, 0, 0, -1,
      // Bar 6 (16 steps): bay-wang ko'y na-nga-nga-wit
      N.E4, 0, N.F4, 0,  N.G4, 0, N.A4, 0,  N.B4, 0, N.C5, 0,  N.D5, 0, 0, -1,
      // Bar 7 (16 steps): bin-ti ko'y na-mi-min-tig
      N.D4, 0, N.E4, 0,  N.F4, 0, 0, -1,    N.D4, 0, N.E4, 0,  N.F4, 0, 0, -1,
      // Bar 8 (16 steps): sa pag-ka-ba-bad sa tu-big!
      N.D4, 0, N.E4, 0,  N.F4, 0, N.G4, 0,  N.A4, 0, N.B4, 0,  N.C5, 0, 0, -1,
    ];
    this.bassRound3 = [
      // Bar 1 (C Major driving work bass)
      N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,
      // Bar 2 (G7 march)
      N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,
      // Bar 3 (G7 march)
      N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,
      // Bar 4 (C resolution)
      N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,
      // Bar 5 (C Major driving)
      N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,
      // Bar 6 (C to G7)
      N.C3, 0, N.G2, 0,  N.C3, 0, N.G2, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,
      // Bar 7 (G7 march)
      N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,
      // Bar 8 (G7 to C cadence)
      N.G2, 0, N.D3, 0,  N.G2, 0, N.D3, 0,  N.C3, 0, N.G2, 0,  N.C3, 0, 0, 0,
    ];

    // Backwards-compatible aliases
    this.melodyCalm = this.melodyRound1;
    this.bassCalm = this.bassRound1;
    this.melodyStorm = this.melodyRound3;
    this.bassStorm = this.bassRound3;
  }

  setRound(roundNum) {
    this.currentRound = Math.max(1, Math.min(3, roundNum || 1));
    this.step = 0;
  }

  loadMuteState() {
    try {
      const val = localStorage.getItem('sampayan_rush_muted');
      if (val !== null) return val === 'true';
      // Migrate from legacy if exists
      return false;
    } catch {
      return false;
    }
  }

  saveMuteState() {
    try {
      localStorage.setItem('sampayan_rush_muted', String(this.muted));
    } catch {
      // storage unavailable
    }
  }

  ensureContext() {
    if (this.ac) {
      if (this.ac.state === 'suspended') {
        this.ac.resume().catch(() => {});
      }
      return;
    }

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ac = new AC();

    // Master bus
    this.masterGain = this.ac.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ac.currentTime);
    this.masterGain.connect(this.ac.destination);

    // BGM bus
    this.bgmGain = this.ac.createGain();
    this.bgmGain.gain.setValueAtTime(0.35, this.ac.currentTime);
    this.bgmGain.connect(this.masterGain);

    // SFX bus
    this.sfxGain = this.ac.createGain();
    this.sfxGain.gain.setValueAtTime(0.7, this.ac.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Rain bus & continuous noise generator
    this.setupRainGenerator();
  }

  setupRainGenerator() {
    if (!this.ac) return;

    // Create 2-second looped white/pink noise buffer
    const bufferSize = this.ac.sampleRate * 2;
    this.noiseBuffer = this.ac.createBuffer(1, bufferSize, this.ac.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filtering for warm natural rainfall
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.1600000;
      b2 = 0.57000 * b2 + white * 0.5600000;
      data[i] = (b0 + b1 + b2 + white * 0.18) * 0.28;
    }

    const src = this.ac.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const highpass = this.ac.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(1200, this.ac.currentTime);

    const lowpass = this.ac.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(5500, this.ac.currentTime);

    this.rainGain = this.ac.createGain();
    this.rainGain.gain.value = 0;
    this.rainGain.gain.setValueAtTime(0, this.ac.currentTime);

    src.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    src.start();
    this.rainSource = src;
  }

  /* ---------- Sequencer & Procedural BGM ---------- */
  startBgm() {
    this.ensureContext();
    if (this.isPlayingBgm || !this.ac) return;
    this.isPlayingBgm = true;
    this.step = 0;
    this.nextNoteTime = this.ac.currentTime + 0.05;
    this.scheduler();
  }

  stopBgm() {
    this.isPlayingBgm = false;
    this.step = 0;
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
  }

  scheduler() {
    if (!this.isPlayingBgm || !this.ac) return;

    // Guard against background tab lag where nextNoteTime is left far in the past
    if (this.nextNoteTime < this.ac.currentTime) {
      this.nextNoteTime = this.ac.currentTime + 0.02;
    }

    // Lookahead schedule: schedule all notes within the next 120ms
    while (this.nextNoteTime < this.ac.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.advanceStep();
    }

    this.stepTimer = setTimeout(() => this.scheduler(), 35);
  }

  getCurrentMelody() {
    if (this.currentRound === 2) return this.melodyRound2;
    if (this.currentRound >= 3) return this.melodyRound3;
    return this.melodyRound1;
  }

  getCurrentBass() {
    if (this.currentRound === 2) return this.bassRound2;
    if (this.currentRound >= 3) return this.bassRound3;
    return this.bassRound1;
  }

  advanceStep() {
    const isStorm = this.stormLevel > 0.35;
    // Escalate tempo naturally with each Yugto:
    // Round 1 (Bahay Kubo): 116 BPM (calm, breezy, afternoon)
    // Round 2 (Leron, Leron Sinta): 132 BPM (brisk, bouncy polka)
    // Round 3 (Magtanim Ay 'Di Biro): 148 BPM (intense, frantic work song)
    const baseBpm = this.currentRound === 3 ? 148 : (this.currentRound === 2 ? 132 : 116);
    const currentBpm = isStorm ? baseBpm + 14 : baseBpm;
    const secondsPer16th = 60 / currentBpm / 4;
    this.nextNoteTime += secondsPer16th;
    const melody = this.getCurrentMelody();
    const len = melody && melody.length ? melody.length : 128;
    this.step = (this.step + 1) % len;
  }

  scheduleStep(step, time) {
    if (!this.ac || this.muted) return;

    const isStorm = this.stormLevel > 0.35;
    const melodyArray = this.getCurrentMelody();
    const bassArray = this.getCurrentBass();

    const baseBpm = this.currentRound === 3 ? 148 : (this.currentRound === 2 ? 132 : 116);
    const currentBpm = isStorm ? baseBpm + 14 : baseBpm;
    const secondsPer16th = 60 / currentBpm / 4;

    const idx = step % melodyArray.length;
    const note = melodyArray[idx];
    const bassNote = bassArray[idx];

    const isWaltz = (this.currentRound === 1);
    const waltzStep = isWaltz ? ((step - 4 + melodyArray.length) % 12) : 0;

    // 1. Arcade Chiptune Lead Melody + Crisp Octave/Square Layer with Natural Phrasing
    if (note && note > 0) {
      let melSteps = 1;
      for (let k = 1; k < 16; k++) {
        const next = melodyArray[(idx + k) % melodyArray.length];
        if (next && (next > 0 || next === -1)) break;
        melSteps++;
      }
      const melDuration = Math.max(0.10, melSteps * secondsPer16th * 0.85);

      this.playSynthNote(note, time, melDuration, 'square', 0.13);
      this.playSynthNote(note, time, melDuration, 'triangle', 0.18);
      // Bright arcade bell counter-chime on accented beats
      const isAccent = isWaltz ? (waltzStep === 0) : (step % 8 === 0 || (isStorm && step % 4 === 0));
      if (isAccent) {
        this.playSynthNote(note * 2, time, Math.min(0.12, melDuration), 'sine', 0.06);
      }
    }

    // 2. Bouncy Arcade Bass Note with Proper Sustain & Audible Low-Mid Harmonic Bite
    if (bassNote && bassNote > 0) {
      let bassSteps = 1;
      for (let k = 1; k < 8; k++) {
        const next = bassArray[(idx + k) % bassArray.length];
        if (next && (next > 0 || next === -1)) break;
        bassSteps++;
      }
      const bassDuration = Math.max(0.12, bassSteps * secondsPer16th * 0.80);

      this.playSynthNote(bassNote, time, bassDuration, 'triangle', 0.28);
      this.playSynthNote(bassNote, time, Math.min(0.09, bassDuration), 'square', 0.05);
    }

    // 3. Rhythm Percussion
    if (isWaltz) {
      // 3/4 Waltz percussion locked to downbeats:
      // Beat 1 (waltzStep === 0): Kick + root bass on "-hay", "-bo", "-hit", "-ti"
      if (waltzStep === 0) {
        this.playKick(time);
        this.playHiHat(time, 0.02);
      }
      // Beats 2 & 3 (waltzStep === 4 and 8): Chord/fifth bass + light snare & hi-hat
      if (waltzStep === 4 || waltzStep === 8) {
        this.playSnare(time, 0.08);
        this.playHiHat(time, 0.035);
      }
    } else {
      // 4/4 Rhythm for Round 2 & 3
      // Kick drum on beats 1 and 3
      if (step % 8 === 0 || (this.currentRound >= 2 && step % 8 === 6 && isStorm)) {
        this.playKick(time);
      }
      // Snare / rim on beats 2 and 4
      if (step % 8 === 4) {
        this.playSnare(time);
      }
      // Subtle hi-hat on every 8th note
      if (step % 2 === 0) {
        this.playHiHat(time, step % 4 === 2 ? 0.04 : 0.02);
      }
    }
  }

  playSynthNote(freq, time, duration, type, volume) {
    if (!this.ac || !this.bgmGain) return;
    try {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      // Snappy attack (12ms), steady musical sustain, smooth decay
      const attack = 0.012;
      const release = Math.min(0.04, duration * 0.25);
      const sustainTime = Math.max(attack + 0.01, duration - release);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volume, time + attack);
      gain.gain.setValueAtTime(volume * 0.88, time + sustainTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(time + duration + 0.02);
    } catch {
      // Audio node scheduling failure recovery
    }
  }

  playKick(time) {
    if (!this.ac || !this.bgmGain) return;
    try {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);

      gain.gain.setValueAtTime(0.32, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);

      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + 0.1);
    } catch {}
  }

  playSnare(time, vol = 0.12) {
    if (!this.ac || !this.bgmGain || !this.noiseBuffer) return;
    try {
      const src = this.ac.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, time);
      filter.Q.setValueAtTime(1.2, time);

      const gain = this.ac.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      src.start(time);
      src.stop(time + 0.11);
    } catch {}
  }

  playHiHat(time, vol = 0.03) {
    if (!this.ac || !this.bgmGain || !this.noiseBuffer) return;
    try {
      const src = this.ac.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, time);

      const gain = this.ac.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      src.start(time);
      src.stop(time + 0.04);
    } catch {}
  }

  /* ---------- Weather Synchronization ---------- */
  setWeather(stormLevel, rainLevel) {
    this.stormLevel = stormLevel;
    this.rainLevel = rainLevel;

    if (!this.rainGain || !this.ac) return;
    const targetGain = this.muted ? 0 : rainLevel * 0.18;
    if (rainLevel <= 0) {
      this.rainGain.gain.cancelScheduledValues(this.ac.currentTime);
      this.rainGain.gain.setValueAtTime(0, this.ac.currentTime);
      this.rainGain.gain.value = 0;
    } else {
      this.rainGain.gain.setTargetAtTime(targetGain, this.ac.currentTime, 0.25);
    }
  }

  silence() {
    this.stopBgm();
    this.stormLevel = 0;
    this.rainLevel = 0;
    if (this.rainGain && this.ac) {
      this.rainGain.gain.cancelScheduledValues(this.ac.currentTime);
      this.rainGain.gain.setValueAtTime(0, this.ac.currentTime);
      this.rainGain.gain.value = 0;
    }
  }

  /* ---------- Procedural Sound Effects (SFX) ---------- */
  playSfx(kind, extra) {
    this.ensureContext();
    if (!this.ac || this.muted) return;

    switch (kind) {
      case 'pop': // Clothespin snapping off line or item grab
        this.sfxPop();
        break;
      case 'drop': // Cloth dropped into batya with score chime (with combo scaling)
        this.sfxDrop(extra);
        break;
      case 'gust': // Gust of wind howling over rooftop
        this.sfxGust();
        break;
      case 'thunder': // Thunder crack and sub-bass rumble
        this.sfxThunder();
        break;
      case 'victory': // Upbeat Pinoy fiesta arpeggio for Grade S/A
        this.sfxVictory();
        break;
      case 'fail': // Comical retro wah-wah slide for Grade F
        this.sfxFail();
        break;
      case 'rescue': // 8-bit hero fanfare for mid-air air rescue
        this.sfxRescue();
        break;
      case 'gold': // Magical shimmering sparkle for Gintong Sipit
        this.sfxGold();
        break;
      case 'roundClear': // Triumphant round victory fanfare
        this.sfxRoundClear();
        break;
      case 'countdown': // Arcade 3-2-1 countdown beep
        this.sfxCountdown(false);
        break;
      case 'countdownGo': // Arcade GO! launch chime
        this.sfxCountdown(true);
        break;
      case 'toss': // Swoosh sound when flicking clothes into the air
        this.sfxToss();
        break;
      case 'swish': // Rewarding basketball chime on long-distance batya score
        this.sfxSwish();
        break;
      case 'meow': // 8-bit cat meow for Munin the Puspin
        this.sfxMeow();
        break;
      case 'catHiss': // Startled screech when Munin is shooed away ("Tsupe!")
        this.sfxCatHiss();
        break;
      case 'unpin': // Snappy double-click sound for clothespin unpinning
        this.sfxUnpin();
        break;
      case 'sizzle': // Soft barbecue grill sizzle/crackle for Mang Boy's smoke
        this.sfxSizzle();
        break;
      case 'tsinelas': // Dramatic rubber slipper thwack for Nanay's threat meter
        this.sfxTsinelas();
        break;
    }
  }

  sfxPop() {
    const now = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const gain = this.ac.createGain();
    const filter = this.ac.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.055);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(1.5, now);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  sfxDrop(combo = 1) {
    const now = this.ac.currentTime;

    // 1. Soft fabric thump
    const thud = this.ac.createOscillator();
    const thudGain = this.ac.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(125, now);
    thud.frequency.exponentialRampToValueAtTime(45, now + 0.09);

    thudGain.gain.setValueAtTime(0.35, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    thud.connect(thudGain);
    thudGain.connect(this.sfxGain);
    thud.start(now);
    thud.stop(now + 0.11);

    // 2. Ascending pitch combo chimes
    const playChime = (freq, delay, vol = 0.18) => {
      const chime = this.ac.createOscillator();
      const chimeGain = this.ac.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq, now + delay);

      chimeGain.gain.setValueAtTime(vol, now + delay);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.22);

      chime.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      chime.start(now + delay);
      chime.stop(now + delay + 0.24);
    };

    const c = typeof combo === 'number' ? combo : 1;
    if (c <= 1) {
      playChime(this.N.E6, 0.02);
      playChime(this.N.G6, 0.09);
    } else if (c === 2) {
      playChime(this.N.G6, 0.02);
      playChime(this.N.B6, 0.08);
    } else if (c === 3) {
      playChime(this.N.B6, 0.02);
      playChime(this.N.D7, 0.08);
    } else if (c === 4) {
      playChime(this.N.D7, 0.02);
      playChime(this.N.E7, 0.08);
    } else {
      // 5+ ULTRA COMBO: Ascending top-octave 3-note victory fanfare
      playChime(this.N.E7, 0.01, 0.20);
      playChime(this.N.G7, 0.06, 0.22);
      playChime(this.N.C8, 0.11, 0.26);
    }
  }

  sfxRescue() {
    const now = this.ac.currentTime;
    const notes = [this.N.C5, this.N.E5, this.N.G5, this.N.C6];
    notes.forEach((freq, idx) => {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.3, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.18);
    });
  }

  sfxGold() {
    const now = this.ac.currentTime;
    const notes = [this.N.B5 || 987, this.N.E6, this.N.Gs6, this.N.B6, this.N.E7];
    notes.forEach((freq, idx) => {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0.22, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.28);
    });
  }

  sfxRoundClear() {
    const now = this.ac.currentTime;
    const notes = [
      { f: this.N.G4, d: 0.0, l: 0.14 },
      { f: this.N.C5, d: 0.14, l: 0.14 },
      { f: this.N.E5, d: 0.28, l: 0.14 },
      { f: this.N.G5, d: 0.42, l: 0.45 },
    ];
    notes.forEach(({ f, d, l }) => {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + d);

      gain.gain.setValueAtTime(0.26, now + d);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + d + l);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + d);
      osc.stop(now + d + l + 0.02);
    });
  }

  sfxCountdown(isGo = false) {
    const now = this.ac.currentTime;
    if (!isGo) {
      // Punchy retro Japanese arcade dual-oscillator synth hit for 3, 2, 1
      const freqs = [this.N.E5, this.N.E4];
      freqs.forEach((f, idx) => {
        const osc = this.ac.createOscillator();
        const gain = this.ac.createGain();
        osc.type = idx === 0 ? 'square' : 'sawtooth';
        osc.frequency.setValueAtTime(f * 1.12, now);
        osc.frequency.exponentialRampToValueAtTime(f, now + 0.025);

        gain.gain.setValueAtTime(idx === 0 ? 0.22 : 0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.20);
      });
    } else {
      // Explosive arcade GO! chord fanfare burst
      const chord = [
        { f: this.N.C5, d: 0.0, l: 0.34, t: 'sawtooth', v: 0.16 },
        { f: this.N.G5, d: 0.0, l: 0.34, t: 'square', v: 0.18 },
        { f: this.N.C6, d: 0.02, l: 0.36, t: 'square', v: 0.24 },
        { f: this.N.E6, d: 0.05, l: 0.38, t: 'triangle', v: 0.22 },
      ];
      chord.forEach(({ f, d, l, t, v }) => {
        const osc = this.ac.createOscillator();
        const gain = this.ac.createGain();
        osc.type = t;
        osc.frequency.setValueAtTime(f, now + d);

        gain.gain.setValueAtTime(v, now + d);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + d + l);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + d);
        osc.stop(now + d + l + 0.02);
      });
    }
  }

  sfxGust() {
    if (!this.noiseBuffer) return;
    const now = this.ac.currentTime;
    const src = this.ac.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(450, now + 0.75);
    filter.Q.setValueAtTime(2.2, now);

    const gain = this.ac.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    src.start(now);
    src.stop(now + 0.85);
  }

  sfxThunder() {
    const now = this.ac.currentTime;

    // 1. Initial lightning crack (noise pulse)
    if (this.noiseBuffer) {
      const crackSrc = this.ac.createBufferSource();
      crackSrc.buffer = this.noiseBuffer;
      const crackFilter = this.ac.createBiquadFilter();
      crackFilter.type = 'lowpass';
      crackFilter.frequency.setValueAtTime(800, now);
      crackFilter.frequency.exponentialRampToValueAtTime(150, now + 0.4);

      const crackGain = this.ac.createGain();
      crackGain.gain.setValueAtTime(0.45, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      crackSrc.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(this.sfxGain);
      crackSrc.start(now);
      crackSrc.stop(now + 0.55);
    }

    // 2. Deep sub-bass rooftop rumble (52 Hz exponential decay over 1.9s)
    const rumble = this.ac.createOscillator();
    const rumbleGain = this.ac.createGain();
    rumble.type = 'triangle';
    rumble.frequency.setValueAtTime(58, now + 0.05);
    rumble.frequency.linearRampToValueAtTime(34, now + 1.8);

    rumbleGain.gain.setValueAtTime(0.48, now + 0.05);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

    rumble.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumble.start(now + 0.05);
    rumble.stop(now + 1.95);
  }

  sfxVictory() {
    const now = this.ac.currentTime;
    const notes = [this.N.C5, this.N.E5, this.N.G5, this.N.C6];
    notes.forEach((freq, idx) => {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);

      gain.gain.setValueAtTime(0.28, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.38);
    });
  }

  sfxFail() {
    const now = this.ac.currentTime;
    const notes = [this.N.G4, this.N.Fs4 || 370, this.N.F4, this.N.E4];
    notes.forEach((freq, idx) => {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.2, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.25);
    });
  }

  sfxToss() {
    const now = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const gain = this.ac.createGain();
    const filter = this.ac.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1300, now);
    filter.frequency.linearRampToValueAtTime(320, now + 0.16);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  sfxSwish() {
    const now = this.ac.currentTime;
    // Crisp ringing bell chime arpeggio (F6, C7, F7, G7)
    const notes = [1396.91, 2093.00, 2793.83, 3135.96];
    notes.forEach((freq, idx) => {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.28, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.38);
    });

    // Net swish / water plop swoosh
    if (this.noiseBuffer) {
      const src = this.ac.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now + 0.06);
      filter.frequency.exponentialRampToValueAtTime(520, now + 0.22);
      filter.Q.setValueAtTime(2.8, now + 0.06);

      const gain = this.ac.createGain();
      gain.gain.setValueAtTime(0.32, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now + 0.06);
      src.stop(now + 0.26);
    }
  }

  sfxMeow() {
    const now = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const gain = this.ac.createGain();

    osc.type = 'triangle';
    // Authentic retro cat meow pitch-bend curve (480Hz -> 860Hz -> 520Hz)
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.32);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  sfxCatHiss() {
    const now = this.ac.currentTime;
    // Startled screech tone
    const osc = this.ac.createOscillator();
    const gain = this.ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1350, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);

    // Highpass noise hiss burst
    if (this.noiseBuffer) {
      const src = this.ac.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3000, now);

      const nGain = this.ac.createGain();
      nGain.gain.setValueAtTime(0.3, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.24);
    }
  }

  sfxUnpin() {
    const now = this.ac.currentTime;
    [0, 0.045].forEach(d => {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1750, now + d);
      osc.frequency.exponentialRampToValueAtTime(380, now + d + 0.025);

      gain.gain.setValueAtTime(0.22, now + d);
      gain.gain.exponentialRampToValueAtTime(0.001, now + d + 0.03);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + d);
      osc.stop(now + d + 0.035);
    });
  }

  sfxSizzle() {
    if (!this.noiseBuffer) return;
    const now = this.ac.currentTime;
    const src = this.ac.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(2.2, now);

    const gain = this.ac.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.8);
  }

  sfxTsinelas() {
    const now = this.ac.currentTime;
    // Crisp rubber slap burst
    if (this.noiseBuffer) {
      const src = this.ac.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      const gain = this.ac.createGain();
      gain.gain.setValueAtTime(0.44, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.14);
    }

    // Heavy rubber impact thud
    const osc = this.ac.createOscillator();
    const thudGain = this.ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.15);

    thudGain.gain.setValueAtTime(0.40, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(thudGain);
    thudGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.20);
  }

  /* ---------- Mute & Volume Control ---------- */
  toggleMute() {
    this.ensureContext();
    this.muted = !this.muted;
    this.saveMuteState();

    if (this.masterGain && this.ac) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ac.currentTime, 0.05);
    }

    for (const cb of this.onMuteChangeCallbacks) {
      try { cb(this.muted); } catch {}
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  onMuteChange(callback) {
    this.onMuteChangeCallbacks.push(callback);
  }
}

// Support both script-tag globals and ES modules
if (typeof window !== 'undefined') {
  window.SampayanAudio = SampayanAudio;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SampayanAudio };
}
