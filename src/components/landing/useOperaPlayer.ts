"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProgramCode } from "@/data/programs";

// === Ported from the original player.js (Web Audio synthesized motifs).
//     Each motif is short enough to identify the opera in seconds; the
//     engine layers a sine pad + triangle lead + soft sine octave under.

type Note = [string, number]; // [pitch, beats]
type Motif = { tempo: number; lead: Note[]; bass: Note[] };

const NOTE_OFFSETS: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

function noteToFreq(n: string): number {
  const m = n.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!m) return 0;
  const semis = NOTE_OFFSETS[m[1]] + (parseInt(m[2], 10) - 4) * 12 - 9;
  return 440 * Math.pow(2, semis / 12);
}

const MOTIFS: Record<ProgramCode, Motif> = {
  figaro: {
    tempo: 132,
    lead: [
      ["D5", 0.5], ["F#5", 0.5], ["A5", 0.5], ["D6", 0.5],
      ["A5", 0.5], ["F#5", 0.5], ["D5", 0.5], ["rest", 0.5],
      ["E5", 0.5], ["G5", 0.5], ["B5", 0.5], ["E6", 0.5],
      ["B5", 0.5], ["G5", 0.5], ["E5", 0.5], ["rest", 0.5],
      ["D5", 1], ["F#5", 1], ["A5", 1], ["rest", 1],
    ],
    bass: [
      ["D3", 2], ["A3", 2], ["D3", 2], ["A3", 2],
      ["D3", 2], ["A3", 2], ["D3", 2], ["A3", 2],
    ],
  },
  boheme: {
    tempo: 64,
    lead: [
      ["E5", 1.5], ["E5", 0.5], ["G5", 1], ["F5", 1],
      ["D5", 2], ["C5", 1], ["D5", 1],
      ["E5", 1.5], ["F5", 0.5], ["G5", 1], ["A5", 1],
      ["G5", 3], ["rest", 1],
      ["E5", 1], ["F5", 1], ["G5", 1], ["F5", 1],
      ["E5", 2], ["D5", 2],
    ],
    bass: [
      ["A3", 2], ["E3", 2],
      ["F3", 2], ["C3", 2],
      ["D3", 2], ["A3", 2],
      ["E3", 4],
      ["A3", 2], ["E3", 2],
      ["A3", 2], ["rest", 2],
    ],
  },
  rigoletto: {
    tempo: 138,
    lead: [
      ["B4", 0.5], ["rest", 0.25], ["B4", 0.25], ["D5", 0.5], ["rest", 0.25], ["D5", 0.25],
      ["F#5", 1], ["E5", 0.5], ["D5", 0.5],
      ["C#5", 1], ["B4", 1], ["rest", 1],
      ["B4", 0.5], ["rest", 0.25], ["B4", 0.25], ["D5", 0.5], ["rest", 0.25], ["D5", 0.25],
      ["F#5", 1], ["E5", 0.5], ["D5", 0.5],
      ["C#5", 1], ["B4", 1], ["rest", 1],
      ["F#5", 1], ["G5", 1], ["F#5", 1],
      ["E5", 1], ["F#5", 1], ["B4", 1],
    ],
    bass: [
      ["B2", 3], ["F#3", 3],
      ["B2", 3], ["F#3", 3],
      ["B2", 3], ["F#3", 3],
      ["B2", 3], ["F#3", 3],
    ],
  },
  carmen: {
    tempo: 78,
    lead: [
      ["D5", 0.75], ["C#5", 0.25], ["C5", 0.75], ["B4", 0.25],
      ["Bb4", 0.75], ["A4", 0.25], ["A4", 1],
      ["rest", 0.5], ["A4", 0.5], ["Bb4", 0.5], ["A4", 0.5],
      ["G4", 1], ["A4", 1],
      ["D5", 0.75], ["C#5", 0.25], ["C5", 0.75], ["B4", 0.25],
      ["Bb4", 0.75], ["A4", 0.25], ["A4", 2],
    ],
    bass: [
      ["D3", 1], ["A3", 1], ["D3", 1], ["A3", 1],
      ["D3", 1], ["A3", 1], ["D3", 1], ["A3", 1],
      ["D3", 1], ["A3", 1], ["D3", 1], ["A3", 1],
      ["D3", 1], ["A3", 1], ["D3", 2],
    ],
  },
};

type VoiceOpts = {
  type: OscillatorType;
  gain: number;
  cutoff: number;
  attack: number;
  release: number;
  detune?: number;
};

function playNote(
  ctx: AudioContext,
  master: GainNode,
  freq: number,
  start: number,
  dur: number,
  opts: VoiceOpts,
) {
  if (freq <= 0) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = opts.cutoff;
  lp.Q.value = 0.4;
  o.type = opts.type;
  o.frequency.value = freq;
  if (opts.detune) o.detune.value = opts.detune;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(opts.gain, start + opts.attack);
  g.gain.setValueAtTime(opts.gain, start + Math.max(0.02, dur - opts.release));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(lp); lp.connect(master);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function scheduleVoice(
  ctx: AudioContext,
  master: GainNode,
  motif: Motif,
  voice: "lead" | "bass",
  startAt: number,
  opts: VoiceOpts,
): number {
  const beat = 60 / motif.tempo;
  let t = startAt;
  for (const [note, beats] of motif[voice]) {
    const dur = beats * beat;
    if (note !== "rest") playNote(ctx, master, noteToFreq(note), t, dur * 0.95, opts);
    t += dur;
  }
  return t - startAt;
}

export function useOperaPlayer() {
  const [playingKey, setPlayingKey] = useState<ProgramCode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopAll = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const ctx = ctxRef.current, master = masterRef.current;
    if (ctx && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.25);
    }
    setPlayingKey(null);
  }, []);

  const play = useCallback((key: ProgramCode) => {
    setPlayingKey((cur) => {
      if (cur === key) {
        stopAll();
        return null;
      }
      // Lazy init the AudioContext on first user gesture.
      const Ctor: typeof AudioContext | undefined =
        typeof window !== "undefined"
          ? window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext
          : undefined;
      if (!Ctor) return cur;
      if (!ctxRef.current) {
        ctxRef.current = new Ctor();
        masterRef.current = ctxRef.current.createGain();
        masterRef.current.gain.value = 0.5;
        masterRef.current.connect(ctxRef.current.destination);
      }
      const ctx = ctxRef.current;
      const master = masterRef.current!;
      if (ctx.state === "suspended") void ctx.resume();

      const now = ctx.currentTime + 0.05;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(0.5, now + 0.4);

      const motif = MOTIFS[key];
      scheduleVoice(ctx, master, motif, "bass", now, {
        type: "sine", gain: 0.12, cutoff: 600, attack: 0.18, release: 0.5,
      });
      const len = scheduleVoice(ctx, master, motif, "lead", now, {
        type: "triangle", gain: 0.22, cutoff: 2600, attack: 0.06, release: 0.18, detune: 4,
      });
      scheduleVoice(ctx, master, motif, "lead", now, {
        type: "sine", gain: 0.08, cutoff: 1200, attack: 0.08, release: 0.22, detune: -6,
      });

      timerRef.current = window.setTimeout(() => stopAll(), (len + 0.6) * 1000);
      return key;
    });
  }, [stopAll]);

  useEffect(() => {
    const onVis = () => { if (document.hidden) stopAll(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stopAll]);

  return { play, playingKey };
}
