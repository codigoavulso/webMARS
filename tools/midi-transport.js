const waveforms = ["triangle", "sine", "sine", "sawtooth", "triangle", "triangle", "triangle", "triangle",
  "sawtooth", "sawtooth", "square", "triangle", "sine", "triangle", "triangle", "triangle"];
const maxVoices = 128;

export function createTransport({ createClock, sequenceEnd, sortedEvents }, onPosition) {
  let audio;
  let run;
  let startRequest = 0;
  let position = 0;

  function makeVoice(session, channel, note, time) {
    if (session.voices.size >= maxVoices) {
      const oldest = session.voices.values().next().value;
      release(session, oldest, time, true);
    }
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = waveforms[channel.program >> 3];
    if (note.channel === 9) oscillator.type = "triangle";
    oscillator.frequency.value = 440 * 2 ** ((note.pitch - 69) / 12);
    channel.pitchSource.connect(oscillator.detune);
    const level = 0.17 * (note.velocity / 127) ** 1.6;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + 0.008);
    if (note.channel === 9 || channel.program < 24) {
      envelope.gain.setTargetAtTime(0.0001, time + 0.008, note.channel === 9 ? 0.035 : 0.75);
    }
    oscillator.connect(envelope).connect(channel.pan);
    oscillator.onended = () => {
      channel.pitchSource.disconnect(oscillator.detune);
      oscillator.disconnect();
      envelope.disconnect();
      session.voices.delete(note);
    };
    oscillator.start(time);
    note.voice = { oscillator, envelope, attackEnd: time + 0.008 };
    session.voices.add(note);
  }

  function release(session, note, time, fast = false) {
    if (!note.voice) return;
    const { envelope, oscillator, attackEnd } = note.voice;
    if (time < attackEnd) envelope.gain.cancelScheduledValues(time);
    envelope.gain.setTargetAtTime(0.0001, time, fast ? 0.006 : 0.035);
    oscillator.stop(time + (fast ? 0.025 : 0.15));
    note.voice = null;
    session.voices.delete(note);
  }

  function silence(session, index, time, mode) {
    for (const note of session.notes) {
      if (note.channel !== index || (mode === "pedal" && note.held)) continue;
      if (mode === "keys" && session.channels[index].sustain) note.held = false;
      else {
        release(session, note, time, mode === "sound");
        session.notes.delete(note);
      }
    }
  }

  function pitchBend(channel, time) {
    channel.pitchSource.offset.setValueAtTime((channel.bend - 8192) / 8192 * channel.bendRange * 100, time);
  }

  function apply(session, event, time, audible) {
    const index = event.status & 15;
    const channel = session.channels[index];
    const type = event.status & 0xf0;
    const [a, b] = event.data;
    if (type === 0x90 && b) {
      const note = { channel: index, pitch: a, velocity: b, held: true };
      session.notes.add(note);
      if (audible) makeVoice(session, channel, note, time);
    } else if (type === 0x80 || type === 0x90) {
      for (const note of session.notes) {
        if (note.channel !== index || note.pitch !== a || !note.held) continue;
        note.held = false;
        if (!channel.sustain) {
          release(session, note, time);
          session.notes.delete(note);
        }
        break;
      }
    } else if (type === 0xc0) {
      channel.program = a;
    } else if (type === 0xe0) {
      channel.bend = a + b * 128;
      pitchBend(channel, time);
    } else if (type === 0xb0) {
      if (a === 7 || a === 11) {
        if (a === 7) channel.volume = b;
        else channel.expression = b;
        channel.gain.gain.setValueAtTime(channel.volume * channel.expression / 16129, time);
      } else if (a === 10) {
        channel.pan.pan.setValueAtTime((b - 64) / (b >= 64 ? 63 : 64), time);
      } else if (a === 64) {
        channel.sustain = b >= 64;
        if (!channel.sustain) silence(session, index, time, "pedal");
      } else if (a === 100 || a === 101) {
        if (a === 100) channel.rpnLsb = b;
        else channel.rpnMsb = b;
      } else if ((a === 6 || a === 38) && channel.rpnMsb === 0 && channel.rpnLsb === 0) {
        if (a === 6) channel.bendRange = b + channel.bendRange % 1;
        else channel.bendRange = Math.floor(channel.bendRange) + Math.min(b, 99) / 100;
        pitchBend(channel, time);
      } else if (a === 120 || a === 123) {
        silence(session, index, time, a === 120 ? "sound" : "keys");
      } else if (a === 121) {
        channel.sustain = false;
        channel.bend = 8192;
        channel.expression = 127;
        channel.rpnMsb = channel.rpnLsb = 127;
        channel.gain.gain.setValueAtTime(channel.volume / 127, time);
        pitchBend(channel, time);
        silence(session, index, time, "pedal");
      }
    }
  }

  function begin(config, tick, time) {
    const master = audio.createGain();
    master.gain.value = 0.45;
    master.connect(audio.destination);
    const session = {
      config, master, time, seconds: config.clock.secondsAt(tick), cursor: 0,
      notes: new Set(), voices: new Set(),
      channels: Array.from({ length: 16 }, () => {
        const pan = audio.createStereoPanner();
        const gain = audio.createGain();
        const pitch = audio.createConstantSource();
        pitch.offset.value = 0;
        pitch.start(time);
        gain.gain.value = 100 / 127;
        pan.connect(gain).connect(master);
        return { pan, gain, pitchSource: pitch, volume: 100, expression: 127,
          program: 0, sustain: false, bend: 8192, bendRange: 2, rpnMsb: 127, rpnLsb: 127 };
      })
    };
    while (config.events[session.cursor]?.tick < tick) {
      apply(session, config.events[session.cursor++], time, false);
    }
    for (const note of session.notes) makeVoice(session, session.channels[note.channel], note, time);
    session.boundary = time + config.clock.secondsAt(config.loop?.end ?? config.end) - session.seconds;
    if (config.loop) master.gain.setValueAtTime(0, session.boundary);
    return session;
  }

  function closeRun(session, natural = false) {
    clearInterval(session.timer);
    const now = audio.currentTime;
    const time = natural ? Math.max(now, session.boundary) : now;
    for (const note of session.voices) release(session, note, time, !natural);
    for (const channel of session.channels) channel.pitchSource.stop(time + 0.17);
    if (!natural) {
      session.master.gain.cancelScheduledValues(now);
      session.master.gain.setTargetAtTime(0, now, 0.007);
    }
    setTimeout(() => session.master.disconnect(), 220);
  }

  function advance() {
    if (!run) return;
    const { config } = run;
    const now = audio.currentTime;
    const until = Math.min(now + 0.1, run.boundary);
    while (run.cursor < config.events.length) {
      const event = config.events[run.cursor];
      if (config.loop && event.tick >= config.loop.end) break;
      const time = run.time + config.clock.secondsAt(event.tick) - run.seconds;
      if (time > until) break;
      run.cursor++;
      apply(run, event, Math.max(now, time), true);
    }
    if (now >= run.boundary) {
      closeRun(run, true);
      if (config.loop) {
        run = begin(config, config.loop.start, now);
        run.timer = setInterval(advance, 20);
        advance();
        return;
      }
      run = null;
      position = config.end;
    } else {
      position = Math.round(config.clock.tickAt(run.seconds + Math.max(0, now - run.time)));
    }
    onPosition(position, !!run);
  }

  return {
    async play(song, tick, loop, muted, solo) {
      this.pause();
      const request = ++startRequest;
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) throw new Error("Web Audio is unavailable.");
      audio ||= new Audio();
      await audio.resume();
      if (request !== startRequest) return;
      const clock = createClock(song);
      const end = sequenceEnd(song);
      const events = sortedEvents(song.tracks.flatMap((track, index) =>
        (solo.size ? !solo.has(index) : muted.has(index)) ? [] :
          track.events.filter((event) => event.status < 0xf0)
      ));
      const start = loop && (tick < loop.start || tick >= loop.end) ? loop.start : tick >= end ? 0 : tick;
      if (end === 0) return;
      run = begin({ clock, events, end, loop }, start, audio.currentTime + 0.025);
      run.timer = setInterval(advance, 20);
      advance();
    },
    pause() {
      startRequest++;
      if (run) {
        closeRun(run);
        run = null;
        onPosition(position, false);
      }
      return position;
    }
  };
}
