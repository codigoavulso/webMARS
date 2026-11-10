const MAX_EVENTS = 100_000;
export const MAX_TICK = 0x7fffffff;
const MAX_VLQ = 0x0fffffff;

class MidiReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.offset = 0;
  }

  take(size) {
    if (size > this.bytes.length - this.offset) throw new Error("Truncated MIDI file.");
    const result = this.bytes.subarray(this.offset, this.offset + size);
    this.offset += size;
    return result;
  }

  number(size) {
    let value = 0;
    for (const byte of this.take(size)) value = value * 256 + byte;
    return value;
  }

  vlq() {
    let value = 0;
    for (let index = 0; index < 4; index++) {
      const byte = this.number(1);
      value = value * 128 + (byte & 127);
      if (byte < 128) return value;
    }
    throw new Error("Invalid MIDI variable-length number.");
  }

  chunk() {
    const type = String.fromCharCode(...this.take(4));
    return { type, data: new MidiReader(this.take(this.number(4))) };
  }
}

function midiInteger(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label}: ${min}–${max}.`);
  }
  return value;
}

function channelLength(status) {
  return (status & 0xe0) === 0xc0 ? 1 : 2;
}

export function validateEvent(event) {
  midiInteger(event.tick, 0, MAX_TICK, "Tick");
  const { status, meta, data } = event;
  if (status >= 0x80 && status <= 0xef && data.length === channelLength(status)) {
    data.forEach((byte) => midiInteger(byte, 0, 127, "MIDI data byte"));
  } else if (status === 0xff || status === 0xf0 || status === 0xf7) {
    if (status === 0xff) {
      midiInteger(meta, 0, 127, "Meta event type");
      if (meta === 0x2f) throw new Error("End of track is generated automatically.");
      if (meta === 0x51 && (data.length !== 3 || !data.some(Boolean))) throw new Error("Invalid tempo event.");
    }
    data.forEach((byte) => midiInteger(byte, 0, 255, "Event byte"));
  } else {
    throw new Error("Invalid MIDI status or number of data bytes.");
  }
  return event;
}

export function readMidi(bytes) {
  const file = new MidiReader(bytes);
  const header = file.chunk();
  if (header.type !== "MThd") throw new Error("Missing MIDI header.");
  const format = header.data.number(2);
  const count = header.data.number(2);
  const division = header.data.number(2);
  if (format > 1 || !count || (format === 0 && count !== 1)) throw new Error("Use a Standard MIDI File of format 0 or 1.");
  createClock({ division, tracks: [] });
  const tracks = [];
  let total = 0;

  while (tracks.length < count) {
    const { type, data } = file.chunk();
    if (type !== "MTrk") continue;
    const events = [];
    let tick = 0;
    let running = 0;
    let ended = false;
    while (data.offset < data.bytes.length) {
      tick = midiInteger(tick + data.vlq(), 0, MAX_TICK, "Tick");
      let status = data.number(1);
      if (status < 128) {
        status = running;
        data.offset--;
      }
      if (++total > MAX_EVENTS) throw new Error("This MIDI file exceeds 100,000 events.");
      let event;
      if (status >= 0x80 && status <= 0xef) {
        running = status;
        event = { tick, status, data: [...data.take(channelLength(status))] };
      } else if (status === 0xff || status === 0xf0 || status === 0xf7) {
        running = 0;
        const meta = status === 0xff ? data.number(1) : undefined;
        const length = data.vlq();
        if (meta === 0x2f) {
          if (length !== 0 || data.offset !== data.bytes.length) throw new Error("Invalid end of MIDI track.");
          ended = true;
          break;
        }
        event = { tick, status, meta, data: [...data.take(length)] };
      } else {
        throw new Error("Invalid MIDI running status.");
      }
      events.push(validateEvent(event));
    }
    if (!ended) throw new Error("Missing end of MIDI track.");
    tracks.push({ endTick: tick, events });
  }
  return { format, division, tracks };
}

function appendNumber(output, value, bytes) {
  for (let shift = bytes - 1; shift >= 0; shift--) output.push(Math.floor(value / 256 ** shift) & 255);
}

function appendVlq(output, value) {
  midiInteger(value, 0, MAX_VLQ, "MIDI delta");
  const bytes = [value & 127];
  while ((value >>>= 7)) bytes.unshift(128 | (value & 127));
  output.push(...bytes);
}

export function sortedEvents(events) {
  return events.slice().sort((a, b) => a.tick - b.tick);
}

export function writeMidi(song) {
  const header = [77, 84, 104, 100, 0, 0, 0, 6];
  appendNumber(header, song.tracks.length === 1 && song.format === 0 ? 0 : 1, 2);
  appendNumber(header, midiInteger(song.tracks.length, 1, 65535, "Track count"), 2);
  appendNumber(header, song.division, 2);
  const chunks = [Uint8Array.from(header)];

  for (const track of song.tracks) {
    const body = [];
    let tick = 0;
    for (const event of sortedEvents(track.events)) {
      validateEvent(event);
      appendVlq(body, event.tick - tick);
      tick = event.tick;
      body.push(event.status);
      if (event.status === 0xff) body.push(event.meta);
      if (event.status >= 0xf0) appendVlq(body, event.data.length);
      for (const byte of event.data) body.push(byte);
    }
    appendVlq(body, Math.max(tick, track.endTick) - tick);
    body.push(0xff, 0x2f, 0);
    const prefix = [77, 84, 114, 107];
    appendNumber(prefix, body.length, 4);
    chunks.push(Uint8Array.from(prefix), Uint8Array.from(body));
  }

  const file = new Uint8Array(chunks.reduce((size, bytes) => size + bytes.length, 0));
  let offset = 0;
  for (const bytes of chunks) {
    file.set(bytes, offset);
    offset += bytes.length;
  }
  return file;
}

export function trackName(track) {
  const name = track.events.find((event) => event.status === 0xff && event.meta === 3);
  return name ? new TextDecoder().decode(Uint8Array.from(name.data)) : "";
}

export function metaText(tick, meta, text) {
  return { tick, status: 0xff, meta, data: [...new TextEncoder().encode(text)] };
}

export function emptyMidi() {
  return { format: 1, division: 480, tracks: [{ endTick: 0, events: [] }] };
}

export function noteEvents(tick, duration, channel, pitch, velocity, release = 64) {
  midiInteger(channel, 1, 16, "Channel");
  midiInteger(duration, 0, MAX_TICK, "Duration");
  midiInteger(velocity, 1, 127, "Velocity");
  return [
    validateEvent({ tick, status: 0x90 | (channel - 1), data: [pitch, velocity] }),
    validateEvent({ tick: tick + duration, status: 0x80 | (channel - 1), data: [pitch, release] })
  ];
}

export function readPianoMovement(source, title) {
  let tick = 0;
  let ended = false;
  const channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16];
  const occupiedUntil = Array.from({ length: 128 }, () => new Map());
  const events = [
    metaText(0, 3, title),
    metaText(0, 1, "L. van Beethoven, Symphony No. 5, Op. 67. Piano arrangement: Muxi Xie (CC0 1.0), IMSLP #1046120."),
    { tick: 0, status: 0xff, meta: 0x51, data: [0x0f, 0x42, 0x40] }
  ];
  for (const line of source.split(/\r?\n/)) {
    const words = line.split("#", 1)[0].match(/^\s*\.word\s+(.+)/)?.[1];
    if (!words) continue;
    for (const token of words.split(",")) {
      const word = Number(token.trim());
      if (ended || !Number.isSafeInteger(word) || word > 0x7fffffff) throw new Error("Invalid Piano MIPS score.");
      if (word < 0) tick = midiInteger(tick - word, 0, MAX_TICK, "Tick");
      else if (word === 0) ended = true;
      else {
        const pitch = midiInteger(word & 255, 0, 127, "Pitch");
        const duration = word >>> 16;
        // MIDI cannot distinguish overlapping notes of the same pitch on one channel.
        const lane = occupiedUntil[pitch];
        const channel = channels.find((candidate) => (lane.get(candidate) ?? 0) <= tick);
        if (!channel) throw new Error("Too many simultaneous Piano MIPS notes of the same pitch.");
        lane.set(channel, tick + duration);
        events.push(...noteEvents(tick, duration, channel, pitch, (word >>> 8) & 255));
      }
    }
  }
  if (!ended || events.length === 3) throw new Error("Incomplete Piano MIPS score.");
  return { format: 0, division: 1000, tracks: [{ endTick: tick, events: sortedEvents(events) }] };
}

export function sequenceNotes(events) {
  const pending = new Map();
  const notes = [];
  for (const event of sortedEvents(events)) {
    const type = event.status & 0xf0;
    if (type !== 0x80 && type !== 0x90) continue;
    const key = (event.status & 15) * 128 + event.data[0];
    if (type === 0x90 && event.data[1]) {
      const queue = pending.get(key) || { events: [], first: 0 };
      queue.events.push(event);
      pending.set(key, queue);
    } else {
      const queue = pending.get(key);
      if (!queue) continue;
      notes.push({ on: queue.events[queue.first++], off: event });
      if (queue.first === queue.events.length) pending.delete(key);
    }
  }
  return notes.sort((a, b) => a.on.tick - b.on.tick);
}

export function createClock(song) {
  const division = midiInteger(song.division, 1, 65535, "Time division");
  const segments = [{ tick: 0, seconds: 0, rate: 0.5 / division }];
  if (division & 0x8000) {
    const frames = 256 - (division >>> 8);
    const ticks = division & 255;
    if (![24, 25, 29, 30].includes(frames) || !ticks) throw new Error("Invalid SMPTE time division.");
    segments[0].rate = 1 / (ticks * (frames === 29 ? 30000 / 1001 : frames));
  } else {
    const tempos = sortedEvents(song.tracks.flatMap((track) => track.events.filter(
      (event) => event.status === 0xff && event.meta === 0x51
    )));
    for (const event of tempos) {
      const previous = segments[segments.length - 1];
      const rate = (event.data[0] * 65536 + event.data[1] * 256 + event.data[2]) / (division * 1e6);
      const seconds = previous.seconds + (event.tick - previous.tick) * previous.rate;
      if (event.tick === previous.tick) previous.rate = rate;
      else segments.push({ tick: event.tick, seconds, rate });
    }
  }

  function segmentAt(key, value) {
    let low = 0;
    let high = segments.length;
    while (high - low > 1) {
      const mid = (low + high) >>> 1;
      if (segments[mid][key] <= value) low = mid;
      else high = mid;
    }
    return segments[low];
  }

  return {
    secondsAt(tick) {
      const point = segmentAt("tick", tick);
      return point.seconds + (tick - point.tick) * point.rate;
    },
    tickAt(seconds) {
      const point = segmentAt("seconds", seconds);
      return point.tick + (seconds - point.seconds) / point.rate;
    }
  };
}

export function sequenceEnd(song) {
  return song.tracks.reduce((end, track) => track.events.reduce(
    (last, event) => Math.max(last, event.tick), Math.max(end, track.endTick)
  ), 0);
}
