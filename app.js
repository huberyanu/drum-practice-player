/**
 * POCKET LAB // Drum Practice Player
 * Pitch-Neutral Multi-Stem Audio Engine, High-Precision Audio DSP BPM & Beat-Phase Detector,
 * Sample-Accurate Lookahead Metronome, Interactive Waveform, A-B Loop + Pre-Roll,
 * Speed-Trainer, Visual & Audible Count-In, and Foot-Pedal / Keyboard Control.
 */

const DEFAULT_SONGS = [
  {
    id: 'neon-pocket-funk',
    title: 'Neon Pocket Groove',
    subtitle: 'Tight Ghost-Notes & Syncopated Kick',
    bpm: 108,
    beatOffset: 0.0,
    timeSignature: '4/4',
    beatsPerBar: 4,
    duration: 35.55,
    tags: ['Funk', 'Drumless', 'In Arbeit'],
    rating: 3,
    demoSynth: 'funk',
    audio: { band: null, drums: null },
    markers: [
      { label: 'Intro', time: 0.0, color: '#38bdf8' },
      { label: 'Verse 1', time: 8.89, color: '#4ade80' },
      { label: 'Chorus', time: 17.78, color: '#f59e0b' },
      { label: 'Linear Fill / Solo', time: 24.44, color: '#f43f5e' },
      { label: 'Outro', time: 31.11, color: '#a855f7' }
    ],
    defaultLoop: { a: 24.44, b: 31.11 },
    notes:
      'Ghost-Notes auf der Snare extrem leise halten (unter 2cm Stick-Höhe). Im Linear Fill (Takt 12) Kick-Snare-Kick-Hat sauber trennen, nicht eilen!'
  },
  {
    id: 'autobahn-overdrive',
    title: 'Autobahn Overdrive',
    subtitle: 'Driving 8th-Note Rock & Halftime Bridge',
    bpm: 142,
    beatOffset: 0.0,
    timeSignature: '4/4',
    beatsPerBar: 4,
    duration: 33.8,
    tags: ['Rock', 'Schnell (>130 BPM)', 'In Arbeit'],
    rating: 4,
    demoSynth: 'rock',
    audio: { band: null, drums: null },
    markers: [
      { label: 'Intro Riff', time: 0.0, color: '#38bdf8' },
      { label: 'Verse', time: 6.76, color: '#4ade80' },
      { label: 'Chorus (Crash Ride)', time: 13.52, color: '#f59e0b' },
      { label: 'Halftime Bridge', time: 20.28, color: '#a855f7' },
      { label: '16th Tom Fill', time: 27.04, color: '#f43f5e' }
    ],
    defaultLoop: { a: 27.04, b: 33.8 },
    notes:
      "Nach 2. Refrain Crash auf '1-und' mit Bass-Gitarrist zusammen akzentuieren! In der Halftime-Bridge Snare auf Zählzeit 3 fett als Rimshot spielen."
  },
  {
    id: 'midnight-six-eight',
    title: 'Midnight Soul Ballad',
    subtitle: 'Slow 6/8 Purdie-Style Shuffle',
    bpm: 78,
    beatOffset: 0.0,
    timeSignature: '6/8',
    beatsPerBar: 6,
    duration: 36.92,
    tags: ['Drumless', 'Gelernt'],
    rating: 5,
    demoSynth: 'ballad68',
    audio: { band: null, drums: null },
    markers: [
      { label: 'Intro (Cross-Stick)', time: 0.0, color: '#38bdf8' },
      { label: 'Verse', time: 9.23, color: '#4ade80' },
      { label: 'Chorus (Open Snare)', time: 18.46, color: '#f59e0b' },
      { label: 'Dynamic Breakdown', time: 27.69, color: '#f43f5e' }
    ],
    defaultLoop: { a: 18.46, b: 27.69 },
    notes: 'Hi-Hat auf 1, 2, 3, 4, 5, 6 leicht wippen (Foot-Splash auf der 6). Backbeat sitzt auf der 4!'
  },
  {
    id: 'double-kick-sprint',
    title: 'Apex Endurance Protocol',
    subtitle: 'Fast Punk / Metal Stamina Track',
    bpm: 168,
    beatOffset: 0.0,
    timeSignature: '4/4',
    beatsPerBar: 4,
    duration: 28.57,
    tags: ['Rock', 'Schnell (>130 BPM)', 'In Arbeit'],
    rating: 2,
    demoSynth: 'fast',
    audio: { band: null, drums: null },
    markers: [
      { label: 'Count & Blast', time: 0.0, color: '#38bdf8' },
      { label: 'Gallop Verse', time: 5.71, color: '#4ade80' },
      { label: 'Chorus', time: 11.43, color: '#f59e0b' },
      { label: 'Herta Fill Section', time: 17.14, color: '#f43f5e' },
      { label: 'Outro Breakdown', time: 22.86, color: '#a855f7' }
    ],
    defaultLoop: { a: 17.14, b: 22.86 },
    notes:
      'Mit Speed-Trainer bei 75% starten (+2% alle 2 Loops). Schultern locker lassen, aus den Fußgelenken spielen!'
  }
];

const STORAGE_KEY = 'pocketlab_drum_practice_state_v1';
const IDB_NAME = 'pocketlab_audio_db';
const IDB_STORE = 'custom_tracks';

/**
 * High-Precision Audio DSP BPM & Beat-Phase Analyzer
 * Uses Dual-Band Onset Flux (Kick Low-Pass <180Hz + Transient High-Pass) at 200Hz resolution,
 * Harmonic Comb-Filter Autocorrelation, Studio-Grid Refinement, and Phase-Lock Sweep.
 */
class BpmAnalyzer {
  static analyzeAudioBuffer(audioBuffer) {
    const sr = audioBuffer.sampleRate;
    const raw = audioBuffer.getChannelData(0);
    const totalLen = raw.length;
    if (totalLen < sr * 2) {
      return { bpm: 120, beatOffset: 0, confidence: 0 };
    }

    // 1. Build 200 Hz (5 ms) Multi-Band Onset Strength Envelope over up to 75 seconds
    const envRate = 200;
    const hop = Math.max(1, Math.floor(sr / envRate));
    const actualEnvRate = sr / hop;

    const maxAnalyzeSamples = Math.min(totalLen, Math.floor(sr * 75));
    const numFrames = Math.floor(maxAnalyzeSamples / hop);
    const onsetEnv = new Float32Array(numFrames);

    // 1-pole low-pass filter at ~160 Hz to isolate Kick & Bass transients
    const rc = 1.0 / (2 * Math.PI * 160);
    const dt = 1.0 / sr;
    const alpha = dt / (rc + dt);

    let lpState = 0;
    let prevLowEnergy = 0;
    let prevHighEnergy = 0;

    for (let f = 0; f < numFrames; f++) {
      const start = f * hop;
      let lowSum = 0;
      let highSum = 0;
      for (let i = 0; i < hop; i++) {
        const s = raw[start + i];
        lpState += alpha * (s - lpState);
        const hp = s - lpState;
        lowSum += lpState * lpState;
        highSum += hp * hp;
      }

      const lowRms = Math.log1p(40 * Math.sqrt(lowSum / hop));
      const highRms = Math.log1p(40 * Math.sqrt(highSum / hop));

      const dLow = Math.max(0, lowRms - prevLowEnergy);
      const dHigh = Math.max(0, highRms - prevHighEnergy);
      prevLowEnergy = lowRms;
      prevHighEnergy = highRms;

      // Weight kick/bass transients strongly + snare/hat attack flux
      onsetEnv[f] = dLow * 0.68 + dHigh * 0.32;
    }

    // 2. Subtract local moving average (0.25s window) so only sharp percussion attacks remain
    const winRadius = Math.floor(actualEnvRate * 0.125);
    const cleanEnv = new Float32Array(numFrames);
    let runningSum = 0;
    let maxOnset = 0.0001;

    for (let i = 0; i < numFrames; i++) {
      runningSum += onsetEnv[i];
      if (i >= winRadius * 2) {
        runningSum -= onsetEnv[i - winRadius * 2];
      }
      const count = Math.min(i + 1, winRadius * 2);
      const localMean = runningSum / count;
      const val = Math.max(0, onsetEnv[i] - localMean * 1.15);
      cleanEnv[i] = val;
      if (val > maxOnset) maxOnset = val;
    }

    for (let i = 0; i < numFrames; i++) {
      cleanEnv[i] /= maxOnset;
    }

    // Focus tempo autocorrelation on the most energetic 45-second slice
    const sliceFrames = Math.min(numFrames, Math.floor(actualEnvRate * 45));
    let bestSliceStart = 0;
    if (numFrames > sliceFrames) {
      let bestEnergy = -1;
      const stepFrames = Math.floor(actualEnvRate * 2);
      for (let start = 0; start + sliceFrames < numFrames; start += stepFrames) {
        let e = 0;
        for (let k = start; k < start + sliceFrames; k += 4) e += cleanEnv[k];
        if (e > bestEnergy) {
          bestEnergy = e;
          bestSliceStart = start;
        }
      }
    }

    // 3. Stage 1: Harmonic Comb-Filter Autocorrelation across 68 - 185 BPM
    const minBpm = 68;
    const maxBpm = 185;
    const coarseStep = 0.25;
    let bestCoarseBpm = 120;
    let bestCoarseScore = -1;

    const autocorrAtLag = (lagFrames) => {
      const lag = Math.round(lagFrames);
      if (lag < 2 || lag >= sliceFrames / 2) return 0;
      let sum = 0;
      const end = bestSliceStart + sliceFrames - lag;
      for (let i = bestSliceStart; i < end; i++) {
        // Slight 3-tap smoothing on target lag to tolerate micro-timing swing
        const target =
          cleanEnv[i + lag] * 0.6 +
          cleanEnv[i + lag - 1] * 0.2 +
          cleanEnv[i + Math.min(numFrames - 1, lag + 1)] * 0.2;
        sum += cleanEnv[i] * target;
      }
      return sum / (sliceFrames - lag);
    };

    const candidates = [];
    for (let bpm = minBpm; bpm <= maxBpm; bpm += coarseStep) {
      const lag = (60 / bpm) * actualEnvRate;
      const r1 = autocorrAtLag(lag);
      const r2 = autocorrAtLag(lag * 2);
      const r3 = autocorrAtLag(lag * 3);
      const r4 = autocorrAtLag(lag * 4);
      const rHalf = autocorrAtLag(lag * 0.5);

      // Perceptual tempo prior: gently favors standard drum tempos (85 - 155 BPM) over octave extremes
      const logRatio = Math.log2(bpm / 118);
      const prior = Math.exp(-0.5 * Math.pow(logRatio / 0.58, 2));

      const rawComb = r1 * 1.15 + r2 * 0.85 + r3 * 0.45 + r4 * 1.1 + rHalf * 0.3;
      const score = rawComb * (0.72 + 0.28 * prior);
      candidates.push({ bpm, score });

      if (score > bestCoarseScore) {
        bestCoarseScore = score;
        bestCoarseBpm = bpm;
      }
    }

    // 4. Stage 2: High-Resolution Pulse-Train Phase-Correlation around the peak (0.05 BPM resolution)
    const evaluatePulseTrain = (testBpm) => {
      const periodFrames = (60 / testBpm) * actualEnvRate;
      const numPhases = Math.min(120, Math.max(24, Math.floor(periodFrames)));
      let maxPhaseScore = 0;
      let bestPhaseFrames = 0;

      for (let p = 0; p < numPhases; p++) {
        const phaseOffset = (p / numPhases) * periodFrames;
        let sum = 0;
        let count = 0;
        for (
          let pos = bestSliceStart + phaseOffset;
          pos < bestSliceStart + sliceFrames - 1;
          pos += periodFrames
        ) {
          const idx = Math.round(pos);
          // 3-frame window (+/- 5ms) around each predicted beat
          const peakLocal = Math.max(
            cleanEnv[Math.max(0, idx - 1)],
            cleanEnv[idx],
            cleanEnv[Math.min(numFrames - 1, idx + 1)]
          );
          sum += peakLocal;
          count++;
        }
        const avg = count > 0 ? sum / count : 0;
        if (avg > maxPhaseScore) {
          maxPhaseScore = avg;
          bestPhaseFrames = phaseOffset;
        }
      }
      return { score: maxPhaseScore, phaseFrames: bestPhaseFrames };
    };

    let refinedBpm = bestCoarseBpm;
    let bestPulseScore = -1;

    for (let delta = -1.5; delta <= 1.5; delta += 0.05) {
      const candidateBpm = Number((bestCoarseBpm + delta).toFixed(2));
      if (candidateBpm < minBpm || candidateBpm > maxBpm) continue;
      const res = evaluatePulseTrain(candidateBpm);
      if (res.score > bestPulseScore) {
        bestPulseScore = res.score;
        refinedBpm = candidateBpm;
      }
    }

    // Studio Grid Snap: if an exact integer BPM (or .5 BPM) achieves >= 98.5% of the peak pulse score,
    // snap to the integer BPM so the click never drifts on studio recordings.
    const nearestInt = Math.round(refinedBpm);
    if (Math.abs(nearestInt - refinedBpm) <= 0.45) {
      const intCheck = evaluatePulseTrain(nearestInt);
      if (intCheck.score >= bestPulseScore * 0.985) {
        refinedBpm = nearestInt;
      } else {
        const nearestHalf = Math.round(refinedBpm * 2) / 2;
        const halfCheck = evaluatePulseTrain(nearestHalf);
        if (halfCheck.score >= bestPulseScore * 0.99) {
          refinedBpm = nearestHalf;
        } else {
          refinedBpm = Number(refinedBpm.toFixed(1));
        }
      }
    } else {
      refinedBpm = Number(refinedBpm.toFixed(1));
    }

    // 5. Stage 3: Find Global Beat-Phase Offset & First Musical Downbeat (beatOffset in seconds)
    const beatPeriodSec = 60 / refinedBpm;
    const beatPeriodFrames = beatPeriodSec * actualEnvRate;
    const phaseSteps = 160;
    let bestGlobalPhaseSec = 0;
    let bestGlobalPhaseScore = -1;

    for (let p = 0; p < phaseSteps; p++) {
      const phaseSec = (p / phaseSteps) * beatPeriodSec;
      const phaseFrames = phaseSec * actualEnvRate;
      let score = 0;
      let hits = 0;
      for (let f = phaseFrames; f < numFrames - 1; f += beatPeriodFrames) {
        const idx = Math.round(f);
        score += Math.max(
          cleanEnv[Math.max(0, idx - 1)],
          cleanEnv[idx],
          cleanEnv[Math.min(numFrames - 1, idx + 1)]
        );
        hits++;
      }
      const norm = hits > 0 ? score / hits : 0;
      if (norm > bestGlobalPhaseScore) {
        bestGlobalPhaseScore = norm;
        bestGlobalPhaseSec = phaseSec;
      }
    }

    // Find the first audible beat in the song along this phase grid (skip leading silence)
    let firstBeatSec = bestGlobalPhaseSec;
    for (let k = 0; k < 32; k++) {
      const candidateSec = bestGlobalPhaseSec + k * beatPeriodSec;
      const idx = Math.round(candidateSec * actualEnvRate);
      if (idx >= numFrames - 2) break;
      const localPeak = Math.max(
        cleanEnv[Math.max(0, idx - 2)],
        cleanEnv[Math.max(0, idx - 1)],
        cleanEnv[idx],
        cleanEnv[Math.min(numFrames - 1, idx + 1)],
        cleanEnv[Math.min(numFrames - 1, idx + 2)]
      );
      if (localPeak >= 0.18) {
        firstBeatSec = candidateSec;
        break;
      }
    }

    return {
      bpm: refinedBpm,
      beatOffset: Number(firstBeatSec.toFixed(3)),
      confidence: Math.min(1, bestGlobalPhaseScore * 2.5)
    };
  }
}

class CustomTrackDB {
  static open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async saveTrack(trackRecord) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(trackRecord);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore IndexedDB errors in private mode
    }
  }

  static async getAllTracks() {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }
}

class DrumPracticeApp {
  constructor() {
    this.songs = [];
    this.activeSong = null;
    this.activeFilter = 'ALL';
    this.searchQuery = '';

    // Audio Context & Pitch-neutral HTML5 Audio Stems
    this.audioCtx = null;
    this.bandAudio = new Audio();
    this.drumsAudio = new Audio();
    this.bandAudio.preservesPitch = true;
    this.drumsAudio.preservesPitch = true;

    // Decoded AudioBuffer cache for active song re-analysis
    this.decodedBufferCache = new Map();

    // Waveform peak arrays (normalized 0..1)
    this.bandPeaks = [];
    this.drumPeaks = [];

    // Playback & Timing State
    this.isPlaying = false;
    this.isCountingIn = false;
    this.countInTimer = null;
    this.countInEnabled = true;

    this.tempoPercent = 100;
    this.loopEnabled = true;
    this.prerollEnabled = false;
    this.loopA = 0;
    this.loopB = 10;
    this.loopPassCount = 0;

    // Speed Trainer
    this.speedTrainerEnabled = false;
    this.trainerStep = 2;
    this.trainerInterval = 2;
    this.trainerTarget = 100;

    // Mixer State
    this.drumsVolume = 0.85;
    this.bandVolume = 1.0;
    this.clickVolume = 0.65;
    this.drumsMuted = false;
    this.bandMuted = false;
    this.clickMuted = false;

    // Sample-Accurate Metronome Scheduling & Tap Tempo
    this.lastScheduledBeatIndex = -99999;
    this.lastVisualBeatIndex = -99999;
    this.tapTimes = [];
    this.rafId = null;
    this.draggingHandle = null;

    // Cache of synthesized demo Blob URLs
    this.synthCache = new Map();

    this.init();
  }

  async init() {
    this.cacheDom();
    this.bindEvents();
    await this.loadLibrary();
    if (this.songs.length > 0) {
      await this.selectSong(this.songs[0].id);
    }
    this.startRenderLoop();
  }

  cacheDom() {
    this.dom = {
      sidebar: document.getElementById('librarySidebar'),
      toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
      librarySearch: document.getElementById('librarySearch'),
      filterTags: document.getElementById('filterTags'),
      songList: document.getElementById('songList'),

      activeTimeSig: document.getElementById('activeTimeSig'),
      activeOrigBpm: document.getElementById('activeOrigBpm'),
      activeEffectiveBpm: document.getElementById('activeEffectiveBpm'),
      activeSongTitle: document.getElementById('activeSongTitle'),
      activeSongSubtitle: document.getElementById('activeSongSubtitle'),
      activeSongStars: document.getElementById('activeSongStars'),

      currentBarDisplay: document.getElementById('currentBarDisplay'),
      currentBeatLabel: document.getElementById('currentBeatLabel'),
      beatLeds: document.getElementById('beatLeds'),

      currentTimeDisplay: document.getElementById('currentTimeDisplay'),
      totalTimeDisplay: document.getElementById('totalTimeDisplay'),
      markerBar: document.getElementById('markerBar'),
      addMarkerBtn: document.getElementById('addMarkerBtn'),

      waveformContainer: document.getElementById('waveformContainer'),
      waveformCanvas: document.getElementById('waveformCanvas'),
      loopRegionOverlay: document.getElementById('loopRegionOverlay'),
      loopHandleA: document.getElementById('loopHandleA'),
      loopHandleB: document.getElementById('loopHandleB'),
      loopRegionBadge: document.getElementById('loopRegionBadge'),
      prerollRegionOverlay: document.getElementById('prerollRegionOverlay'),
      playheadLine: document.getElementById('playheadLine'),

      playPauseBtn: document.getElementById('playPauseBtn'),
      playPauseIcon: document.getElementById('playPauseIcon'),
      playPauseText: document.getElementById('playPauseText'),
      restartLoopBtn: document.getElementById('restartLoopBtn'),
      countInBtn: document.getElementById('countInBtn'),

      setABtn: document.getElementById('setABtn'),
      setBBtn: document.getElementById('setBBtn'),
      loopATimeText: document.getElementById('loopATimeText'),
      loopBTimeText: document.getElementById('loopBTimeText'),
      toggleLoopBtn: document.getElementById('toggleLoopBtn'),
      loopStateSub: document.getElementById('loopStateSub'),
      clearLoopBtn: document.getElementById('clearLoopBtn'),
      loopCounterBadge: document.getElementById('loopCounterBadge'),
      prerollToggle: document.getElementById('prerollToggle'),

      tempoPercentBadge: document.getElementById('tempoPercentBadge'),
      tempoSlider: document.getElementById('tempoSlider'),
      tempoMinusBtn: document.getElementById('tempoMinusBtn'),
      tempoPlusBtn: document.getElementById('tempoPlusBtn'),
      tempoPresets: document.querySelectorAll('.preset-btn'),

      speedTrainerToggle: document.getElementById('speedTrainerToggle'),
      speedTrainerStatus: document.getElementById('speedTrainerStatus'),
      trainerStepInput: document.getElementById('trainerStepInput'),
      trainerIntervalInput: document.getElementById('trainerIntervalInput'),
      trainerTargetInput: document.getElementById('trainerTargetInput'),

      muteClickBtn: document.getElementById('muteClickBtn'),
      clickToggleIcon: document.getElementById('clickToggleIcon'),
      clickToggleTitle: document.getElementById('clickToggleTitle'),
      clickToggleSub: document.getElementById('clickToggleSub'),
      clickStatusBadge: document.getElementById('clickStatusBadge'),

      // Precision Click Sync & BPM Controls
      autoDetectActiveBtn: document.getElementById('autoDetectActiveBtn'),
      tapTempoBtn: document.getElementById('tapTempoBtn'),
      bpmDecBtn: document.getElementById('bpmDecBtn'),
      bpmIncBtn: document.getElementById('bpmIncBtn'),
      liveBpmInput: document.getElementById('liveBpmInput'),
      bpmHalfBtn: document.getElementById('bpmHalfBtn'),
      bpmDoubleBtn: document.getElementById('bpmDoubleBtn'),
      beatOffsetLabel: document.getElementById('beatOffsetLabel'),
      nudgeLeftBtn: document.getElementById('nudgeLeftBtn'),
      syncDownbeatHereBtn: document.getElementById('syncDownbeatHereBtn'),
      nudgeRightBtn: document.getElementById('nudgeRightBtn'),

      songNotesArea: document.getElementById('songNotesArea'),
      notesSavedIndicator: document.getElementById('notesSavedIndicator'),
      noteChips: document.querySelectorAll('.note-chip'),

      countInOverlay: document.getElementById('countInOverlay'),
      countInNumber: document.getElementById('countInNumber'),
      countInDots: document.getElementById('countInDots'),

      uploadModal: document.getElementById('uploadModal'),
      openUploadModalBtn: document.getElementById('openUploadModalBtn'),
      closeModalBtn: document.getElementById('closeModalBtn'),
      cancelModalBtn: document.getElementById('cancelModalBtn'),
      addSongForm: document.getElementById('addSongForm'),
      bandFileInput: document.getElementById('bandFileInput'),
      songBpmInput: document.getElementById('songBpmInput'),
      songOffsetInput: document.getElementById('songOffsetInput'),
      bpmDetectStatus: document.getElementById('bpmDetectStatus'),
      bpmDetectText: document.getElementById('bpmDetectText'),
      reanalyzeModalBtn: document.getElementById('reanalyzeModalBtn')
    };
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  async loadLibrary() {
    let loadedSongs = DEFAULT_SONGS;
    try {
      const res = await fetch('songs.json');
      if (res.ok) {
        loadedSongs = await res.json();
      }
    } catch {
      // Fallback to embedded DEFAULT_SONGS
    }

    const savedState = this.loadSavedState();
    const idbTracks = await CustomTrackDB.getAllTracks();
    const customSongs = idbTracks.map((rec) => {
      const bandUrl = rec.bandBlob ? URL.createObjectURL(rec.bandBlob) : null;
      const drumsUrl = rec.drumsBlob ? URL.createObjectURL(rec.drumsBlob) : null;
      return {
        ...rec.songMeta,
        isCustomUpload: true,
        bandBlob: rec.bandBlob || null,
        drumsBlob: rec.drumsBlob || null,
        audio: { band: bandUrl, drums: drumsUrl }
      };
    });

    const allBaseSongs = [...customSongs, ...loadedSongs];
    this.songs = allBaseSongs.map((song) => {
      const custom = savedState[song.id] || {};
      return {
        ...song,
        bpm: custom.bpm ?? song.bpm ?? 120,
        beatOffset: custom.beatOffset ?? song.beatOffset ?? 0.0,
        rating: custom.rating ?? song.rating ?? 3,
        notes: custom.notes ?? song.notes ?? '',
        markers: custom.markers ?? song.markers ?? [],
        defaultLoop: custom.defaultLoop ?? song.defaultLoop ?? { a: 0, b: Math.min(10, song.duration || 20) }
      };
    });

    this.renderSongList();
  }

  loadSavedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveSongState(song) {
    if (!song) return;
    try {
      const state = this.loadSavedState();
      state[song.id] = {
        bpm: song.bpm,
        beatOffset: song.beatOffset ?? 0,
        rating: song.rating,
        notes: song.notes,
        markers: song.markers,
        defaultLoop: { a: this.loopA, b: this.loopB }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }

  renderSongList() {
    const query = this.searchQuery.trim().toLowerCase();
    const filtered = this.songs.filter((song) => {
      if (this.activeFilter !== 'ALL') {
        if (this.activeFilter === 'FAST') {
          if (song.bpm <= 130) return false;
        } else if (this.activeFilter === 'Gelernt') {
          if (song.rating < 4 && !song.tags.includes('Gelernt')) return false;
        } else if (this.activeFilter === 'In Arbeit') {
          if (song.rating >= 5 && !song.tags.includes('In Arbeit')) return false;
        } else if (!song.tags.includes(this.activeFilter)) {
          return false;
        }
      }

      if (!query) return true;
      return (
        song.title.toLowerCase().includes(query) ||
        (song.subtitle && song.subtitle.toLowerCase().includes(query)) ||
        String(song.bpm).includes(query) ||
        song.timeSignature.toLowerCase().includes(query)
      );
    });

    this.dom.songList.innerHTML = '';
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '18px';
      empty.style.color = '#94a3b8';
      empty.style.fontSize = '0.85rem';
      empty.textContent = 'Keine passenden Tracks in dieser Kategorie.';
      this.dom.songList.appendChild(empty);
      return;
    }

    filtered.forEach((song) => {
      const card = document.createElement('div');
      card.className = `song-card ${this.activeSong && this.activeSong.id === song.id ? 'active' : ''}`;
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', this.activeSong && this.activeSong.id === song.id ? 'true' : 'false');

      const starsStr = '★'.repeat(song.rating) + '☆'.repeat(5 - song.rating);
      card.innerHTML = `
        <div class="song-card-top">
          <div>
            <div class="song-card-title">${this.escapeHtml(song.title)}</div>
            <div class="song-card-sub">${this.escapeHtml(song.subtitle || '')}</div>
          </div>
          <span class="card-stars" title="Übungs-Fortschritt: ${song.rating}/5 Sterne">${starsStr}</span>
        </div>
        <div class="song-card-meta">
          <div class="meta-badges">
            <span class="mini-badge bpm">${song.bpm} BPM</span>
            <span class="mini-badge sig">${song.timeSignature}</span>
            ${song.tags
              .slice(0, 2)
              .map((t) => `<span class="mini-badge">${this.escapeHtml(t)}</span>`)
              .join('')}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectSong(song.id);
        this.dom.sidebar.classList.remove('open');
      });

      this.dom.songList.appendChild(card);
    });
  }

  async selectSong(songId) {
    this.stopPlayback();
    const song = this.songs.find((s) => s.id === songId);
    if (!song) return;
    this.activeSong = song;
    if (typeof song.beatOffset !== 'number' || !isFinite(song.beatOffset)) {
      song.beatOffset = 0.0;
    }

    // Header UI
    this.dom.activeSongTitle.textContent = song.title;
    this.dom.activeSongSubtitle.textContent = song.subtitle || '';
    this.dom.activeTimeSig.textContent = `${song.timeSignature} TAKT`;
    this.dom.activeOrigBpm.textContent = `${song.bpm} BPM`;

    this.renderStars();
    this.renderBeatLeds();
    this.dom.songNotesArea.value = song.notes || '';

    // Load or synthesize audio stems
    await this.prepareSongAudio(song);

    // Set default A-B Loop
    const dur = this.getDuration();
    this.loopA = song.defaultLoop ? Math.min(song.defaultLoop.a, dur - 1) : 0;
    this.loopB = song.defaultLoop ? Math.min(song.defaultLoop.b, dur) : dur;
    if (this.loopB <= this.loopA + 0.5) {
      this.loopA = 0;
      this.loopB = dur;
    }
    this.loopPassCount = 0;
    this.updateLoopUi();
    this.renderMarkers();
    this.updateTempoUi();
    this.updateSyncCalibrationUi();
    this.renderSongList();
    this.drawWaveform();
  }

  async prepareSongAudio(song) {
    if (song.audio && song.audio.band) {
      this.bandAudio.src = song.audio.band;
      if (song.audio.drums) {
        this.drumsAudio.src = song.audio.drums;
        this.hasSeparateDrums = true;
      } else {
        this.drumsAudio.removeAttribute('src');
        this.hasSeparateDrums = false;
      }
      await new Promise((resolve) => {
        this.bandAudio.onloadedmetadata = resolve;
        this.bandAudio.onerror = resolve;
      });
      song.duration = this.bandAudio.duration || song.duration || 30;
      if (song.customPeaks) {
        this.bandPeaks = song.customPeaks.band;
        this.drumPeaks = song.customPeaks.drums;
      } else {
        this.generateProceduralPeaks();
      }
    } else {
      let cached = this.synthCache.get(song.id);
      if (!cached) {
        cached = this.generateDemoStems(song);
        this.synthCache.set(song.id, cached);
      }
      this.bandAudio.src = cached.bandUrl;
      this.drumsAudio.src = cached.drumsUrl;
      this.hasSeparateDrums = true;
      this.bandPeaks = cached.bandPeaks;
      this.drumPeaks = cached.drumPeaks;
      song.duration = cached.duration;
    }

    this.applyMixerVolumes();
    this.applyPlaybackRate();
    this.dom.totalTimeDisplay.textContent = this.formatTime(song.duration);
    this.seekTo(this.loopEnabled ? this.loopA : 0);
  }

  /**
   * Re-analyzes the currently active song's audio buffer to detect exact BPM and Beat-1 offset.
   */
  async autoAnalyzeActiveSong() {
    if (!this.activeSong) return;
    const btn = this.dom.autoDetectActiveBtn;
    const origText = btn.textContent;
    btn.textContent = '⏳ Analysiere...';
    btn.disabled = true;

    try {
      this.ensureAudioContext();
      let audioBuffer = this.decodedBufferCache.get(this.activeSong.id);
      if (!audioBuffer) {
        // Prefer separate drum stem if available, otherwise band stem
        const targetUrl =
          (this.activeSong.audio && (this.activeSong.audio.drums || this.activeSong.audio.band)) ||
          this.bandAudio.src;
        const resp = await fetch(targetUrl);
        const arrayBuf = await resp.arrayBuffer();
        audioBuffer = await this.audioCtx.decodeAudioData(arrayBuf.slice(0));
        this.decodedBufferCache.set(this.activeSong.id, audioBuffer);
      }

      const result = BpmAnalyzer.analyzeAudioBuffer(audioBuffer);
      this.activeSong.bpm = result.bpm;
      this.activeSong.beatOffset = result.beatOffset;
      this.saveSongState(this.activeSong);
      this.lastScheduledBeatIndex = -99999;
      this.updateTempoUi();
      this.updateSyncCalibrationUi();
      this.renderSongList();
      this.drawWaveform();
      btn.textContent = `✓ ${result.bpm} BPM`;
      setTimeout(() => {
        btn.textContent = origText;
      }, 1800);
    } catch {
      btn.textContent = origText;
    } finally {
      btn.disabled = false;
    }
  }

  /**
   * Analyzes an uploaded File object in the Upload Modal and populates BPM & Beat-Offset automatically.
   */
  async analyzeUploadedFileInModal(file) {
    if (!file) return;
    this.dom.bpmDetectStatus.classList.remove('hidden');
    this.dom.bpmDetectText.textContent = '🔍 Analysiere Audio-Transienten für exakte BPM & Takt-Phase...';

    try {
      this.ensureAudioContext();
      const arrayBuf = await file.arrayBuffer();
      const decoded = await this.audioCtx.decodeAudioData(arrayBuf.slice(0));
      const result = BpmAnalyzer.analyzeAudioBuffer(decoded);

      this.dom.songBpmInput.value = String(result.bpm);
      this.dom.songOffsetInput.value = String(result.beatOffset);
      this.dom.bpmDetectText.textContent = `✓ Erkannt: ${result.bpm} BPM · Beat-1 Start bei +${result.beatOffset.toFixed(3)}s`;
      return { decoded, result };
    } catch {
      this.dom.bpmDetectText.textContent = '⚠ Automatische Erkennung nicht möglich – bitte BPM manuell eingeben.';
      return null;
    }
  }

  generateDemoStems(song) {
    const sampleRate = 22050;
    const beatsPerBar = song.beatsPerBar || 4;
    const totalBars = 16;
    const beatDur = 60 / song.bpm;
    const barDur = beatDur * beatsPerBar;
    const duration = totalBars * barDur;
    const totalSamples = Math.floor(duration * sampleRate);

    const bandSamples = new Float32Array(totalSamples);
    const drumSamples = new Float32Array(totalSamples);

    const roots =
      song.demoSynth === 'funk'
        ? [110, 130.81, 146.83, 123.47]
        : song.demoSynth === 'rock'
        ? [82.41, 110.0, 123.47, 98.0]
        : song.demoSynth === 'ballad68'
        ? [98.0, 82.41, 130.81, 146.83]
        : [73.42, 77.78, 87.31, 65.41];

    const totalBeats = totalBars * beatsPerBar;
    const subStepsPerBeat = song.timeSignature === '6/8' ? 2 : 4;
    const totalSubSteps = totalBeats * subStepsPerBeat;
    const stepDur = beatDur / subStepsPerBeat;

    for (let step = 0; step < totalSubSteps; step++) {
      const stepStartSample = Math.floor(step * stepDur * sampleRate);
      const beatInSong = Math.floor(step / subStepsPerBeat);
      const subInBeat = step % subStepsPerBeat;
      const barIndex = Math.floor(beatInSong / beatsPerBar);
      const beatInBar = beatInSong % beatsPerBar;
      const isFillBar = barIndex % 4 === 3 && beatInBar >= beatsPerBar - 2;

      let triggerKick = false;
      if (song.demoSynth === 'funk') {
        triggerKick =
          (beatInBar === 0 && subInBeat === 0) ||
          (beatInBar === 1 && subInBeat === 3) ||
          (beatInBar === 2 && subInBeat === 2);
      } else if (song.demoSynth === 'rock') {
        triggerKick =
          (beatInBar === 0 && subInBeat === 0) ||
          (beatInBar === 2 && (subInBeat === 0 || subInBeat === 2));
      } else if (song.demoSynth === 'ballad68') {
        triggerKick = (beatInBar === 0 && subInBeat === 0) || (beatInBar === 2 && subInBeat === 1);
      } else {
        triggerKick = subInBeat === 0 || subInBeat === 2;
      }

      if (triggerKick) {
        this.addSynthKick(drumSamples, stepStartSample, sampleRate, 0.85);
      }

      let snareVel = 0;
      if (isFillBar) {
        snareVel = subInBeat % 2 === 0 ? 0.85 : 0.55;
      } else if (song.timeSignature === '6/8') {
        if (beatInBar === 3 && subInBeat === 0) snareVel = 0.9;
      } else {
        if ((beatInBar === 1 || beatInBar === 3) && subInBeat === 0) {
          snareVel = 0.92;
        } else if (song.demoSynth === 'funk' && (subInBeat === 1 || subInBeat === 3) && step % 3 === 0) {
          snareVel = 0.24;
        }
      }

      if (snareVel > 0) {
        this.addSynthSnare(drumSamples, stepStartSample, sampleRate, snareVel, isFillBar ? (step % 4) * 35 : 0);
      }

      const isSectionStart = barIndex % 4 === 0 && beatInBar === 0 && subInBeat === 0;
      if (isSectionStart) {
        this.addSynthCymbal(drumSamples, stepStartSample, sampleRate, 0.45, 0.55);
      } else if (subInBeat === 0 || subInBeat === 2) {
        this.addSynthCymbal(drumSamples, stepStartSample, sampleRate, 0.22, 0.045);
      }

      const rootFreq = roots[barIndex % roots.length];
      const bassActive =
        subInBeat === 0 ||
        (song.demoSynth === 'funk' && subInBeat === 3 && beatInBar % 2 === 0) ||
        (song.demoSynth === 'fast' && subInBeat === 2);

      if (bassActive) {
        const freq = subInBeat === 3 ? rootFreq * 1.5 : rootFreq;
        const noteLen = stepDur * 1.75;
        this.addSynthBass(bandSamples, stepStartSample, sampleRate, freq, noteLen, 0.48);
      }

      if (subInBeat === 0 && (beatInBar === 0 || beatInBar === 2)) {
        const chordLen = beatDur * 1.6;
        this.addSynthChord(bandSamples, stepStartSample, sampleRate, rootFreq * 2, chordLen, 0.22);
      }
    }

    const numPeaks = 260;
    const bandPeaks = this.computePeaksFromArray(bandSamples, numPeaks);
    const drumPeaks = this.computePeaksFromArray(drumSamples, numPeaks);

    const bandUrl = this.encodeWavBlobUrl(bandSamples, sampleRate);
    const drumsUrl = this.encodeWavBlobUrl(drumSamples, sampleRate);

    return {
      bandUrl,
      drumsUrl,
      bandPeaks,
      drumPeaks,
      duration
    };
  }

  addSynthKick(buf, startIdx, sr, amp) {
    const len = Math.floor(0.18 * sr);
    for (let i = 0; i < len && startIdx + i < buf.length; i++) {
      const t = i / sr;
      const freq = 52 + 115 * Math.exp(-t * 38);
      const env = Math.exp(-t * 16);
      buf[startIdx + i] = Math.max(-0.98, Math.min(0.98, buf[startIdx + i] + Math.sin(2 * Math.PI * freq * t) * env * amp));
    }
  }

  addSynthSnare(buf, startIdx, sr, amp, pitchOffset = 0) {
    const len = Math.floor(0.16 * sr);
    for (let i = 0; i < len && startIdx + i < buf.length; i++) {
      const t = i / sr;
      const bodyFreq = 185 - pitchOffset;
      const body = Math.sin(2 * Math.PI * bodyFreq * t) * Math.exp(-t * 24);
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 19);
      const sample = (body * 0.55 + noise * 0.65) * amp;
      buf[startIdx + i] = Math.max(-0.98, Math.min(0.98, buf[startIdx + i] + sample));
    }
  }

  addSynthCymbal(buf, startIdx, sr, amp, decaySec) {
    const len = Math.floor(decaySec * sr);
    for (let i = 0; i < len && startIdx + i < buf.length; i++) {
      const t = i / sr;
      const env = Math.exp(-t / (decaySec * 0.35));
      const metallic =
        Math.sin(2 * Math.PI * 3420 * t) * 0.3 +
        Math.sin(2 * Math.PI * 5180 * t) * 0.3 +
        (Math.random() * 2 - 1) * 0.6;
      buf[startIdx + i] = Math.max(-0.98, Math.min(0.98, buf[startIdx + i] + metallic * env * amp));
    }
  }

  addSynthBass(buf, startIdx, sr, freq, durSec, amp) {
    const len = Math.floor(durSec * sr);
    for (let i = 0; i < len && startIdx + i < buf.length; i++) {
      const t = i / sr;
      const env = Math.min(1, t * 80) * Math.exp(-t * 4.5);
      const wave = Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2 * t);
      buf[startIdx + i] = Math.max(-0.98, Math.min(0.98, buf[startIdx + i] + wave * env * amp));
    }
  }

  addSynthChord(buf, startIdx, sr, rootFreq, durSec, amp) {
    const len = Math.floor(durSec * sr);
    const ratios = [1, 1.25, 1.5, 1.78];
    for (let i = 0; i < len && startIdx + i < buf.length; i++) {
      const t = i / sr;
      const env = Math.min(1, t * 40) * Math.exp(-t * 2.8);
      let sum = 0;
      for (let r = 0; r < ratios.length; r++) {
        sum += Math.sin(2 * Math.PI * rootFreq * ratios[r] * t);
      }
      buf[startIdx + i] = Math.max(-0.98, Math.min(0.98, buf[startIdx + i] + (sum / ratios.length) * env * amp));
    }
  }

  computePeaksFromArray(samples, count) {
    const peaks = new Array(count).fill(0);
    const blockSize = Math.floor(samples.length / count) || 1;
    let maxPeak = 0.01;
    for (let i = 0; i < count; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize && start + j < samples.length; j += 4) {
        const v = Math.abs(samples[start + j]);
        if (v > sum) sum = v;
      }
      peaks[i] = sum;
      if (sum > maxPeak) maxPeak = sum;
    }
    return peaks.map((p) => Math.max(0.06, p / maxPeak));
  }

  generateProceduralPeaks() {
    const count = 260;
    this.bandPeaks = [];
    this.drumPeaks = [];
    for (let i = 0; i < count; i++) {
      const b = 0.25 + 0.55 * Math.abs(Math.sin(i * 0.19) * Math.cos(i * 0.07));
      const d = 0.15 + 0.8 * Math.abs(Math.sin(i * 0.52));
      this.bandPeaks.push(b);
      this.drumPeaks.push(d);
    }
  }

  encodeWavBlobUrl(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  // --- TRANSPORT, COUNT-IN & SAMPLE-ACCURATE METRONOME ---

  togglePlayPause() {
    if (this.isCountingIn) {
      this.cancelCountIn();
      return;
    }
    if (this.isPlaying) {
      this.pausePlayback();
    } else {
      if (this.countInEnabled) {
        this.startCountInAndPlay();
      } else {
        this.startPlayback();
      }
    }
  }

  startCountInAndPlay() {
    this.ensureAudioContext();
    this.cancelCountIn();
    this.isCountingIn = true;

    const beats = this.activeSong ? this.activeSong.beatsPerBar || 4 : 4;
    const effectiveBpm = this.getEffectiveBpm();
    const intervalMs = (60 / effectiveBpm) * 1000;

    this.dom.countInDots.innerHTML = '';
    for (let i = 0; i < beats; i++) {
      const dot = document.createElement('div');
      dot.className = 'count-dot';
      this.dom.countInDots.appendChild(dot);
    }
    this.dom.countInOverlay.classList.remove('hidden');

    let step = 0;
    const tick = () => {
      if (!this.isCountingIn) return;
      if (step >= beats) {
        this.cancelCountIn();
        this.startPlayback();
        return;
      }
      this.dom.countInNumber.textContent = String(step + 1);
      const dots = this.dom.countInDots.querySelectorAll('.count-dot');
      dots.forEach((d, idx) => d.classList.toggle('lit', idx <= step));

      this.scheduleClickSoundAt(this.audioCtx.currentTime, step === 0, true);
      this.highlightBeatLed(step);

      step++;
      this.countInTimer = setTimeout(tick, intervalMs);
    };

    tick();
  }

  cancelCountIn() {
    this.isCountingIn = false;
    if (this.countInTimer) {
      clearTimeout(this.countInTimer);
      this.countInTimer = null;
    }
    this.dom.countInOverlay.classList.add('hidden');
  }

  startPlayback() {
    this.ensureAudioContext();
    const cur = this.bandAudio.currentTime;
    const startTarget = this.getEffectiveLoopStart();
    if (this.loopEnabled && (cur < startTarget || cur >= this.loopB)) {
      this.seekTo(startTarget);
    }

    this.lastScheduledBeatIndex = -99999;
    this.lastVisualBeatIndex = -99999;
    this.bandAudio.play().catch(() => {});
    if (this.hasSeparateDrums) {
      this.drumsAudio.currentTime = this.bandAudio.currentTime;
      this.drumsAudio.play().catch(() => {});
    }
    this.isPlaying = true;
    this.updateTransportButtons();
  }

  pausePlayback() {
    this.bandAudio.pause();
    if (this.hasSeparateDrums) {
      this.drumsAudio.pause();
    }
    this.isPlaying = false;
    this.updateTransportButtons();
  }

  stopPlayback() {
    this.cancelCountIn();
    this.pausePlayback();
    this.seekTo(0);
  }

  restartLoopOrSong() {
    const target = this.loopEnabled ? this.getEffectiveLoopStart() : 0;
    this.seekTo(target);
    if (!this.isPlaying && !this.isCountingIn) {
      if (this.countInEnabled) {
        this.startCountInAndPlay();
      } else {
        this.startPlayback();
      }
    }
  }

  seekTo(seconds) {
    const dur = this.getDuration();
    const clamped = Math.max(0, Math.min(dur, seconds));
    this.bandAudio.currentTime = clamped;
    if (this.hasSeparateDrums) {
      this.drumsAudio.currentTime = clamped;
    }
    this.lastScheduledBeatIndex = -99999;
    this.lastVisualBeatIndex = -99999;
    this.updatePlayheadUi(clamped);
  }

  getDuration() {
    if (this.activeSong && this.activeSong.duration) return this.activeSong.duration;
    if (this.bandAudio.duration && isFinite(this.bandAudio.duration)) return this.bandAudio.duration;
    return 30;
  }

  getOneBarSeconds() {
    if (!this.activeSong) return 2;
    const beats = this.activeSong.beatsPerBar || 4;
    return (60 / this.activeSong.bpm) * beats;
  }

  getEffectiveLoopStart() {
    if (!this.prerollEnabled) return this.loopA;
    return Math.max(0, this.loopA - this.getOneBarSeconds());
  }

  getEffectiveBpm() {
    const base = this.activeSong ? this.activeSong.bpm : 120;
    return Number((base * (this.tempoPercent / 100)).toFixed(1));
  }

  /**
   * Schedules a studio woodblock/click tone at an exact Web Audio hardware timestamp (`when`).
   */
  scheduleClickSoundAt(when, isDownbeat, forceAudible = false) {
    if (!forceAudible && (this.clickMuted || this.clickVolume <= 0.01)) return;
    this.ensureAudioContext();

    const startTime = Math.max(this.audioCtx.currentTime, when);
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isDownbeat ? 1560 : 1020, startTime);
    osc.frequency.exponentialRampToValueAtTime(isDownbeat ? 760 : 510, startTime + 0.032);

    const vol = forceAudible ? Math.max(0.55, this.clickVolume) : this.clickVolume;
    gain.gain.setValueAtTime(vol * (isDownbeat ? 0.62 : 0.4), startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.042);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.045);
  }

  // --- REALTIME LOOP & SAMPLE-ACCURATE LOOKAHEAD METRONOME ---

  startRenderLoop() {
    const tick = () => {
      if (this.isPlaying && this.activeSong) {
        const cur = this.bandAudio.currentTime;
        const dur = this.getDuration();

        // Keep Drum stem tightly phase-synced with Band stem
        if (this.hasSeparateDrums && Math.abs(this.drumsAudio.currentTime - cur) > 0.03) {
          this.drumsAudio.currentTime = cur;
        }

        // Check A-B Loop boundary
        if (this.loopEnabled && cur >= this.loopB) {
          this.onLoopCompleted();
          this.rafId = requestAnimationFrame(tick);
          return;
        } else if (cur >= dur - 0.04) {
          this.seekTo(this.loopEnabled ? this.getEffectiveLoopStart() : 0);
          if (!this.loopEnabled) this.pausePlayback();
          this.rafId = requestAnimationFrame(tick);
          return;
        }

        // Phase-locked Beat & Bar calculation relative to song.beatOffset
        const beatOffset = this.activeSong.beatOffset || 0;
        const beatDurationSongTime = 60 / this.activeSong.bpm;
        const playbackRate = this.tempoPercent / 100;
        const relSongTime = cur - beatOffset;
        const exactBeatFloat = relSongTime / beatDurationSongTime;
        const currentBeatIndex = Math.floor(exactBeatFloat + 0.002);
        const beatsPerBar = this.activeSong.beatsPerBar || 4;

        // 1. Update visual Beat LEDs when crossing a beat
        if (currentBeatIndex !== this.lastVisualBeatIndex && relSongTime >= -0.02) {
          this.lastVisualBeatIndex = currentBeatIndex;
          const beatInBar = ((currentBeatIndex % beatsPerBar) + beatsPerBar) % beatsPerBar;
          const barNumber = Math.floor(currentBeatIndex / beatsPerBar) + 1;

          this.dom.currentBarDisplay.textContent = `TAKT ${Math.max(1, barNumber)}`;
          this.dom.currentBeatLabel.textContent = `BEAT ${beatInBar + 1}`;
          this.highlightBeatLed(beatInBar);

          // If currentBeatIndex wasn't lookahead-scheduled yet (e.g. right after seek/start), play immediately
          if (currentBeatIndex > this.lastScheduledBeatIndex && this.audioCtx) {
            this.lastScheduledBeatIndex = currentBeatIndex;
            this.scheduleClickSoundAt(this.audioCtx.currentTime, beatInBar === 0, false);
          }
        }

        // 2. Sample-Accurate Lookahead Scheduling for upcoming beat (within next 45ms of real time)
        if (this.audioCtx) {
          const nextBeatIndex = Math.ceil(exactBeatFloat);
          if (nextBeatIndex > this.lastScheduledBeatIndex && nextBeatIndex >= 0) {
            const nextBeatSongTime = beatOffset + nextBeatIndex * beatDurationSongTime;
            const songDeltaSec = nextBeatSongTime - cur;
            const realDeltaSec = songDeltaSec / playbackRate;

            if (realDeltaSec >= -0.005 && realDeltaSec <= 0.045) {
              this.lastScheduledBeatIndex = nextBeatIndex;
              const nextBeatInBar = ((nextBeatIndex % beatsPerBar) + beatsPerBar) % beatsPerBar;
              this.scheduleClickSoundAt(
                this.audioCtx.currentTime + Math.max(0, realDeltaSec),
                nextBeatInBar === 0,
                false
              );
            }
          }
        }

        this.updatePlayheadUi(cur);
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  onLoopCompleted() {
    this.loopPassCount++;
    this.dom.loopCounterBadge.textContent = `Durchgang #${this.loopPassCount}`;

    if (this.speedTrainerEnabled && this.tempoPercent < this.trainerTarget) {
      if (this.loopPassCount % this.trainerInterval === 0) {
        const nextTempo = Math.min(this.trainerTarget, this.tempoPercent + this.trainerStep);
        this.setTempoPercent(nextTempo);
      }
    }

    const restartPos = this.getEffectiveLoopStart();
    this.seekTo(restartPos);
  }

  // --- BPM, TAP-TEMPO & PHASE CALIBRATION ---

  setSongBpm(newBpm) {
    if (!this.activeSong) return;
    const clamped = Math.max(40, Math.min(260, Number(Number(newBpm).toFixed(1))));
    if (!isFinite(clamped)) return;
    this.activeSong.bpm = clamped;
    this.lastScheduledBeatIndex = -99999;
    this.saveSongState(this.activeSong);
    this.updateTempoUi();
    this.updateSyncCalibrationUi();
    this.renderSongList();
    this.drawWaveform();
  }

  nudgeBeatOffset(deltaSeconds) {
    if (!this.activeSong) return;
    const beatDur = 60 / this.activeSong.bpm;
    let nextOffset = (this.activeSong.beatOffset || 0) + deltaSeconds;
    // Keep offset positive and reasonable
    if (nextOffset < 0) {
      nextOffset = ((nextOffset % beatDur) + beatDur) % beatDur;
    }
    this.activeSong.beatOffset = Number(nextOffset.toFixed(3));
    this.lastScheduledBeatIndex = -99999;
    this.saveSongState(this.activeSong);
    this.updateSyncCalibrationUi();
    this.drawWaveform();
  }

  syncDownbeatAtCurrentTime() {
    if (!this.activeSong) return;
    const cur = this.bandAudio.currentTime;
    const barDur = this.getOneBarSeconds();
    // Modulo one bar so Beat 1 of the bar lands right on `cur`, while early bars still get clicks
    const phaseInBar = ((cur % barDur) + barDur) % barDur;
    this.activeSong.beatOffset = Number(phaseInBar.toFixed(3));
    this.lastScheduledBeatIndex = -99999;
    this.lastVisualBeatIndex = -99999;
    this.saveSongState(this.activeSong);
    this.updateSyncCalibrationUi();
    this.drawWaveform();
    this.ensureAudioContext();
    this.scheduleClickSoundAt(this.audioCtx.currentTime, true, true);
  }

  registerTapTempo() {
    const now = performance.now();
    if (this.tapTimes.length > 0 && now - this.tapTimes[this.tapTimes.length - 1] > 2500) {
      this.tapTimes = [];
    }
    this.tapTimes.push(now);
    if (this.tapTimes.length > 8) {
      this.tapTimes.shift();
    }

    this.ensureAudioContext();
    this.scheduleClickSoundAt(this.audioCtx.currentTime, this.tapTimes.length === 1, true);

    if (this.tapTimes.length >= 2) {
      let sumIntervals = 0;
      for (let i = 1; i < this.tapTimes.length; i++) {
        sumIntervals += this.tapTimes[i] - this.tapTimes[i - 1];
      }
      const avgMs = sumIntervals / (this.tapTimes.length - 1);
      const tappedEffectiveBpm = 60000 / avgMs;
      // Convert from effective playback speed back to original song BPM
      const origBpm = Math.round((tappedEffectiveBpm / (this.tempoPercent / 100)) * 2) / 2;
      this.setSongBpm(origBpm);
    }
  }

  updateSyncCalibrationUi() {
    if (!this.activeSong) return;
    if (this.dom.liveBpmInput) {
      this.dom.liveBpmInput.value = String(this.activeSong.bpm);
    }
    if (this.dom.beatOffsetLabel) {
      const off = this.activeSong.beatOffset || 0;
      this.dom.beatOffsetLabel.textContent = `Grid-Start: +${off.toFixed(3)}s`;
    }
    this.dom.activeOrigBpm.textContent = `${this.activeSong.bpm} BPM`;
  }

  // --- UI RENDERERS & UPDATERS ---

  updateTransportButtons() {
    this.dom.playPauseBtn.classList.toggle('playing', this.isPlaying);
    this.dom.playPauseIcon.textContent = this.isPlaying ? '⏸' : '▶';
    this.dom.playPauseText.textContent = this.isPlaying ? 'PAUSE' : 'PLAY';
  }

  renderBeatLeds() {
    const beats = this.activeSong ? this.activeSong.beatsPerBar || 4 : 4;
    this.dom.beatLeds.innerHTML = '';
    for (let i = 0; i < beats; i++) {
      const led = document.createElement('div');
      led.className = 'beat-led';
      this.dom.beatLeds.appendChild(led);
    }
  }

  highlightBeatLed(beatIndex) {
    const leds = this.dom.beatLeds.querySelectorAll('.beat-led');
    leds.forEach((led, idx) => {
      led.classList.remove('active-downbeat', 'active-beat');
      if (idx === beatIndex) {
        led.classList.add(idx === 0 ? 'active-downbeat' : 'active-beat');
      }
    });
  }

  renderStars() {
    if (!this.activeSong) return;
    this.dom.activeSongStars.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `star-btn ${i <= this.activeSong.rating ? 'filled' : ''}`;
      btn.textContent = '★';
      btn.title = `${i} von 5 Sternen ("Sitzt")`;
      btn.addEventListener('click', () => {
        this.activeSong.rating = i;
        this.saveSongState(this.activeSong);
        this.renderStars();
        this.renderSongList();
      });
      this.dom.activeSongStars.appendChild(btn);
    }
  }

  renderMarkers() {
    this.dom.markerBar.innerHTML = '';
    if (!this.activeSong || !this.activeSong.markers) return;

    const sorted = [...this.activeSong.markers].sort((a, b) => a.time - b.time);
    sorted.forEach((marker, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'marker-pill';
      btn.title = 'Klick = Zum Abschnitt springen · Doppelklick = Diesen Abschnitt als A–B Loop isolieren';
      btn.innerHTML = `
        <span class="marker-dot" style="background:${marker.color || '#38bdf8'}"></span>
        <span>${this.escapeHtml(marker.label)}</span>
        <span class="marker-time">${this.formatTime(marker.time)}</span>
      `;

      btn.addEventListener('click', () => {
        this.seekTo(marker.time);
      });

      btn.addEventListener('dblclick', () => {
        const nextMarker = sorted[idx + 1];
        this.loopA = marker.time;
        this.loopB = nextMarker ? nextMarker.time : this.getDuration();
        this.loopEnabled = true;
        this.loopPassCount = 0;
        this.updateLoopUi();
        this.seekTo(this.getEffectiveLoopStart());
      });

      this.dom.markerBar.appendChild(btn);
    });
  }

  updatePlayheadUi(currentTime) {
    const dur = this.getDuration();
    const pct = dur > 0 ? Math.max(0, Math.min(100, (currentTime / dur) * 100)) : 0;
    this.dom.playheadLine.style.left = `${pct}%`;
    this.dom.currentTimeDisplay.textContent = this.formatTime(currentTime);
  }

  updateLoopUi() {
    const dur = this.getDuration();
    const leftPct = dur > 0 ? (this.loopA / dur) * 100 : 0;
    const widthPct = dur > 0 ? Math.max(1, ((this.loopB - this.loopA) / dur) * 100) : 100;

    this.dom.loopRegionOverlay.classList.remove('hidden');
    this.dom.loopRegionOverlay.classList.toggle('inactive-loop', !this.loopEnabled);
    this.dom.loopRegionOverlay.style.left = `${leftPct}%`;
    this.dom.loopRegionOverlay.style.width = `${widthPct}%`;

    if (this.loopEnabled && this.prerollEnabled && this.loopA > 0.2) {
      const preStart = this.getEffectiveLoopStart();
      const preLeftPct = (preStart / dur) * 100;
      const preWidthPct = Math.max(0, leftPct - preLeftPct);
      this.dom.prerollRegionOverlay.classList.remove('hidden');
      this.dom.prerollRegionOverlay.style.left = `${preLeftPct}%`;
      this.dom.prerollRegionOverlay.style.width = `${preWidthPct}%`;
    } else {
      this.dom.prerollRegionOverlay.classList.add('hidden');
    }

    this.dom.loopATimeText.textContent = this.formatTime(this.loopA);
    this.dom.loopBTimeText.textContent = this.formatTime(this.loopB);

    this.dom.toggleLoopBtn.classList.toggle('active', this.loopEnabled);
    this.dom.toggleLoopBtn.setAttribute('aria-pressed', String(this.loopEnabled));
    this.dom.loopStateSub.textContent = this.loopEnabled ? 'Endlos wiederholen' : 'Deaktiviert';
    this.dom.loopRegionBadge.textContent = this.loopEnabled
      ? `A–B LOOP (${(this.loopB - this.loopA).toFixed(1)}s)`
      : 'LOOP AUS';
    this.dom.loopCounterBadge.textContent = `Durchgang #${this.loopPassCount}`;
  }

  setTempoPercent(pct) {
    this.tempoPercent = Math.max(50, Math.min(120, Math.round(pct)));
    this.applyPlaybackRate();
    this.updateTempoUi();
  }

  applyPlaybackRate() {
    const rate = this.tempoPercent / 100;
    this.bandAudio.preservesPitch = true;
    this.drumsAudio.preservesPitch = true;
    this.bandAudio.playbackRate = rate;
    this.drumsAudio.playbackRate = rate;
  }

  updateTempoUi() {
    const effBpm = this.getEffectiveBpm();
    this.dom.tempoSlider.value = String(this.tempoPercent);
    this.dom.tempoPercentBadge.textContent = `${this.tempoPercent}% · ${effBpm} BPM`;
    this.dom.activeEffectiveBpm.textContent = `Effektiv: ${effBpm} BPM (${this.tempoPercent}%)`;

    this.dom.tempoPresets.forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.tempo) === this.tempoPercent);
    });

    if (this.speedTrainerEnabled) {
      this.dom.speedTrainerStatus.textContent = `Aktiv (${this.tempoPercent}% → ${this.trainerTarget}%)`;
      this.dom.speedTrainerStatus.classList.add('active');
    } else {
      this.dom.speedTrainerStatus.textContent = 'Aus';
      this.dom.speedTrainerStatus.classList.remove('active');
    }
  }

  applyMixerVolumes() {
    this.bandAudio.volume = 1.0;
    this.drumsAudio.volume = 0.85;

    const clickActive = !this.clickMuted;
    if (this.dom.muteClickBtn) {
      this.dom.muteClickBtn.classList.toggle('active', clickActive);
      this.dom.muteClickBtn.classList.toggle('muted', !clickActive);
      this.dom.muteClickBtn.setAttribute('aria-pressed', String(clickActive));
    }
    if (this.dom.clickToggleIcon) {
      this.dom.clickToggleIcon.textContent = clickActive ? '🔔' : '🔕';
    }
    if (this.dom.clickToggleTitle) {
      this.dom.clickToggleTitle.textContent = clickActive ? 'CLICK: AN' : 'CLICK: AUS';
    }
    if (this.dom.clickStatusBadge) {
      this.dom.clickStatusBadge.textContent = clickActive ? 'Click Synchronisiert' : 'Click Stumm';
      this.dom.clickStatusBadge.classList.toggle('active', clickActive);
    }

    this.drawWaveform();
  }

  drawWaveform() {
    const canvas = this.dom.waveformCanvas;
    const rect = this.dom.waveformContainer.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(100, Math.floor(rect.height));

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const midY = height / 2;
    const dur = this.getDuration();

    // Draw Phase-Aligned Beat & Bar Grid Lines (aligned to song.beatOffset)
    if (this.activeSong && dur > 0) {
      const beatSec = 60 / this.activeSong.bpm;
      const beatsPerBar = this.activeSong.beatsPerBar || 4;
      const offset = this.activeSong.beatOffset || 0;

      let beatIdx = 0;
      for (let t = offset; t < dur; t += beatSec, beatIdx++) {
        if (t < 0) continue;
        const x = (t / dur) * width;
        const isBarLine = beatIdx % beatsPerBar === 0;
        ctx.strokeStyle = isBarLine ? 'rgba(56, 189, 248, 0.28)' : 'rgba(148, 163, 184, 0.08)';
        ctx.lineWidth = isBarLine ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Draw Waveform Bars (Band in Cyan, Drums in Amber overlay)
    const count = this.bandPeaks.length || 1;
    const barGap = width / count;
    const barWidth = Math.max(1.5, barGap * 0.68);

    for (let i = 0; i < count; i++) {
      const x = i * barGap;
      const bandAmp = (this.bandPeaks[i] || 0.1) * (this.bandMuted ? 0.15 : this.bandVolume);
      const drumAmp = (this.drumPeaks[i] || 0.1) * (this.drumsMuted ? 0.08 : this.drumsVolume);

      const bh = Math.max(3, bandAmp * (height * 0.8));
      ctx.fillStyle = this.bandMuted ? 'rgba(100, 116, 139, 0.3)' : 'rgba(56, 189, 248, 0.65)';
      ctx.fillRect(x, midY - bh / 2, barWidth, bh);

      if (!this.drumsMuted) {
        const dh = Math.max(2, drumAmp * (height * 0.72));
        ctx.fillStyle = 'rgba(245, 158, 11, 0.75)';
        ctx.fillRect(x, midY - dh / 2, barWidth, dh);
      }
    }

    // Draw Section Marker Flags on Canvas
    if (this.activeSong && this.activeSong.markers && dur > 0) {
      this.activeSong.markers.forEach((m) => {
        const x = (m.time / dur) * width;
        ctx.strokeStyle = m.color || '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.fillStyle = m.color || '#38bdf8';
        ctx.font = '700 10px Inter, sans-serif';
        ctx.fillText(m.label, x + 5, 14);
      });
    }
  }

  // --- EVENT BINDINGS ---

  bindEvents() {
    window.addEventListener('resize', () => this.drawWaveform());

    this.dom.toggleSidebarBtn.addEventListener('click', () => {
      this.dom.sidebar.classList.toggle('open');
    });

    this.dom.librarySearch.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderSongList();
    });

    this.dom.filterTags.addEventListener('click', (e) => {
      const chip = e.target.closest('.tag-chip');
      if (!chip) return;
      this.activeFilter = chip.dataset.filter;
      this.dom.filterTags.querySelectorAll('.tag-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      this.renderSongList();
    });

    this.dom.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.dom.restartLoopBtn.addEventListener('click', () => this.restartLoopOrSong());
    this.dom.countInBtn.addEventListener('click', () => {
      this.countInEnabled = !this.countInEnabled;
      this.dom.countInBtn.classList.toggle('active', this.countInEnabled);
      this.dom.countInBtn.setAttribute('aria-pressed', String(this.countInEnabled));
      const labelEl = this.dom.countInBtn.querySelector('.pad-title');
      if (labelEl) {
        labelEl.textContent = this.countInEnabled ? 'VORZÄHLER: AN' : 'VORZÄHLER: AUS';
      }
    });

    // A-B Loop Controls
    this.dom.setABtn.addEventListener('click', () => {
      const cur = this.bandAudio.currentTime;
      this.loopA = Math.min(cur, this.loopB - 0.5);
      if (this.loopA < 0) this.loopA = 0;
      this.loopEnabled = true;
      this.updateLoopUi();
      this.saveSongState(this.activeSong);
    });

    this.dom.setBBtn.addEventListener('click', () => {
      const cur = this.bandAudio.currentTime;
      if (cur > this.loopA + 0.4) {
        this.loopB = cur;
      } else {
        this.loopB = Math.min(this.getDuration(), this.loopA + this.getOneBarSeconds() * 2);
      }
      this.loopEnabled = true;
      this.updateLoopUi();
      this.saveSongState(this.activeSong);
    });

    this.dom.toggleLoopBtn.addEventListener('click', () => {
      this.loopEnabled = !this.loopEnabled;
      this.updateLoopUi();
    });

    this.dom.clearLoopBtn.addEventListener('click', () => {
      this.loopA = 0;
      this.loopB = this.getDuration();
      this.loopPassCount = 0;
      this.updateLoopUi();
    });

    this.dom.prerollToggle.addEventListener('change', (e) => {
      this.prerollEnabled = e.target.checked;
      this.updateLoopUi();
    });

    // Waveform Seeking & Dragging Loop Handles
    this.dom.waveformContainer.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#loopHandleA')) {
        this.draggingHandle = 'A';
        e.stopPropagation();
        return;
      }
      if (e.target.closest('#loopHandleB')) {
        this.draggingHandle = 'B';
        e.stopPropagation();
        return;
      }
      const rect = this.dom.waveformContainer.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.seekTo(ratio * this.getDuration());
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.draggingHandle) return;
      const rect = this.dom.waveformContainer.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = ratio * this.getDuration();
      if (this.draggingHandle === 'A') {
        this.loopA = Math.min(time, this.loopB - 0.5);
      } else if (this.draggingHandle === 'B') {
        this.loopB = Math.max(time, this.loopA + 0.5);
      }
      this.loopEnabled = true;
      this.updateLoopUi();
    });

    window.addEventListener('pointerup', () => {
      if (this.draggingHandle) {
        this.draggingHandle = null;
        this.saveSongState(this.activeSong);
      }
    });

    // Add Custom Marker
    this.dom.addMarkerBtn.addEventListener('click', () => {
      if (!this.activeSong) return;
      const cur = this.bandAudio.currentTime;
      const label = prompt('Name für diesen Song-Abschnitt (z. B. Fill, Solo, Bridge):', 'Fill / Part');
      if (!label) return;
      const colors = ['#38bdf8', '#4ade80', '#f59e0b', '#f43f5e', '#a855f7'];
      const color = colors[this.activeSong.markers.length % colors.length];
      this.activeSong.markers.push({ label: label.trim(), time: Number(cur.toFixed(2)), color });
      this.saveSongState(this.activeSong);
      this.renderMarkers();
      this.drawWaveform();
    });

    // Tempo & Speed Trainer
    this.dom.tempoSlider.addEventListener('input', (e) => {
      this.setTempoPercent(Number(e.target.value));
    });
    this.dom.tempoMinusBtn.addEventListener('click', () => this.setTempoPercent(this.tempoPercent - 2));
    this.dom.tempoPlusBtn.addEventListener('click', () => this.setTempoPercent(this.tempoPercent + 2));

    this.dom.tempoPresets.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setTempoPercent(Number(btn.dataset.tempo));
      });
    });

    this.dom.speedTrainerToggle.addEventListener('change', (e) => {
      this.speedTrainerEnabled = e.target.checked;
      this.loopPassCount = 0;
      this.updateTempoUi();
      this.updateLoopUi();
    });

    this.dom.trainerStepInput.addEventListener('change', (e) => {
      this.trainerStep = Number(e.target.value);
    });
    this.dom.trainerIntervalInput.addEventListener('change', (e) => {
      this.trainerInterval = Number(e.target.value);
    });
    this.dom.trainerTargetInput.addEventListener('change', (e) => {
      this.trainerTarget = Number(e.target.value);
      this.updateTempoUi();
    });

    // Click-Track On/Off Toggle
    this.dom.muteClickBtn.addEventListener('click', () => {
      this.clickMuted = !this.clickMuted;
      this.applyMixerVolumes();
    });

    // Precision BPM & Beat-Grid Sync Controls
    this.dom.autoDetectActiveBtn.addEventListener('click', () => this.autoAnalyzeActiveSong());
    this.dom.tapTempoBtn.addEventListener('click', () => this.registerTapTempo());
    this.dom.bpmDecBtn.addEventListener('click', () => {
      if (this.activeSong) this.setSongBpm(this.activeSong.bpm - 0.5);
    });
    this.dom.bpmIncBtn.addEventListener('click', () => {
      if (this.activeSong) this.setSongBpm(this.activeSong.bpm + 0.5);
    });
    this.dom.liveBpmInput.addEventListener('change', (e) => {
      this.setSongBpm(Number(e.target.value));
    });
    this.dom.bpmHalfBtn.addEventListener('click', () => {
      if (this.activeSong) this.setSongBpm(this.activeSong.bpm / 2);
    });
    this.dom.bpmDoubleBtn.addEventListener('click', () => {
      if (this.activeSong) this.setSongBpm(this.activeSong.bpm * 2);
    });
    this.dom.nudgeLeftBtn.addEventListener('click', () => this.nudgeBeatOffset(-0.01));
    this.dom.nudgeRightBtn.addEventListener('click', () => this.nudgeBeatOffset(0.01));
    this.dom.syncDownbeatHereBtn.addEventListener('click', () => this.syncDownbeatAtCurrentTime());

    // Song Notes Persistence
    this.dom.songNotesArea.addEventListener('input', (e) => {
      if (!this.activeSong) return;
      this.activeSong.notes = e.target.value;
      this.saveSongState(this.activeSong);
      this.dom.notesSavedIndicator.textContent = '✓ Gespeichert';
    });

    this.dom.noteChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        if (!this.activeSong) return;
        const snippet = chip.dataset.snippet || '';
        const area = this.dom.songNotesArea;
        area.value = (area.value ? area.value.trimEnd() + ' · ' : '') + snippet;
        this.activeSong.notes = area.value;
        this.saveSongState(this.activeSong);
      });
    });

    // Upload Custom Audio Modal + Automatic BPM Analysis on File Select
    const closeUpload = () => {
      this.dom.uploadModal.classList.add('hidden');
      this.dom.bpmDetectStatus.classList.add('hidden');
    };
    this.dom.openUploadModalBtn.addEventListener('click', () => {
      this.dom.uploadModal.classList.remove('hidden');
    });
    this.dom.closeModalBtn.addEventListener('click', closeUpload);
    this.dom.cancelModalBtn.addEventListener('click', closeUpload);

    this.dom.bandFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const titleInput = document.getElementById('songTitleInput');
      if (!titleInput.value.trim()) {
        titleInput.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      }
      await this.analyzeUploadedFileInModal(file);
    });

    this.dom.reanalyzeModalBtn.addEventListener('click', async () => {
      const file = this.dom.bandFileInput.files[0];
      if (file) {
        await this.analyzeUploadedFileInModal(file);
      }
    });

    this.dom.addSongForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('songTitleInput').value.trim();
      const subtitle = document.getElementById('songSubtitleInput').value.trim();
      const bpm = Number(this.dom.songBpmInput.value) || 120;
      const beatOffset = Number(this.dom.songOffsetInput.value) || 0;
      const timeSignature = document.getElementById('songTimeSigInput').value;
      const category = document.getElementById('songCategoryInput').value;
      const bandFile = this.dom.bandFileInput.files[0];

      if (!bandFile || !title) return;

      const beatsPerBar = parseInt(timeSignature.split('/')[0], 10) || 4;
      const bandUrl = URL.createObjectURL(bandFile);

      let customPeaks = null;
      let decodedDuration = 30;
      try {
        this.ensureAudioContext();
        const bandArrayBuf = await bandFile.arrayBuffer();
        const decodedBand = await this.audioCtx.decodeAudioData(bandArrayBuf.slice(0));
        decodedDuration = decodedBand.duration || 30;
        const bPeaks = this.computePeaksFromArray(decodedBand.getChannelData(0), 260);
        const dPeaks = bPeaks.map((v) => v * 0.7);
        customPeaks = { band: bPeaks, drums: dPeaks };
      } catch {
        // Fallback to procedural peaks
      }

      const songMeta = {
        id: 'custom-' + Date.now(),
        title,
        subtitle: subtitle || 'Eigener Upload',
        bpm,
        beatOffset,
        timeSignature,
        beatsPerBar,
        duration: decodedDuration,
        tags: [category, 'In Arbeit'],
        rating: 2,
        customPeaks,
        markers: [{ label: 'Start', time: beatOffset, color: '#38bdf8' }],
        notes: ''
      };

      await CustomTrackDB.saveTrack({
        id: songMeta.id,
        songMeta,
        bandBlob: bandFile,
        drumsBlob: null
      });

      const newSong = {
        ...songMeta,
        isCustomUpload: true,
        audio: {
          band: bandUrl,
          drums: null
        }
      };

      this.songs.unshift(newSong);
      closeUpload();
      this.dom.addSongForm.reset();
      await this.selectSong(newSong.id);
    });

    // Global Keyboard & Bluetooth Foot-Pedal Shortcuts
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      if (e.code === 'Space' || e.code === 'PageDown') {
        e.preventDefault();
        this.togglePlayPause();
      } else if (e.code === 'ArrowLeft' || e.code === 'PageUp') {
        e.preventDefault();
        this.restartLoopOrSong();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.seekTo(this.bandAudio.currentTime + this.getOneBarSeconds());
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        this.dom.setABtn.click();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        this.dom.setBBtn.click();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        this.dom.toggleLoopBtn.click();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        this.dom.countInBtn.click();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        this.dom.muteClickBtn.click();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        this.registerTapTempo();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.syncDownbeatAtCurrentTime();
      } else if (e.key === 'Escape' && this.isCountingIn) {
        this.cancelCountIn();
      }
    });
  }

  formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    const secs = Math.floor(rem);
    const tenths = Math.floor((rem - secs) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.drumPlayerApp = new DrumPracticeApp();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
