(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;

  const state = {
    ready: false,
    loading: false,
    error: "",
    exports: null
  };

  function getExport(name) {
    if (!state.exports) return null;
    return state.exports[name] || state.exports[`_${name}`] || null;
  }

  function disableHotpath(error) {
    state.ready = false;
    state.exports = null;
    state.error = error instanceof Error ? error.message : String(error || "Unknown WASM hotpath error.");
  }

  function validateExports() {
    const checks = [
      () => getExport("wm_clamp32")?.(0),
      () => getExport("wm_sign_extend16")?.(0),
      () => getExport("wm_zero_extend16")?.(0),
      () => getExport("wm_float32_to_bits")?.(0),
      () => getExport("wm_bits_to_float32")?.(0),
      () => getExport("wm_float64_to_hi")?.(0),
      () => getExport("wm_float64_to_lo")?.(0),
      () => getExport("wm_bits_to_float64")?.(0, 0),
      () => getExport("wm_compose_word")?.(0, 0, 0, 0),
      () => getExport("wm_get_word_byte")?.(0, 0),
      () => getExport("wm_set_word_byte")?.(0, 0, 0),
      () => getExport("wm_clz32")?.(0),
      () => getExport("wm_clo32")?.(0),
      () => getExport("wm_saturating_int32")?.(0),
      () => getExport("wm_round_nearest_even")?.(0),
      () => getExport("wm_floor_double")?.(0),
      () => getExport("wm_ceil_double")?.(0),
      () => getExport("wm_trunc_double")?.(0),
      () => getExport("wm_add32")?.(0, 0),
      () => getExport("wm_sub32")?.(0, 0),
      () => getExport("wm_add_overflow32")?.(0, 0),
      () => getExport("wm_sub_overflow32")?.(0, 0),
      () => getExport("wm_mul_signed_lo32")?.(0, 0),
      () => getExport("wm_mul_signed_hi32")?.(0, 0),
      () => getExport("wm_mul_unsigned_lo32")?.(0, 0),
      () => getExport("wm_mul_unsigned_hi32")?.(0, 0),
      () => getExport("wm_div_signed_quot32")?.(1, 1),
      () => getExport("wm_div_signed_rem32")?.(1, 1),
      () => getExport("wm_div_unsigned_quot32")?.(1, 1),
      () => getExport("wm_div_unsigned_rem32")?.(1, 1)
    ];

    try {
      checks.forEach((check) => void check());
      return true;
    } catch (error) {
      disableHotpath(error);
      return false;
    }
  }

  async function loadHotpathWasm() {
    if (state.loading || state.ready) return;
    state.loading = true;
    try {
      const url = "./wasm/core_hotpath.wasm";
      let response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = String(response.headers?.get("content-type") || "");
      const canStream = typeof WebAssembly.instantiateStreaming === "function"
        && /application\/wasm/i.test(contentType);

      let instance = null;
      if (canStream) {
        try {
          const result = await WebAssembly.instantiateStreaming(response, {});
          instance = result.instance || null;
        } catch {
          response = await fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        }
      }

      if (!instance) {
        const bytes = await response.arrayBuffer();
        const result = await WebAssembly.instantiate(bytes, {});
        instance = result.instance || null;
      }

      if (!instance || !instance.exports) throw new Error("WASM module did not expose exports.");
      state.exports = instance.exports;
      if (!validateExports()) return;
      state.ready = true;
      state.error = "";
    } catch (error) {
      disableHotpath(error);
    } finally {
      state.loading = false;
    }
  }

  const api = {
    get ready() {
      return state.ready;
    },
    isReady() {
      return state.ready;
    },
    getStatus() {
      return {
        ready: state.ready,
        loading: state.loading,
        error: state.error
      };
    },
    async ensureReady() {
      await loadHotpathWasm();
      return state.ready;
    },
    clamp32(value) {
      const fn = getExport("wm_clamp32");
      if (!fn) return value | 0;
      return fn(Number(value) || 0) | 0;
    },
    signExtend16(value) {
      const fn = getExport("wm_sign_extend16");
      if (!fn) return ((Number(value) || 0) << 16) >> 16;
      return fn((Number(value) || 0) >>> 0) | 0;
    },
    zeroExtend16(value) {
      const fn = getExport("wm_zero_extend16");
      if (!fn) return (Number(value) || 0) & 0xffff;
      return fn((Number(value) || 0) >>> 0) >>> 0;
    },
    float32ToBits(value) {
      const fn = getExport("wm_float32_to_bits");
      if (!fn) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, Number(value) || 0, false);
        return view.getInt32(0, false);
      }
      return fn(Number(value) || 0) | 0;
    },
    bitsToFloat32(bits) {
      const fn = getExport("wm_bits_to_float32");
      if (!fn) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setInt32(0, (Number(bits) || 0) | 0, false);
        return view.getFloat32(0, false);
      }
      return Number(fn((Number(bits) || 0) >>> 0));
    },
    float64HighWord(value) {
      const fn = getExport("wm_float64_to_hi");
      if (!fn) {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, Number(value) || 0, false);
        return view.getInt32(0, false);
      }
      return fn(Number(value) || 0) | 0;
    },
    float64LowWord(value) {
      const fn = getExport("wm_float64_to_lo");
      if (!fn) {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, Number(value) || 0, false);
        return view.getInt32(4, false);
      }
      return fn(Number(value) || 0) | 0;
    },
    wordsToFloat64(highWord, lowWord) {
      const fn = getExport("wm_bits_to_float64");
      if (!fn) {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setInt32(0, (Number(highWord) || 0) | 0, false);
        view.setInt32(4, (Number(lowWord) || 0) | 0, false);
        return view.getFloat64(0, false);
      }
      return Number(fn(
        (Number(highWord) || 0) >>> 0,
        (Number(lowWord) || 0) >>> 0
      ));
    },
    composeWord(b0, b1, b2, b3) {
      const fn = getExport("wm_compose_word");
      if (!fn) {
        return (((Number(b0) & 0xff) << 24) | ((Number(b1) & 0xff) << 16) | ((Number(b2) & 0xff) << 8) | (Number(b3) & 0xff)) | 0;
      }
      return fn(
        (Number(b0) || 0) >>> 0,
        (Number(b1) || 0) >>> 0,
        (Number(b2) || 0) >>> 0,
        (Number(b3) || 0) >>> 0
      ) | 0;
    },
    getWordByte(word, index) {
      const fn = getExport("wm_get_word_byte");
      if (!fn) return ((Number(word) >>> ((3 - (Number(index) & 0x3)) * 8)) & 0xff) >>> 0;
      return fn((Number(word) || 0) >>> 0, (Number(index) || 0) >>> 0) >>> 0;
    },
    setWordByte(word, index, byte) {
      const fn = getExport("wm_set_word_byte");
      if (!fn) {
        const shift = (3 - (Number(index) & 0x3)) * 8;
        return (((Number(word) || 0) & ~(0xff << shift)) | (((Number(byte) || 0) & 0xff) << shift)) | 0;
      }
      return fn(
        (Number(word) || 0) >>> 0,
        (Number(index) || 0) >>> 0,
        (Number(byte) || 0) >>> 0
      ) | 0;
    },
    clz32(value) {
      const fn = getExport("wm_clz32");
      if (!fn) return Math.clz32((Number(value) || 0) >>> 0);
      return fn((Number(value) || 0) >>> 0) | 0;
    },
    clo32(value) {
      const fn = getExport("wm_clo32");
      if (!fn) return Math.clz32(~((Number(value) || 0) >>> 0));
      return fn((Number(value) || 0) >>> 0) | 0;
    },
    saturatingInt32(value) {
      const fn = getExport("wm_saturating_int32");
      if (!fn) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < -2147483648 || numeric > 2147483647) return 2147483647;
        return numeric | 0;
      }
      return fn(Number(value) || 0) | 0;
    },
    roundNearestEven(value) {
      const fn = getExport("wm_round_nearest_even");
      if (!fn) {
        const numeric = Number(value) || 0;
        const floor = Math.floor(numeric);
        const frac = numeric - floor;
        if (frac < 0.5) return floor;
        if (frac > 0.5) return floor + 1;
        return floor % 2 === 0 ? floor : floor + 1;
      }
      return Number(fn(Number(value) || 0));
    },
    floorNumber(value) {
      const fn = getExport("wm_floor_double");
      if (!fn) return Math.floor(Number(value) || 0);
      return Number(fn(Number(value) || 0));
    },
    ceilNumber(value) {
      const fn = getExport("wm_ceil_double");
      if (!fn) return Math.ceil(Number(value) || 0);
      return Number(fn(Number(value) || 0));
    },
    truncNumber(value) {
      const fn = getExport("wm_trunc_double");
      if (!fn) return Math.trunc(Number(value) || 0);
      return Number(fn(Number(value) || 0));
    },
    add32(a, b) {
      const fn = getExport("wm_add32");
      if (!fn) return ((Number(a) || 0) + (Number(b) || 0)) | 0;
      return fn((Number(a) || 0) | 0, (Number(b) || 0) | 0) | 0;
    },
    sub32(a, b) {
      const fn = getExport("wm_sub32");
      if (!fn) return ((Number(a) || 0) - (Number(b) || 0)) | 0;
      return fn((Number(a) || 0) | 0, (Number(b) || 0) | 0) | 0;
    },
    addOverflow32(a, b) {
      const fn = getExport("wm_add_overflow32");
      if (!fn) {
        const lhs = (Number(a) || 0) | 0;
        const rhs = (Number(b) || 0) | 0;
        const sum = (lhs + rhs) | 0;
        return (lhs >= 0 && rhs >= 0 && sum < 0) || (lhs < 0 && rhs < 0 && sum >= 0) ? 1 : 0;
      }
      return fn((Number(a) || 0) | 0, (Number(b) || 0) | 0) | 0;
    },
    subOverflow32(a, b) {
      const fn = getExport("wm_sub_overflow32");
      if (!fn) {
        const lhs = (Number(a) || 0) | 0;
        const rhs = (Number(b) || 0) | 0;
        const diff = (lhs - rhs) | 0;
        return (lhs >= 0 && rhs < 0 && diff < 0) || (lhs < 0 && rhs >= 0 && diff >= 0) ? 1 : 0;
      }
      return fn((Number(a) || 0) | 0, (Number(b) || 0) | 0) | 0;
    },
    mulSignedLo32(a, b) {
      const fn = getExport("wm_mul_signed_lo32");
      if (!fn) return Math.imul((Number(a) || 0) | 0, (Number(b) || 0) | 0) | 0;
      return fn((Number(a) || 0) | 0, (Number(b) || 0) | 0) | 0;
    },
    mulSignedHi32(a, b) {
      const fn = getExport("wm_mul_signed_hi32");
      if (!fn) {
        const product = BigInt((Number(a) || 0) | 0) * BigInt((Number(b) || 0) | 0);
        return Number(BigInt.asIntN(32, BigInt.asIntN(64, product) >> 32n)) | 0;
      }
      return fn((Number(a) || 0) | 0, (Number(b) || 0) | 0) | 0;
    },
    mulUnsignedLo32(a, b) {
      const fn = getExport("wm_mul_unsigned_lo32");
      if (!fn) {
        const product = BigInt((Number(a) || 0) >>> 0) * BigInt((Number(b) || 0) >>> 0);
        return Number(BigInt.asUintN(32, product)) | 0;
      }
      return fn((Number(a) || 0) >>> 0, (Number(b) || 0) >>> 0) | 0;
    },
    mulUnsignedHi32(a, b) {
      const fn = getExport("wm_mul_unsigned_hi32");
      if (!fn) {
        const product = BigInt((Number(a) || 0) >>> 0) * BigInt((Number(b) || 0) >>> 0);
        return Number(BigInt.asUintN(32, BigInt.asUintN(64, product) >> 32n)) | 0;
      }
      return fn((Number(a) || 0) >>> 0, (Number(b) || 0) >>> 0) | 0;
    },
    divSignedQuot32(a, b) {
      const fn = getExport("wm_div_signed_quot32");
      if (!fn) return ((Number(a) || 0) / ((Number(b) || 0) | 0)) | 0;
      return fn((Number(a) || 0) | 0, (Number(b) || 0) | 0) | 0;
    },
    divSignedRem32(a, b) {
      const fn = getExport("wm_div_signed_rem32");
      if (!fn) return ((Number(a) || 0) % ((Number(b) || 0) | 0)) | 0;
      return fn((Number(a) || 0) | 0, (Number(b) || 0) | 0) | 0;
    },
    divUnsignedQuot32(a, b) {
      const fn = getExport("wm_div_unsigned_quot32");
      if (!fn) return (Math.floor(((Number(a) || 0) >>> 0) / (((Number(b) || 0) >>> 0))) >>> 0) | 0;
      return fn((Number(a) || 0) >>> 0, (Number(b) || 0) >>> 0) | 0;
    },
    divUnsignedRem32(a, b) {
      const fn = getExport("wm_div_unsigned_rem32");
      if (!fn) return ((((Number(a) || 0) >>> 0) % (((Number(b) || 0) >>> 0)) >>> 0)) | 0;
      return fn((Number(a) || 0) >>> 0, (Number(b) || 0) >>> 0) | 0;
    }
  };

  globalScope.WebMarsWasmHotpath = api;
  void loadHotpathWasm();
})();
