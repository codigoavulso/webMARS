import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// This browser module has no dependencies. Loading it as ESM also works on Node 20.
const moduleBytes = await readFile(new URL("../tools/midi-sequence.js", import.meta.url));
const midi = await import("data:text/javascript;base64," + moduleBytes.toString("base64"));

const movements = [
  ["01_allegro_con_brio", 5976, 476265],
  ["02_andante_con_moto", 4935, 595798],
  ["03_allegro", 4408, 338287],
  ["04_finale", 14457, 681661]
];

test("The Piano MIPS movements preserve every onset, duration, pitch and velocity across MIDI export", async () => {
  for (const [name, count, length] of movements) {
    const source = await readFile(new URL("../examples/mips_piano_" + name + ".asm", import.meta.url), "utf8");
    let cursor = 0;
    const expected = [];
    for (const line of source.split(/\r?\n/)) {
      const data = /^\s*\.word\s+([^#]+)/.exec(line)?.[1];
      if (!data) continue;
      for (const word of data.split(",").map(Number)) {
        if (word < 0) cursor -= word;
        if (word > 0) expected.push([cursor, word >>> 16, word & 255, (word >>> 8) & 255].join(","));
      }
    }

    const song = midi.readMidi(midi.writeMidi(midi.readPianoMovement(source, name)));
    const notes = midi.sequenceNotes(song.tracks[0].events);
    const actual = notes.map(({ on, off }) => [on.tick, off.tick - on.tick, ...on.data].join(","));
    assert.equal(notes.length, count, name);
    assert.equal(midi.sequenceEnd(song), length, name);
    assert.ok(Math.abs(midi.createClock(song).secondsAt(length) - length / 1000) < 1e-9);
    assert.deepEqual(actual.sort(), expected.sort(), name);
    assert.ok(notes.every(({ on }) => (on.status & 15) !== 9), "Piano never uses the GM percussion channel.");
  }
});

test("Standard MIDI round trip preserves multiple tracks, event ordering and raw data", () => {
  const events = [
    { tick: 0, status: 0xff, meta: 0x51, data: [7, 161, 32] },
    { tick: 0, status: 0xff, meta: 0x58, data: [7, 3, 24, 8] },
    { tick: 480, status: 0xff, meta: 0x51, data: [15, 66, 64] }
  ];
  const performance = [
    { tick: 0, status: 0xf0, data: [0x7d, 0x0f, 0xf7] },
    { tick: 0, status: 0xf7, data: [0xf1, 0x07] },
    { tick: 0, status: 0xc4, data: [70] },
    { tick: 0, status: 0xb4, data: [10, 40] },
    ...midi.noteEvents(0, 960, 5, 62, 96, 36),
    { tick: 100, status: 0xa4, data: [62, 43] },
    { tick: 200, status: 0xd4, data: [22] },
    { tick: 250, status: 0xe4, data: [12, 77] }
  ];
  const original = { format: 1, division: 480, tracks: [{ endTick: 480, events }, { endTick: 1200, events: performance }] };
  const decoded = midi.readMidi(midi.writeMidi(original));
  assert.equal(decoded.format, 1);
  for (const [index, track] of decoded.tracks.entries()) {
    assert.equal(track.endTick, original.tracks[index].endTick);
    assert.deepEqual(JSON.parse(JSON.stringify(track.events)), midi.sortedEvents(original.tracks[index].events));
  }
  const clock = midi.createClock(decoded);
  assert.equal(clock.secondsAt(480), 0.5);
  assert.equal(clock.secondsAt(960), 1.5);
  assert.equal(clock.tickAt(0.75), 600);
});

test("Running status, zero velocity note off and SMPTE timing work with format 0", () => {
  const payload = [0, 0x90, 60, 96, 0, 64, 80, 80, 60, 0, 0, 64, 0, 0, 0xff, 0x2f, 0];
  const bytes = Uint8Array.from([
    77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 0xe7, 40,
    77, 84, 114, 107, 0, 0, 0, payload.length, ...payload
  ]);
  const song = midi.readMidi(bytes);
  assert.equal(song.format, 0);
  assert.equal(midi.createClock(song).secondsAt(80), 0.08);
  assert.equal(midi.sequenceNotes(song.tracks[0].events).length, 2);
  assert.throws(() => midi.readMidi(bytes.subarray(0, -1)), /Truncated/);
  assert.throws(() => midi.noteEvents(0, 480, 1, 128, 80), /MIDI data byte/);
  assert.throws(() => midi.validateEvent({ tick: 0, status: 0xff, meta: 0x51, data: [0, 0, 0] }), /Invalid tempo/);
});
