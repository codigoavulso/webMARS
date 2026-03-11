# webMARS WASM Hotpath (Incremental Port)

This folder hosts incremental C++/WebAssembly modules used to offload selected hot routines from `00-core.js`.

Current module:

- `core_hotpath.cpp`
  - `wm_clamp32`
  - `wm_sign_extend16`
  - `wm_zero_extend16`
  - `wm_float32_to_bits`
  - `wm_bits_to_float32`
  - `wm_float64_to_hi`
  - `wm_float64_to_lo`
  - `wm_bits_to_float64`
  - `wm_add_u32`
  - `wm_compose_word`
  - `wm_get_word_byte`
  - `wm_set_word_byte`
  - `wm_clz32`
  - `wm_clo32`
  - `wm_saturating_int32`
  - `wm_round_nearest_even`
  - `wm_floor_double`
  - `wm_ceil_double`
  - `wm_trunc_double`

Build output (generated):

- `core_hotpath.wasm`

Build command (from project root):

```bash
node wasm/build-wasm-core.mjs
```

Notes:

- The simulator still runs fully in JavaScript if the WASM binary is not present.
- `assets/js/app-modules/00-core-wasm-hotpath.js` loads this WASM module opportunistically and falls back automatically on any failure.
