import React, { useEffect, useRef, useState } from "https://esm.sh/react@18";
import { buildScaleNotes } from "fretboard-layout";

const AUDIO_BASE_MIDI = 60;
const MAX_SCALE_PLAYBACK_REPEATS = 20;

export const PLAYBACK_NOTE_VALUES = [
  { label: "1/2", beats: 2 },
  { label: "1/4", beats: 1 },
  { label: "1/4 trip", beats: 2 / 3 },
  { label: "1/8", beats: 1 / 2 },
  { label: "1/8 trip", beats: 1 / 3 },
  { label: "1/16", beats: 1 / 4 },
  { label: "1/16 trip", beats: 1 / 6 },
  { label: "1/32", beats: 1 / 8 },
  { label: "1/32 trip", beats: 1 / 12 },
];

function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function useScalePlayback({ selectedScale, selectedKey }) {
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(70);
  const [noteValueIndex, setNoteValueIndex] = useState(3);
  const [clickEnabled, setClickEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const audioOutputRef = useRef(null);
  const timeoutsRef = useRef([]);
  const oscillatorsRef = useRef([]);
  const runRef = useRef(null);

  function stop() {
    if (runRef.current) {
      runRef.current.cancelled = true;
      runRef.current = null;
    }
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
    const audioContext = audioContextRef.current;
    oscillatorsRef.current.forEach((oscillator) => {
      try {
        const stopTime = audioContext ? audioContext.currentTime + 0.03 : 0;
        oscillator.stop(stopTime);
      } catch {
        // Oscillator may already have stopped.
      }
    });
    oscillatorsRef.current = [];
    setIsPlaying(false);
  }

  function ensureAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }

  function ensureAudioOutput(audioContext) {
    if (!audioOutputRef.current) {
      const filter = audioContext.createBiquadFilter();
      const masterGain = audioContext.createGain();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1800, audioContext.currentTime);
      masterGain.gain.setValueAtTime(1, audioContext.currentTime);
      filter.connect(masterGain);
      masterGain.connect(audioContext.destination);
      audioOutputRef.current = { filter, masterGain };
    }
    return audioOutputRef.current;
  }

  function trackOscillator(oscillator) {
    oscillatorsRef.current.push(oscillator);
    oscillator.onended = () => {
      oscillatorsRef.current = oscillatorsRef.current.filter((item) => item !== oscillator);
    };
  }

  function playTone(audioContext, output, frequency, startTime, duration) {
    const oscillator = audioContext.createOscillator();
    const bodyOscillator = audioContext.createOscillator();
    const bodyGain = audioContext.createGain();
    const noteGain = audioContext.createGain();
    oscillator.type = "sine";
    bodyOscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, startTime);
    bodyOscillator.frequency.setValueAtTime(frequency * 0.5, startTime);
    bodyGain.gain.setValueAtTime(0.38, startTime);
    const peakGain = Math.max(0.001, (Number(volume) / 100) * 0.46);
    const sustainGain = Math.max(0.001, peakGain * 0.82);
    const attackEnd = startTime + Math.min(0.12, duration * 0.28);
    const releaseStart = startTime + Math.max(0.08, duration * 0.72);
    const noteEnd = startTime + duration;
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(peakGain, attackEnd);
    noteGain.gain.setValueAtTime(sustainGain, releaseStart);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(noteGain);
    bodyOscillator.connect(bodyGain);
    bodyGain.connect(noteGain);
    noteGain.connect(output.filter);
    oscillator.start(startTime);
    bodyOscillator.start(startTime);
    const stopTime = noteEnd + 0.08;
    oscillator.stop(stopTime);
    bodyOscillator.stop(stopTime);
    trackOscillator(oscillator);
    trackOscillator(bodyOscillator);
  }

  function playClick(audioContext, output, startTime, accented) {
    const oscillator = audioContext.createOscillator();
    const clickGain = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(accented ? 1200 : 850, startTime);
    const clickLevel = Math.max(0.001, (Number(volume) / 100) * (accented ? 0.22 : 0.14));
    clickGain.gain.setValueAtTime(0.0001, startTime);
    clickGain.gain.exponentialRampToValueAtTime(clickLevel, startTime + 0.004);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.045);
    oscillator.connect(clickGain);
    clickGain.connect(output.masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.055);
    trackOscillator(oscillator);
  }

  function scheduleRun({
    audioContext,
    output,
    run,
    scaleNotes,
    playbackIntervals,
    noteSpacingSeconds,
    noteDuration,
  }) {
    if (run.cancelled || run.count >= MAX_SCALE_PLAYBACK_REPEATS) {
      stop();
      return;
    }

    const runStart = run.count === 0 ? audioContext.currentTime + 0.04 : run.nextBarStart;
    const runLengthSeconds = Math.max(
      run.barSeconds,
      Math.ceil((playbackIntervals.length * noteSpacingSeconds) / run.barSeconds) * run.barSeconds
    );
    run.nextBarStart = runStart + runLengthSeconds;
    const rootMidi = AUDIO_BASE_MIDI + scaleNotes.rootIndex;
    if (run.clickEnabled) {
      const beatCount = Math.ceil(runLengthSeconds / run.beatSeconds);
      for (let beat = 0; beat < beatCount; beat += 1) {
        playClick(audioContext, output, runStart + beat * run.beatSeconds, beat % 4 === 0);
      }
    }
    playbackIntervals.forEach((interval, index) => {
      playTone(
        audioContext,
        output,
        midiToFrequency(rootMidi + interval),
        runStart + index * noteSpacingSeconds,
        noteDuration
      );
    });

    run.count += 1;
    const delayMs = Math.max(0, (run.nextBarStart - audioContext.currentTime - 0.02) * 1000);
    const nextTimeout = window.setTimeout(() => {
      scheduleRun({
        audioContext,
        output,
        run,
        scaleNotes,
        playbackIntervals,
        noteSpacingSeconds,
        noteDuration,
      });
    }, delayMs);
    timeoutsRef.current.push(nextTimeout);
  }

  async function play() {
    if (!selectedScale) {
      return;
    }
    const audioContext = ensureAudioContext();
    if (!audioContext) {
      return;
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    const output = ensureAudioOutput(audioContext);

    stop();
    const scaleNotes = buildScaleNotes(selectedKey, selectedScale);
    const intervals = selectedScale.intervals
      .map((interval) => (typeof interval === "number" ? interval : interval?.semitones))
      .filter((interval) => Number.isFinite(interval));
    if (intervals.length === 0) {
      return;
    }

    const noteValue = PLAYBACK_NOTE_VALUES[noteValueIndex] || PLAYBACK_NOTE_VALUES[3];
    const noteSpacingSeconds = (60 / Number(bpm)) * noteValue.beats;
    const noteDuration = Math.max(0.08, noteSpacingSeconds * 0.9);
    const playbackIntervals = [...intervals, 12];
    const beatSeconds = 60 / Number(bpm);
    const run = {
      cancelled: false,
      count: 0,
      beatSeconds,
      barSeconds: 4 * beatSeconds,
      clickEnabled,
      nextBarStart: audioContext.currentTime + 0.04,
    };
    runRef.current = run;

    setIsPlaying(true);
    scheduleRun({
      audioContext,
      output,
      run,
      scaleNotes,
      playbackIntervals,
      noteSpacingSeconds,
      noteDuration,
    });
  }

  function toggle() {
    if (isPlaying) {
      stop();
      return;
    }
    play();
  }

  useEffect(() => () => stop(), []);

  useEffect(() => {
    if (isPlaying) {
      play();
    }
  }, [bpm, volume, noteValueIndex, clickEnabled]);

  useEffect(() => {
    stop();
  }, [selectedScale?.id, selectedKey]);

  return {
    bpm,
    volume,
    noteValueIndex,
    noteValues: PLAYBACK_NOTE_VALUES,
    noteValueLabel: PLAYBACK_NOTE_VALUES[noteValueIndex]?.label || "1/8",
    clickEnabled,
    isPlaying,
    setBpm,
    setVolume,
    setNoteValueIndex,
    setClickEnabled,
    toggle,
  };
}
