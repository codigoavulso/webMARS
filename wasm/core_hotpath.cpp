#include <cmath>
#include <cstdint>
#include <limits>

extern "C" {

std::int32_t wm_clamp32(std::int32_t value) {
  return value;
}

std::int32_t wm_sign_extend16(std::uint32_t value) {
  return static_cast<std::int16_t>(value & 0xffffu);
}

std::uint32_t wm_zero_extend16(std::uint32_t value) {
  return value & 0xffffu;
}

std::int32_t wm_float32_to_bits(float value) {
  union {
    float f;
    std::uint32_t u;
  } cast = { value };
  return static_cast<std::int32_t>(cast.u);
}

float wm_bits_to_float32(std::uint32_t bits) {
  union {
    float f;
    std::uint32_t u;
  } cast = {};
  cast.u = bits;
  return cast.f;
}

std::uint32_t wm_float64_to_hi(double value) {
  union {
    double f;
    std::uint64_t u;
  } cast = { value };
  return static_cast<std::uint32_t>((cast.u >> 32u) & 0xffffffffu);
}

std::uint32_t wm_float64_to_lo(double value) {
  union {
    double f;
    std::uint64_t u;
  } cast = { value };
  return static_cast<std::uint32_t>(cast.u & 0xffffffffu);
}

double wm_bits_to_float64(std::uint32_t hi, std::uint32_t lo) {
  union {
    double f;
    std::uint64_t u;
  } cast = {};
  cast.u = (static_cast<std::uint64_t>(hi) << 32u) | static_cast<std::uint64_t>(lo);
  return cast.f;
}

std::uint32_t wm_add_u32(std::uint32_t a, std::uint32_t b) {
  return static_cast<std::uint32_t>(a + b);
}

std::int32_t wm_add32(std::int32_t a, std::int32_t b) {
  return static_cast<std::int32_t>(static_cast<std::uint32_t>(a) + static_cast<std::uint32_t>(b));
}

std::int32_t wm_sub32(std::int32_t a, std::int32_t b) {
  return static_cast<std::int32_t>(static_cast<std::uint32_t>(a) - static_cast<std::uint32_t>(b));
}

std::int32_t wm_add_overflow32(std::int32_t a, std::int32_t b) {
  const auto sum = wm_add32(a, b);
  return ((a >= 0 && b >= 0 && sum < 0) || (a < 0 && b < 0 && sum >= 0)) ? 1 : 0;
}

std::int32_t wm_sub_overflow32(std::int32_t a, std::int32_t b) {
  const auto diff = wm_sub32(a, b);
  return ((a >= 0 && b < 0 && diff < 0) || (a < 0 && b >= 0 && diff >= 0)) ? 1 : 0;
}

std::int32_t wm_mul_signed_lo32(std::int32_t a, std::int32_t b) {
  const auto product = static_cast<std::int64_t>(a) * static_cast<std::int64_t>(b);
  return static_cast<std::int32_t>(static_cast<std::uint64_t>(product) & 0xffffffffu);
}

std::int32_t wm_mul_signed_hi32(std::int32_t a, std::int32_t b) {
  const auto product = static_cast<std::int64_t>(a) * static_cast<std::int64_t>(b);
  return static_cast<std::int32_t>((static_cast<std::uint64_t>(product) >> 32u) & 0xffffffffu);
}

std::int32_t wm_mul_unsigned_lo32(std::uint32_t a, std::uint32_t b) {
  const auto product = static_cast<std::uint64_t>(a) * static_cast<std::uint64_t>(b);
  return static_cast<std::int32_t>(product & 0xffffffffu);
}

std::int32_t wm_mul_unsigned_hi32(std::uint32_t a, std::uint32_t b) {
  const auto product = static_cast<std::uint64_t>(a) * static_cast<std::uint64_t>(b);
  return static_cast<std::int32_t>((product >> 32u) & 0xffffffffu);
}

std::int32_t wm_div_signed_quot32(std::int32_t a, std::int32_t b) {
  if (b == 0) return 0;
  if (a == std::numeric_limits<std::int32_t>::min() && b == -1) {
    return std::numeric_limits<std::int32_t>::min();
  }
  return a / b;
}

std::int32_t wm_div_signed_rem32(std::int32_t a, std::int32_t b) {
  if (b == 0) return 0;
  if (a == std::numeric_limits<std::int32_t>::min() && b == -1) {
    return 0;
  }
  return a % b;
}

std::int32_t wm_div_unsigned_quot32(std::uint32_t a, std::uint32_t b) {
  if (b == 0u) return 0;
  return static_cast<std::int32_t>(a / b);
}

std::int32_t wm_div_unsigned_rem32(std::uint32_t a, std::uint32_t b) {
  if (b == 0u) return 0;
  return static_cast<std::int32_t>(a % b);
}

std::int32_t wm_compose_word(std::uint32_t b0, std::uint32_t b1, std::uint32_t b2, std::uint32_t b3) {
  const auto word =
    ((b3 & 0xffu) << 24)
    | ((b2 & 0xffu) << 16)
    | ((b1 & 0xffu) << 8)
    | (b0 & 0xffu);
  return static_cast<std::int32_t>(word);
}

std::uint32_t wm_get_word_byte(std::uint32_t word, std::uint32_t index) {
  const auto safe_index = index & 0x3u;
  const auto shift = safe_index * 8u;
  return (word >> shift) & 0xffu;
}

std::int32_t wm_set_word_byte(std::uint32_t word, std::uint32_t index, std::uint32_t byte) {
  const auto safe_index = index & 0x3u;
  const auto shift = safe_index * 8u;
  const auto cleared = word & ~(0xffu << shift);
  const auto merged = cleared | ((byte & 0xffu) << shift);
  return static_cast<std::int32_t>(merged);
}

std::int32_t wm_clz32(std::uint32_t value) {
  return value == 0 ? 32 : __builtin_clz(value);
}

std::int32_t wm_clo32(std::uint32_t value) {
  return wm_clz32(~value);
}

std::int32_t wm_saturating_int32(double value) {
  constexpr auto min_value = std::numeric_limits<std::int32_t>::min();
  constexpr auto max_value = std::numeric_limits<std::int32_t>::max();
  if (!std::isfinite(value) || value < static_cast<double>(min_value) || value > static_cast<double>(max_value)) {
    return max_value;
  }
  return static_cast<std::int32_t>(value);
}

double wm_round_nearest_even(double value) {
  if (!std::isfinite(value)) {
    return 0.0;
  }
  const auto floor_value = std::floor(value);
  const auto fraction = value - floor_value;
  if (fraction < 0.5) return floor_value;
  if (fraction > 0.5) return floor_value + 1.0;
  const auto base = static_cast<long long>(floor_value);
  return (base % 2ll == 0ll) ? floor_value : (floor_value + 1.0);
}

double wm_floor_double(double value) {
  return std::isfinite(value) ? std::floor(value) : 0.0;
}

double wm_ceil_double(double value) {
  return std::isfinite(value) ? std::ceil(value) : 0.0;
}

double wm_trunc_double(double value) {
  return std::isfinite(value) ? std::trunc(value) : 0.0;
}

}
