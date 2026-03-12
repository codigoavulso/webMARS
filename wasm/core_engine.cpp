#include <algorithm>
#include <array>
#include <cctype>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <deque>
#include <functional>
#include <limits>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#include <emscripten/bind.h>
#include <emscripten/val.h>

namespace {

using emscripten::val;

constexpr std::int32_t COP0_DEFAULT_STATUS = 0x0000ff11;
constexpr std::uint32_t EXCEPTION_HANDLER_ADDRESS = 0x80000180u;
constexpr std::uint32_t BACKSTEP_HISTORY_BUDGET_CAP_BYTES = 64u * 1024u * 1024u;
constexpr std::uint32_t BACKSTEP_HISTORY_BUDGET_MIN_BYTES = 512u * 1024u;
constexpr std::uint32_t BACKSTEP_HISTORY_BUDGET_DIVISOR = 8u;
constexpr std::uint32_t BACKSTEP_MEMORY_CHANGE_ENTRY_ESTIMATE_BYTES = 16u;
constexpr std::uint32_t HISTORY_BASE_ESTIMATE_BYTES = 256u + (34u + 32u + 32u) * 4u + 8u;

enum ExceptionCode : std::int32_t {
  ADDRESS_LOAD = 4,
  ADDRESS_STORE = 5,
  SYSCALL = 8,
  BREAKPOINT = 9,
  RESERVED = 10,
  OVERFLOW = 12,
  TRAP = 13
};

enum Cop0Register : std::size_t {
  COP0_VADDR = 8,
  COP0_STATUS = 12,
  COP0_CAUSE = 13,
  COP0_EPC = 14
};

enum class Opcode {
  Nop,
  Delegate,
  Eret,
  Break,
  Teq, Tne, Tge, Tgeu, Tlt, Tltu,
  Teqi, Tnei, Tgei, Tgeiu, Tlti, Tltiu,
  Add, Addu, Sub, Subu, And, Or, Xor, Nor, Slt, Sltu, Mul, Movn, Movz,
  Clz, Clo,
  Addi, Addiu, Andi, Ori, Xori, Slti, Sltiu, Lui,
  Sll, Srl, Sra, Sllv, Srlv, Srav,
  Mult, Multu, Div, Divu, Madd, Maddu, Msub, Msubu,
  Mfhi, Mflo, Mthi, Mtlo,
  Mfc0, Mtc0,
  Mfc1, Mtc1,
  Lw, Sw, Lb, Lbu, Sb, Lh, Lhu, Sh, Ll, Sc, Lwl, Lwr, Swl, Swr, Lwc1, Swc1,
  Beq, Bne, Bgtz, Blez, Bltz, Bgez, Bgezal, Bltzal,
  Bc1f, Bc1t,
  J, Jal, Jr, Jalr,
  Movf, Movt
};

struct MemoryMap {
  std::uint32_t textBase = 0x00400000u;
  std::uint32_t externBase = 0x10000000u;
  std::uint32_t dataBase = 0x10010000u;
  std::uint32_t dataSegmentBase = 0x10010000u;
  std::uint32_t heapBase = 0x10040000u;
  std::uint32_t stackBase = 0x7fffeffcu;
  std::uint32_t stackPointer = 0x7fffeffcu;
  std::uint32_t globalPointer = 0x10008000u;
  std::uint32_t kernelBase = 0x80000000u;
  std::uint32_t kernelTextBase = 0x80000000u;
  std::uint32_t kernelDataBase = 0x90000000u;
  std::uint32_t exceptionHandlerAddress = EXCEPTION_HANDLER_ADDRESS;
};

struct Settings {
  bool startAtMain = false;
  bool extendedAssembler = true;
  bool delayedBranching = false;
  bool strictMarsCompatibility = false;
  bool selfModifyingCode = false;
  bool warningsAreErrors = false;
  std::int32_t maxBacksteps = 100;
  std::int32_t maxErrors = 200;
  std::int32_t maxMemoryBytes = std::numeric_limits<std::int32_t>::max();
  std::int32_t maxBackstepHistoryBytes = 0;
};

struct ProgramRow {
  Opcode op = Opcode::Nop;
  std::string opcodeName;
  std::string basic;
  std::string delegateReason;
  std::uint32_t address = 0;
  std::int32_t line = 0;
  std::int32_t rd = -1;
  std::int32_t rs = -1;
  std::int32_t rt = -1;
  std::int32_t fs = -1;
  std::int32_t ft = -1;
  std::int32_t base = -1;
  std::int32_t immediate = 0;
  std::uint32_t target = 0;
  std::uint32_t absolute = 0;
  std::int32_t cc = 0;
  bool delegate = false;
};

struct WordChange {
  bool existed = false;
  std::int32_t value = 0;
};

struct HistoryEntry {
  std::uint32_t pc = 0;
  std::int32_t steps = 0;
  bool halted = false;
  std::array<std::int32_t, 34> registers {};
  std::array<std::int32_t, 32> cop0 {};
  std::array<std::int32_t, 32> cop1 {};
  std::array<std::uint8_t, 8> fpuFlags {};
  std::uint32_t heapPointer = 0;
  std::int32_t delayedBranchTarget = -1;
  std::int32_t lastMemoryWriteAddress = -1;
  std::unordered_map<std::uint32_t, WordChange> memoryChanges;
  std::uint32_t estimatedBytes = 0;
};

struct StepResult {
  bool ok = true;
  bool done = false;
  bool exception = false;
  bool halt = false;
  bool stoppedOnBreakpoint = false;
  bool waitForInput = false;
  bool runIo = false;
  bool noDelay = false;
  bool delegate = false;
  bool hasNextPc = false;
  std::uint32_t nextPc = 0;
  std::int32_t sleepMs = 0;
  std::string haltReason;
  std::string delegateReason;
  std::string opcode;
  std::string messageKey;
  std::uint32_t messageAddress = 0;
  std::int32_t messageLine = 0;
  std::int32_t messageCode = 0;
  bool hasMessageAddress = false;
  bool hasMessageLine = false;
  bool hasMessageCode = false;
};

struct AssembledTextRow {
  std::uint32_t address = 0;
  std::int32_t line = 0;
  std::string source;
  std::string basic;
  std::string code;
};

struct AssembleMessage {
  std::int32_t line = 0;
  std::string message;
};

struct NativeSourceLine {
  std::int32_t lineNumber = 0;
  std::string fileName;
  std::string statement;
};

struct NativeMacroDefinition {
  std::string name;
  std::vector<std::string> args;
  std::vector<NativeSourceLine> body;
};

struct NativeMacroHeader {
  std::string name;
  std::vector<std::string> args;
  bool valid = false;
};

struct NativePseudoLabelExpression {
  std::string label;
  std::int32_t delta = 0;
  bool valid = false;
};

struct NativeReferencePseudoEntry {
  std::string op;
  std::vector<std::string> sourceTokens;
  std::vector<std::vector<std::string>> defaultTemplateTokens;
  std::vector<std::vector<std::string>> compactTemplateTokens;
};

std::int32_t clamp32(std::uint32_t value) {
  return static_cast<std::int32_t>(value);
}

std::int32_t add32(std::int32_t a, std::int32_t b) {
  return static_cast<std::int32_t>(static_cast<std::uint32_t>(a) + static_cast<std::uint32_t>(b));
}

std::int32_t sub32(std::int32_t a, std::int32_t b) {
  return static_cast<std::int32_t>(static_cast<std::uint32_t>(a) - static_cast<std::uint32_t>(b));
}

bool add_overflow(std::int32_t a, std::int32_t b) {
  const auto sum = add32(a, b);
  return ((a >= 0 && b >= 0 && sum < 0) || (a < 0 && b < 0 && sum >= 0));
}

bool sub_overflow(std::int32_t a, std::int32_t b) {
  const auto diff = sub32(a, b);
  return ((a >= 0 && b < 0 && diff < 0) || (a < 0 && b >= 0 && diff >= 0));
}

std::int32_t sign_extend16(std::int32_t value) {
  return static_cast<std::int16_t>(value & 0xffff);
}

std::uint32_t zero_extend16(std::int32_t value) {
  return static_cast<std::uint32_t>(value) & 0xffffu;
}

std::int32_t compose_word(std::uint32_t b0, std::uint32_t b1, std::uint32_t b2, std::uint32_t b3) {
  return static_cast<std::int32_t>(
    ((b0 & 0xffu) << 24u)
    | ((b1 & 0xffu) << 16u)
    | ((b2 & 0xffu) << 8u)
    | (b3 & 0xffu)
  );
}

std::uint32_t get_word_byte(std::uint32_t word, std::uint32_t index) {
  const auto shift = (3u - (index & 0x3u)) * 8u;
  return (word >> shift) & 0xffu;
}

std::int32_t set_word_byte(std::uint32_t word, std::uint32_t index, std::uint32_t byte) {
  const auto shift = (3u - (index & 0x3u)) * 8u;
  const auto cleared = word & ~(0xffu << shift);
  const auto merged = cleared | ((byte & 0xffu) << shift);
  return static_cast<std::int32_t>(merged);
}

std::uint32_t count_non_zero_bytes(std::int32_t word) {
  std::uint32_t count = 0;
  const auto numeric = static_cast<std::uint32_t>(word);
  for (std::uint32_t i = 0; i < 4u; i += 1u) {
    if (get_word_byte(numeric, i) != 0u) count += 1u;
  }
  return count;
}

bool has_delay_slot(Opcode op) {
  switch (op) {
    case Opcode::Beq:
    case Opcode::Bne:
    case Opcode::Bgtz:
    case Opcode::Blez:
    case Opcode::Bltz:
    case Opcode::Bgez:
    case Opcode::Bgezal:
    case Opcode::Bltzal:
    case Opcode::Bc1f:
    case Opcode::Bc1t:
    case Opcode::J:
    case Opcode::Jal:
    case Opcode::Jr:
    case Opcode::Jalr:
      return true;
    default:
      return false;
  }
}

Opcode parse_opcode(const std::string& opcode);

class NativeMarsEngine {
 public:
  NativeMarsEngine();

  void configure(val settings, val memoryMap);
  val assemble(const std::string& sourceCode, val options);
  void loadState(val snapshot);
  void replaceStateFromHost(val snapshot, val previousState);
  val exportState(bool includeProgram, bool includeBreakpoints) const;
  val exportRuntimeState(bool includeBreakpoints);
  val step();
  val go(std::int32_t maxSteps);
  val backstep();
  val stop();
  bool toggleBreakpoint(std::uint32_t address);
  std::uint32_t getMemoryUsageBytes() const;
  void trimExecutionHistory();
  void clear();
  std::int32_t hostReadByte(std::uint32_t address, bool signedRead) const;
  void hostWriteByte(std::uint32_t address, std::int32_t value);
  std::int32_t hostReadWord(std::uint32_t address) const;
  void hostWriteWord(std::uint32_t address, std::int32_t value);

 private:
  void resetRuntimeState();
  void importState(val snapshot, bool preserveProgram, bool preserveBreakpoints);
  void loadProgram(val executionPlan);
  HistoryEntry captureHistoryEntry() const;
  void restoreHistoryEntry(const HistoryEntry& entry);
  void clearExecutionHistory();
  std::uint32_t getBackstepHistoryBudgetBytes() const;
  void pushExecutionHistory(HistoryEntry entry);
  void recordWordChange(std::uint32_t baseAddress);
  void markDirtyWord(std::uint32_t baseAddress);
  StepResult executeInstruction(const ProgramRow& row);
  StepResult stepInternal();
  StepResult raiseException(std::int32_t cause, const std::string& messageKey, bool hasBadAddress = false, std::uint32_t badAddress = 0);
  val toResultVal(const StepResult& result) const;
  std::uint8_t getByte(std::uint32_t address) const;
  void setByte(std::uint32_t address, std::uint8_t value);
  std::int32_t readByte(std::uint32_t address, bool signedRead) const;
  void writeByte(std::uint32_t address, std::int32_t value);
  std::int32_t readHalf(std::uint32_t address, bool signedRead) const;
  void writeHalf(std::uint32_t address, std::int32_t value);
  std::int32_t readWord(std::uint32_t address) const;
  void writeWord(std::uint32_t address, std::int32_t value);
  void assertWritableAddress(std::uint32_t address, std::uint32_t byteLength) const;
  bool isTextAddress(std::uint32_t address) const;
  void forceZeroRegister();
  void ensureMemoryCapacity(std::uint32_t additionalNonZeroBytes) const;
  bool hasInstructionAt(std::uint32_t address) const;

  Settings settings_ {};
  MemoryMap memoryMap_ {};
  bool assembled_ = false;
  bool halted_ = false;
  std::uint32_t pc_ = memoryMap_.textBase;
  std::int32_t steps_ = 0;
  std::uint32_t heapPointer_ = memoryMap_.heapBase;
  std::int32_t delayedBranchTarget_ = -1;
  std::int32_t lastMemoryWriteAddress_ = -1;
  std::array<std::int32_t, 34> registers_ {};
  std::array<std::int32_t, 32> cop0_ {};
  std::array<std::int32_t, 32> cop1_ {};
  std::array<std::uint8_t, 8> fpuFlags_ {};
  std::unordered_map<std::uint32_t, std::int32_t> memoryWords_ {};
  std::uint32_t memoryBytesUsed_ = 0;
  std::vector<ProgramRow> programRows_ {};
  std::unordered_map<std::uint32_t, std::size_t> programIndex_ {};
  std::unordered_set<std::uint32_t> breakpoints_ {};
  std::unordered_set<std::uint32_t> dirtyWordAddresses_ {};
  std::deque<HistoryEntry> executionHistory_ {};
  std::uint32_t executionHistoryBytes_ = 0;
  HistoryEntry* activeHistory_ = nullptr;
};

bool has_property(const val& object, const char* name) {
  return !object.isNull() && !object.isUndefined() && object.hasOwnProperty(name);
}

std::uint32_t array_length(const val& value) {
  if (value.isNull() || value.isUndefined()) return 0;
  if (!value.instanceof(val::global("Array"))) return 0;
  return value["length"].as<std::uint32_t>();
}

bool bool_or(const val& object, const char* name, bool fallback) {
  if (!has_property(object, name)) return fallback;
  return object[name].as<bool>();
}

std::int32_t int_or(const val& object, const char* name, std::int32_t fallback) {
  if (!has_property(object, name)) return fallback;
  const auto number = object[name].as<double>();
  if (!std::isfinite(number)) return fallback;
  return static_cast<std::int32_t>(number);
}

std::uint32_t uint_or(const val& object, const char* name, std::uint32_t fallback) {
  if (!has_property(object, name)) return fallback;
  const auto number = object[name].as<double>();
  if (!std::isfinite(number)) return fallback;
  return static_cast<std::uint32_t>(number);
}

std::string string_or(const val& object, const char* name, const std::string& fallback = std::string()) {
  if (!has_property(object, name)) return fallback;
  return object[name].as<std::string>();
}

std::string trim_copy(const std::string& value) {
  std::size_t start = 0;
  while (start < value.size() && std::isspace(static_cast<unsigned char>(value[start])) != 0) start += 1;
  std::size_t end = value.size();
  while (end > start && std::isspace(static_cast<unsigned char>(value[end - 1])) != 0) end -= 1;
  return value.substr(start, end - start);
}

std::string lower_copy(std::string value) {
  std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
    return static_cast<char>(std::tolower(ch));
  });
  return value;
}

bool starts_with_ci(const std::string& value, const std::string& prefix) {
  if (prefix.size() > value.size()) return false;
  for (std::size_t i = 0; i < prefix.size(); i += 1u) {
    if (std::tolower(static_cast<unsigned char>(value[i])) != std::tolower(static_cast<unsigned char>(prefix[i]))) {
      return false;
    }
  }
  return true;
}

std::string normalize_path_like(std::string value) {
  value = trim_copy(value);
  std::replace(value.begin(), value.end(), '\\', '/');
  std::string output;
  output.reserve(value.size());
  bool lastSlash = false;
  for (const char ch : value) {
    if (ch == '/') {
      if (lastSlash) continue;
      lastSlash = true;
      output.push_back(ch);
      continue;
    }
    lastSlash = false;
    output.push_back(ch);
  }
  if (output.rfind("./", 0) == 0) output.erase(0, 2);
  while (output.size() > 1 && output.back() == '/') output.pop_back();
  return output;
}

std::string path_basename_like(const std::string& value) {
  const auto normalized = normalize_path_like(value);
  const auto index = normalized.find_last_of('/');
  return index == std::string::npos ? normalized : normalized.substr(index + 1);
}

std::string path_dirname_like(const std::string& value) {
  const auto normalized = normalize_path_like(value);
  const auto index = normalized.find_last_of('/');
  return index == std::string::npos ? std::string() : normalized.substr(0, index);
}

std::string path_join_like(const std::string& base, const std::string& rel) {
  const auto left = normalize_path_like(base);
  const auto right = normalize_path_like(rel);
  if (left.empty()) return right;
  if (right.empty()) return left;
  std::vector<std::string> parts;
  std::string merged = right[0] == '/' ? right.substr(1) : (left + "/" + right);
  std::size_t cursor = 0;
  while (cursor <= merged.size()) {
    const auto next = merged.find('/', cursor);
    const auto part = merged.substr(cursor, next == std::string::npos ? std::string::npos : (next - cursor));
    cursor = next == std::string::npos ? merged.size() + 1 : next + 1;
    if (part.empty() || part == ".") continue;
    if (part == "..") {
      if (!parts.empty()) parts.pop_back();
      continue;
    }
    parts.push_back(part);
  }
  std::string output;
  for (std::size_t i = 0; i < parts.size(); i += 1u) {
    if (i > 0) output.push_back('/');
    output += parts[i];
  }
  return output;
}

std::string strip_comment_native(const std::string& line) {
  bool inSingle = false;
  bool inDouble = false;
  for (std::size_t i = 0; i < line.size(); i += 1u) {
    const char ch = line[i];
    const char prev = i > 0 ? line[i - 1] : '\0';
    if (ch == '"' && !inSingle && prev != '\\') inDouble = !inDouble;
    else if (ch == '\'' && !inDouble && prev != '\\') inSingle = !inSingle;
    else if (ch == '#' && !inSingle && !inDouble) return line.substr(0, i);
  }
  return line;
}

std::vector<std::string> split_arguments_native(const std::string& text) {
  std::vector<std::string> values;
  std::string current;
  bool inSingle = false;
  bool inDouble = false;
  for (std::size_t i = 0; i < text.size(); i += 1u) {
    const char ch = text[i];
    const char prev = i > 0 ? text[i - 1] : '\0';
    if (ch == '"' && !inSingle && prev != '\\') {
      inDouble = !inDouble;
      current.push_back(ch);
      continue;
    }
    if (ch == '\'' && !inDouble && prev != '\\') {
      inSingle = !inSingle;
      current.push_back(ch);
      continue;
    }
    if (!inSingle && !inDouble && ch == ',') {
      const auto token = trim_copy(current);
      if (!token.empty()) values.push_back(token);
      current.clear();
      continue;
    }
    current.push_back(ch);
  }
  const auto token = trim_copy(current);
  if (!token.empty()) values.push_back(token);
  return values;
}

std::vector<std::string> tokenize_statement_native(const std::string& statement) {
  const auto input = trim_copy(statement);
  if (input.empty()) return {};
  std::vector<std::string> tokens;
  std::string current;
  bool inSingle = false;
  bool inDouble = false;
  for (std::size_t i = 0; i < input.size(); i += 1u) {
    const char ch = input[i];
    const char prev = i > 0 ? input[i - 1] : '\0';
    if (ch == '"' && !inSingle && prev != '\\') {
      inDouble = !inDouble;
      current.push_back(ch);
      continue;
    }
    if (ch == '\'' && !inDouble && prev != '\\') {
      inSingle = !inSingle;
      current.push_back(ch);
      continue;
    }
    if (!inSingle && !inDouble && (ch == ',' || std::isspace(static_cast<unsigned char>(ch)) != 0)) {
      const auto token = trim_copy(current);
      if (!token.empty()) tokens.push_back(token);
      current.clear();
      continue;
    }
    current.push_back(ch);
  }
  const auto token = trim_copy(current);
  if (!token.empty()) tokens.push_back(token);
  return tokens;
}

std::int32_t parse_immediate_native(const std::string& token, bool* ok = nullptr) {
  std::string clean;
  clean.reserve(token.size());
  for (const char ch : token) {
    if (ch == '(' || ch == ')' || ch == ',') continue;
    if (ch == '_') continue;
    clean.push_back(ch);
  }
  clean = trim_copy(clean);
  if (clean.empty()) {
    if (ok) *ok = false;
    return 0;
  }

  try {
    std::size_t used = 0;
    if (clean.size() >= 2 && (clean[0] == '+' || clean[0] == '-')) {
      const auto sign = clean[0] == '-' ? -1 : 1;
      const auto body = clean.substr(1);
      if (body.rfind("0x", 0) == 0 || body.rfind("0X", 0) == 0) {
        const auto value = std::stoll(body, &used, 16);
        if (used == body.size()) {
          if (ok) *ok = true;
          return static_cast<std::int32_t>(sign * value);
        }
      }
      if (body.rfind("0b", 0) == 0 || body.rfind("0B", 0) == 0) {
        const auto value = std::stoll(body.substr(2), &used, 2);
        if (used == body.size() - 2) {
          if (ok) *ok = true;
          return static_cast<std::int32_t>(sign * value);
        }
      }
    }
    if (clean.rfind("0x", 0) == 0 || clean.rfind("-0x", 0) == 0 || clean.rfind("+0x", 0) == 0 || clean.rfind("0X", 0) == 0) {
      const auto value = std::stoll(clean, &used, 16);
      if (used == clean.size()) {
        if (ok) *ok = true;
        return static_cast<std::int32_t>(value);
      }
    }
    if (clean.rfind("0b", 0) == 0 || clean.rfind("-0b", 0) == 0 || clean.rfind("+0b", 0) == 0 || clean.rfind("0B", 0) == 0) {
      int sign = 1;
      std::string body = clean;
      if (body[0] == '+' || body[0] == '-') {
        sign = body[0] == '-' ? -1 : 1;
        body.erase(0, 1);
      }
      const auto value = std::stoll(body.substr(2), &used, 2);
      if (used == body.size() - 2) {
        if (ok) *ok = true;
        return static_cast<std::int32_t>(sign * value);
      }
    }
    if (clean.size() >= 3 && clean.front() == '\'' && clean.back() == '\'') {
      const auto body = clean.substr(1, clean.size() - 2);
      if (body.size() == 1) {
        if (ok) *ok = true;
        return static_cast<std::int32_t>(static_cast<unsigned char>(body[0]));
      }
      if (body.size() == 2 && body[0] == '\\') {
        if (ok) *ok = true;
        switch (body[1]) {
          case 'n': return '\n';
          case 't': return '\t';
          case 'r': return '\r';
          case '0': return 0;
          case '\'': return '\'';
          case '"': return '"';
          case '\\': return '\\';
          default: return static_cast<std::int32_t>(static_cast<unsigned char>(body[1]));
        }
      }
    }
    const auto value = std::stoll(clean, &used, 10);
    if (used == clean.size()) {
      if (ok) *ok = true;
      return static_cast<std::int32_t>(value);
    }
  } catch (...) {
  }

  if (ok) *ok = false;
  return 0;
}

std::string parse_string_literal_native(const std::string& token, bool* ok = nullptr) {
  const auto raw = trim_copy(token);
  if (raw.size() < 2 || raw.front() != '"' || raw.back() != '"') {
    if (ok) *ok = false;
    return {};
  }
  std::string output;
  for (std::size_t i = 1; i + 1 < raw.size(); i += 1u) {
    const char ch = raw[i];
    if (ch != '\\') {
      output.push_back(ch);
      continue;
    }
    i += 1u;
    if (i + 1 > raw.size()) break;
    const char esc = raw[i];
    switch (esc) {
      case 'n': output.push_back('\n'); break;
      case 't': output.push_back('\t'); break;
      case 'r': output.push_back('\r'); break;
      case '0': output.push_back('\0'); break;
      case '\\': output.push_back('\\'); break;
      case '"': output.push_back('"'); break;
      case '\'': output.push_back('\''); break;
      default: output.push_back(esc); break;
    }
  }
  if (ok) *ok = true;
  return output;
}

std::uint32_t stable_hash_native(const std::string& text) {
  std::uint32_t hash = 0;
  for (const char ch : text) hash = (hash * 33u + static_cast<std::uint8_t>(ch)) & 0xffffffffu;
  return hash;
}

std::string to_hex32(std::uint32_t value) {
  static const char* digits = "0123456789abcdef";
  std::string output = "0x00000000";
  for (int i = 0; i < 8; i += 1) {
    output[9 - i] = digits[(value >> (i * 4)) & 0xfu];
  }
  return output;
}

bool is_identifier_char(char ch) {
  return std::isalnum(static_cast<unsigned char>(ch)) != 0 || ch == '_' || ch == '.' || ch == '$';
}

std::string replace_identifier_tokens(std::string text, const std::string& from, const std::string& to) {
  if (from.empty()) return text;
  std::string output;
  output.reserve(text.size());
  std::size_t cursor = 0;
  while (cursor < text.size()) {
    const auto index = text.find(from, cursor);
    if (index == std::string::npos) {
      output.append(text.substr(cursor));
      break;
    }
    const char left = index > 0 ? text[index - 1] : '\0';
    const char right = index + from.size() < text.size() ? text[index + from.size()] : '\0';
    const bool leftOk = index == 0 || !is_identifier_char(left);
    const bool rightOk = index + from.size() >= text.size() || !is_identifier_char(right);
    if (leftOk && rightOk) {
      output.append(text.substr(cursor, index - cursor));
      output.append(to);
      cursor = index + from.size();
    } else {
      output.append(text.substr(cursor, index - cursor + from.size()));
      cursor = index + from.size();
    }
  }
  return output;
}

bool is_delegate_basic_opcode(const std::string& opcode) {
  static const std::unordered_set<std::string> known = {
    "syscall", "ldc1", "sdc1",
    "add.s", "sub.s", "mul.s", "div.s", "add.d", "sub.d", "mul.d", "div.d",
    "mov.s", "mov.d", "neg.s", "neg.d", "abs.s", "abs.d", "sqrt.s", "sqrt.d",
    "movf.s", "movt.s", "movf.d", "movt.d", "movn.s", "movz.s", "movn.d", "movz.d",
    "c.eq.s", "c.lt.s", "c.le.s", "c.eq.d", "c.lt.d", "c.le.d",
    "cvt.s.d", "cvt.s.w", "cvt.d.s", "cvt.d.w", "cvt.w.s", "cvt.w.d",
    "round.w.s", "round.w.d", "trunc.w.s", "trunc.w.d", "ceil.w.s", "ceil.w.d", "floor.w.s", "floor.w.d"
  };
  return known.find(opcode) != known.end();
}

bool is_known_pseudo_opcode(const std::string& opcode) {
  static const std::unordered_set<std::string> known = {
    "nop", "move", "clear", "not", "abs", "neg", "negu", "li", "la", "b", "beqz", "bnez",
    "blt", "bltu", "bgt", "bgtu", "ble", "bleu", "bge", "bgeu", "mfc1.d", "mtc1.d",
    "l.s", "s.s", "l.d", "s.d", "ld", "sd", "ulw", "usw", "ulh", "ulhu", "ush",
    "seq", "sne", "sgt", "sgtu", "sge", "sgeu", "sle", "sleu",
    "subi", "subiu", "mulu", "mulo", "mulou", "rem", "remu", "rol", "ror"
  };
  return known.find(opcode) != known.end();
}

std::int32_t resolve_register_token(const std::string& token) {
  static const std::unordered_map<std::string, std::int32_t> named = {
    {"zero", 0}, {"at", 1}, {"v0", 2}, {"v1", 3},
    {"a0", 4}, {"a1", 5}, {"a2", 6}, {"a3", 7},
    {"t0", 8}, {"t1", 9}, {"t2", 10}, {"t3", 11}, {"t4", 12}, {"t5", 13}, {"t6", 14}, {"t7", 15},
    {"s0", 16}, {"s1", 17}, {"s2", 18}, {"s3", 19}, {"s4", 20}, {"s5", 21}, {"s6", 22}, {"s7", 23},
    {"t8", 24}, {"t9", 25}, {"k0", 26}, {"k1", 27}, {"gp", 28}, {"sp", 29}, {"fp", 30}, {"s8", 30}, {"ra", 31}
  };
  auto clean = trim_copy(token);
  clean.erase(std::remove(clean.begin(), clean.end(), '('), clean.end());
  clean.erase(std::remove(clean.begin(), clean.end(), ')'), clean.end());
  clean.erase(std::remove(clean.begin(), clean.end(), ','), clean.end());
  clean = lower_copy(clean);
  if (!clean.empty() && clean[0] == '$') clean.erase(0, 1);
  if (clean.empty()) return -1;
  auto found = named.find(clean);
  if (found != named.end()) return found->second;
  bool ok = false;
  const auto numeric = parse_immediate_native(clean, &ok);
  if (ok && numeric >= 0 && numeric < 32) return numeric;
  return -1;
}

bool is_explicit_register_operand_native(const std::string& token) {
  auto clean = trim_copy(token);
  clean.erase(std::remove(clean.begin(), clean.end(), '('), clean.end());
  clean.erase(std::remove(clean.begin(), clean.end(), ')'), clean.end());
  clean.erase(std::remove(clean.begin(), clean.end(), ','), clean.end());
  clean = lower_copy(clean);
  if (clean.empty()) return false;
  const bool prefixed = clean[0] == '$';
  if (prefixed) clean.erase(0, 1);
  if (clean.empty()) return false;
  bool numericOk = false;
  parse_immediate_native(clean, &numericOk);
  if (numericOk && !prefixed) return false;
  return resolve_register_token(token) >= 0;
}

std::int32_t resolve_float_register_token(const std::string& token) {
  auto clean = trim_copy(token);
  clean.erase(std::remove(clean.begin(), clean.end(), '('), clean.end());
  clean.erase(std::remove(clean.begin(), clean.end(), ')'), clean.end());
  clean.erase(std::remove(clean.begin(), clean.end(), ','), clean.end());
  clean = lower_copy(clean);
  if (!clean.empty() && clean[0] == '$') clean.erase(0, 1);
  if (clean.size() >= 2 && clean[0] == 'f') {
    bool ok = false;
    const auto numeric = parse_immediate_native(clean.substr(1), &ok);
    if (ok && numeric >= 0 && numeric < 32) return numeric;
  }
  return -1;
}

std::int32_t resolve_cop0_register_token(const std::string& token) {
  static const std::unordered_map<std::string, std::int32_t> named = {
    {"vaddr", 8}, {"status", 12}, {"cause", 13}, {"epc", 14}
  };
  auto clean = trim_copy(token);
  clean.erase(std::remove(clean.begin(), clean.end(), '('), clean.end());
  clean.erase(std::remove(clean.begin(), clean.end(), ')'), clean.end());
  clean.erase(std::remove(clean.begin(), clean.end(), ','), clean.end());
  clean = lower_copy(clean);
  if (!clean.empty() && clean[0] == '$') clean.erase(0, 1);
  auto found = named.find(clean);
  if (found != named.end()) return found->second;
  bool ok = false;
  const auto numeric = parse_immediate_native(clean, &ok);
  if (ok && numeric >= 0 && numeric < 32) return numeric;
  return -1;
}

bool is_label_identifier_native(const std::string& token) {
  const auto clean = trim_copy(token);
  if (clean.empty()) return false;
  const char first = clean.front();
  if (!(std::isalpha(static_cast<unsigned char>(first)) != 0 || first == '_' || first == '.' || first == '$')) return false;
  for (std::size_t i = 1; i < clean.size(); i += 1u) {
    const char ch = clean[i];
    if (!(std::isalnum(static_cast<unsigned char>(ch)) != 0 || ch == '_' || ch == '.' || ch == '$')) return false;
  }
  return true;
}

NativeMacroHeader parse_macro_header_native(const std::string& statement) {
  NativeMacroHeader header;
  auto body = trim_copy(statement);
  if (!starts_with_ci(body, ".macro")) return header;
  body = trim_copy(body.substr(6));
  if (body.empty()) return header;

  std::size_t nameEnd = 0;
  while (nameEnd < body.size()) {
    const char ch = body[nameEnd];
    if (std::isspace(static_cast<unsigned char>(ch)) != 0 || ch == '(') break;
    nameEnd += 1u;
  }
  header.name = trim_copy(body.substr(0, nameEnd));
  if (!is_label_identifier_native(header.name)) {
    header.name.clear();
    return header;
  }

  auto argsText = trim_copy(body.substr(nameEnd));
  if (!argsText.empty() && argsText.front() == '(' && argsText.back() == ')') {
    argsText = trim_copy(argsText.substr(1, argsText.size() - 2u));
  }
  header.args = argsText.empty() ? std::vector<std::string>() : tokenize_statement_native(argsText);
  header.valid = true;
  return header;
}

std::vector<std::string> parse_macro_invocation_arguments_native(const std::string& statement, const std::string& name) {
  auto argsText = trim_copy(statement.substr(std::min(statement.size(), name.size())));
  if (argsText.empty()) return {};
  if (argsText.front() == '(' && argsText.back() == ')') {
    argsText = trim_copy(argsText.substr(1, argsText.size() - 2u));
  }
  return argsText.empty() ? std::vector<std::string>() : tokenize_statement_native(argsText);
}

std::vector<std::string> tokenize_pseudo_source_statement_native(const std::string& statement) {
  const auto input = trim_copy(statement);
  if (input.empty()) return {};

  std::vector<std::string> tokens;
  std::string current;
  bool inSingle = false;
  bool inDouble = false;

  auto flush = [&]() {
    const auto token = trim_copy(current);
    if (!token.empty()) tokens.push_back(token);
    current.clear();
  };

  for (std::size_t i = 0; i < input.size(); i += 1u) {
    const char ch = input[i];
    const char prev = i > 0 ? input[i - 1] : '\0';

    if (ch == '"' && !inSingle && prev != '\\') {
      inDouble = !inDouble;
      current.push_back(ch);
      continue;
    }
    if (ch == '\'' && !inDouble && prev != '\\') {
      inSingle = !inSingle;
      current.push_back(ch);
      continue;
    }
    if (!inSingle && !inDouble && (ch == '(' || ch == ')')) {
      flush();
      tokens.push_back(std::string(1, ch));
      continue;
    }
    if (!inSingle && !inDouble && (ch == '+' || ch == '-')) {
      const auto trimmed = trim_copy(current);
      const auto next = trim_copy(input.substr(i + 1u));
      const bool nextIsNumber = !next.empty() && (std::isdigit(static_cast<unsigned char>(next[0])) != 0 || starts_with_ci(next, "0x"));
      if (!trimmed.empty() && is_label_identifier_native(trimmed) && nextIsNumber) {
        flush();
        tokens.push_back(std::string(1, ch));
        continue;
      }
    }
    if (!inSingle && !inDouble && (ch == ',' || std::isspace(static_cast<unsigned char>(ch)) != 0)) {
      flush();
      continue;
    }
    current.push_back(ch);
  }

  flush();
  return tokens;
}

NativePseudoLabelExpression parse_pseudo_label_expression_native(const std::string& token) {
  NativePseudoLabelExpression expression;
  const auto clean = trim_copy(token);
  if (clean.size() < 3u) return expression;
  std::size_t splitIndex = std::string::npos;
  for (std::size_t i = 1; i < clean.size(); i += 1u) {
    if (clean[i] == '+' || clean[i] == '-') {
      splitIndex = i;
      break;
    }
  }
  if (splitIndex == std::string::npos) return expression;
  const auto label = trim_copy(clean.substr(0, splitIndex));
  if (!is_label_identifier_native(label)) return expression;
  bool ok = false;
  const auto delta = parse_immediate_native(clean.substr(splitIndex), &ok);
  if (!ok) return expression;
  expression.label = label;
  expression.delta = delta;
  expression.valid = true;
  return expression;
}

bool fits_pseudo_signed16(std::int32_t value) {
  return value >= -32768 && value <= 32767;
}

bool fits_pseudo_unsigned16(std::int32_t value) {
  return value >= 0 && value <= 65535;
}

bool fits_pseudo_unsigned5(std::int32_t value) {
  return value >= 0 && value <= 31;
}

std::int32_t low16_signed_value_native(std::uint32_t value) {
  return sign_extend16(static_cast<std::int32_t>(value));
}

std::uint32_t low16_unsigned_value_native(std::uint32_t value) {
  return zero_extend16(static_cast<std::int32_t>(value));
}

std::uint32_t high16_carry_value_native(std::uint32_t value) {
  return ((value >> 16u) + ((value & 0x8000u) ? 1u : 0u)) & 0xffffu;
}

std::uint32_t high16_logical_value_native(std::uint32_t value) {
  return (value >> 16u) & 0xffffu;
}

std::vector<std::string> read_string_vector(const val& input) {
  std::vector<std::string> values;
  for (std::uint32_t i = 0; i < array_length(input); i += 1u) {
    values.push_back(input[i].as<std::string>());
  }
  return values;
}

std::vector<std::vector<std::string>> read_nested_string_vectors(const val& input) {
  std::vector<std::vector<std::string>> values;
  for (std::uint32_t i = 0; i < array_length(input); i += 1u) {
    values.push_back(read_string_vector(input[i]));
  }
  return values;
}

std::unordered_map<std::string, std::vector<NativeReferencePseudoEntry>> build_reference_pseudo_index(const val& input) {
  std::unordered_map<std::string, std::vector<NativeReferencePseudoEntry>> index;
  const auto length = array_length(input);
  for (std::uint32_t i = 0; i < length; i += 1u) {
    const auto entry = input[i];
    NativeReferencePseudoEntry parsed;
    parsed.op = lower_copy(string_or(entry, "op"));
    if (parsed.op.empty()) continue;
    parsed.sourceTokens = read_string_vector(entry["sourceTokens"]);
    parsed.defaultTemplateTokens = read_nested_string_vectors(entry["defaultTemplateTokens"]);
    parsed.compactTemplateTokens = read_nested_string_vectors(entry["compactTemplateTokens"]);
    index[parsed.op].push_back(std::move(parsed));
  }
  return index;
}

Opcode parse_opcode(const std::string& opcode) {
  static const std::unordered_map<std::string, Opcode> map = {
    {"nop", Opcode::Nop},
    {"eret", Opcode::Eret},
    {"break", Opcode::Break},
    {"teq", Opcode::Teq}, {"tne", Opcode::Tne}, {"tge", Opcode::Tge}, {"tgeu", Opcode::Tgeu}, {"tlt", Opcode::Tlt}, {"tltu", Opcode::Tltu},
    {"teqi", Opcode::Teqi}, {"tnei", Opcode::Tnei}, {"tgei", Opcode::Tgei}, {"tgeiu", Opcode::Tgeiu}, {"tlti", Opcode::Tlti}, {"tltiu", Opcode::Tltiu},
    {"add", Opcode::Add}, {"addu", Opcode::Addu}, {"sub", Opcode::Sub}, {"subu", Opcode::Subu}, {"and", Opcode::And}, {"or", Opcode::Or}, {"xor", Opcode::Xor}, {"nor", Opcode::Nor},
    {"slt", Opcode::Slt}, {"sltu", Opcode::Sltu}, {"mul", Opcode::Mul}, {"movn", Opcode::Movn}, {"movz", Opcode::Movz},
    {"clz", Opcode::Clz}, {"clo", Opcode::Clo},
    {"addi", Opcode::Addi}, {"addiu", Opcode::Addiu}, {"andi", Opcode::Andi}, {"ori", Opcode::Ori}, {"xori", Opcode::Xori}, {"slti", Opcode::Slti}, {"sltiu", Opcode::Sltiu},
    {"lui", Opcode::Lui},
    {"sll", Opcode::Sll}, {"srl", Opcode::Srl}, {"sra", Opcode::Sra}, {"sllv", Opcode::Sllv}, {"srlv", Opcode::Srlv}, {"srav", Opcode::Srav},
    {"mult", Opcode::Mult}, {"multu", Opcode::Multu}, {"div", Opcode::Div}, {"divu", Opcode::Divu}, {"madd", Opcode::Madd}, {"maddu", Opcode::Maddu}, {"msub", Opcode::Msub}, {"msubu", Opcode::Msubu},
    {"mfhi", Opcode::Mfhi}, {"mflo", Opcode::Mflo}, {"mthi", Opcode::Mthi}, {"mtlo", Opcode::Mtlo},
    {"mfc0", Opcode::Mfc0}, {"mtc0", Opcode::Mtc0},
    {"mfc1", Opcode::Mfc1}, {"mtc1", Opcode::Mtc1},
    {"lw", Opcode::Lw}, {"sw", Opcode::Sw}, {"lb", Opcode::Lb}, {"lbu", Opcode::Lbu}, {"sb", Opcode::Sb}, {"lh", Opcode::Lh}, {"lhu", Opcode::Lhu}, {"sh", Opcode::Sh},
    {"ll", Opcode::Ll}, {"sc", Opcode::Sc}, {"lwl", Opcode::Lwl}, {"lwr", Opcode::Lwr}, {"swl", Opcode::Swl}, {"swr", Opcode::Swr}, {"lwc1", Opcode::Lwc1}, {"swc1", Opcode::Swc1},
    {"beq", Opcode::Beq}, {"bne", Opcode::Bne}, {"bgtz", Opcode::Bgtz}, {"blez", Opcode::Blez}, {"bltz", Opcode::Bltz}, {"bgez", Opcode::Bgez}, {"bgezal", Opcode::Bgezal}, {"bltzal", Opcode::Bltzal},
    {"bc1f", Opcode::Bc1f}, {"bc1t", Opcode::Bc1t},
    {"j", Opcode::J}, {"jal", Opcode::Jal}, {"jr", Opcode::Jr}, {"jalr", Opcode::Jalr},
    {"movf", Opcode::Movf}, {"movt", Opcode::Movt}
  };
  const auto found = map.find(opcode);
  return found == map.end() ? Opcode::Delegate : found->second;
}

NativeMarsEngine::NativeMarsEngine() {
  resetRuntimeState();
}

void NativeMarsEngine::configure(val settings, val memoryMap) {
  settings_.startAtMain = bool_or(settings, "startAtMain", settings_.startAtMain);
  settings_.extendedAssembler = bool_or(settings, "extendedAssembler", settings_.extendedAssembler);
  settings_.delayedBranching = bool_or(settings, "delayedBranching", settings_.delayedBranching);
  settings_.strictMarsCompatibility = bool_or(settings, "strictMarsCompatibility", settings_.strictMarsCompatibility);
  settings_.selfModifyingCode = bool_or(settings, "selfModifyingCode", settings_.selfModifyingCode);
  settings_.warningsAreErrors = bool_or(settings, "warningsAreErrors", settings_.warningsAreErrors);
  settings_.maxBacksteps = int_or(settings, "maxBacksteps", settings_.maxBacksteps);
  settings_.maxErrors = int_or(settings, "maxErrors", settings_.maxErrors);
  settings_.maxMemoryBytes = int_or(settings, "maxMemoryBytes", settings_.maxMemoryBytes);
  settings_.maxBackstepHistoryBytes = int_or(settings, "maxBackstepHistoryBytes", settings_.maxBackstepHistoryBytes);

  memoryMap_.textBase = uint_or(memoryMap, "textBase", memoryMap_.textBase);
  memoryMap_.externBase = uint_or(memoryMap, "externBase", memoryMap_.externBase);
  memoryMap_.dataBase = uint_or(memoryMap, "dataBase", memoryMap_.dataBase);
  memoryMap_.dataSegmentBase = uint_or(memoryMap, "dataSegmentBase", memoryMap_.dataSegmentBase);
  memoryMap_.heapBase = uint_or(memoryMap, "heapBase", memoryMap_.heapBase);
  memoryMap_.stackBase = uint_or(memoryMap, "stackBase", memoryMap_.stackBase);
  memoryMap_.stackPointer = uint_or(memoryMap, "stackPointer", memoryMap_.stackPointer);
  memoryMap_.globalPointer = uint_or(memoryMap, "globalPointer", memoryMap_.globalPointer);
  memoryMap_.kernelBase = uint_or(memoryMap, "kernelBase", memoryMap_.kernelBase);
  memoryMap_.kernelTextBase = uint_or(memoryMap, "kernelTextBase", memoryMap_.kernelTextBase);
  memoryMap_.kernelDataBase = uint_or(memoryMap, "kernelDataBase", memoryMap_.kernelDataBase);
  memoryMap_.exceptionHandlerAddress = uint_or(memoryMap, "exceptionHandlerAddress", memoryMap_.exceptionHandlerAddress);
}

#include "core_engine_assemble.inc"

void NativeMarsEngine::resetRuntimeState() {
  assembled_ = false;
  halted_ = false;
  pc_ = memoryMap_.textBase;
  steps_ = 0;
  heapPointer_ = memoryMap_.heapBase;
  delayedBranchTarget_ = -1;
  lastMemoryWriteAddress_ = -1;
  registers_.fill(0);
  registers_[28] = clamp32(memoryMap_.globalPointer);
  registers_[29] = clamp32(memoryMap_.stackPointer);
  cop0_.fill(0);
  cop0_[COP0_STATUS] = COP0_DEFAULT_STATUS;
  cop1_.fill(0);
  fpuFlags_.fill(0);
  memoryWords_.clear();
  dirtyWordAddresses_.clear();
  memoryBytesUsed_ = 0;
  clearExecutionHistory();
}

void NativeMarsEngine::clearExecutionHistory() {
  executionHistory_.clear();
  executionHistoryBytes_ = 0;
  activeHistory_ = nullptr;
}

void NativeMarsEngine::clear() {
  programRows_.clear();
  programIndex_.clear();
  breakpoints_.clear();
  resetRuntimeState();
}

std::int32_t NativeMarsEngine::hostReadByte(std::uint32_t address, bool signedRead) const {
  return readByte(address, signedRead);
}

void NativeMarsEngine::hostWriteByte(std::uint32_t address, std::int32_t value) {
  writeByte(address, value);
}

std::int32_t NativeMarsEngine::hostReadWord(std::uint32_t address) const {
  return readWord(address);
}

void NativeMarsEngine::hostWriteWord(std::uint32_t address, std::int32_t value) {
  writeWord(address, value);
}

void NativeMarsEngine::loadProgram(val executionPlan) {
  programRows_.clear();
  programIndex_.clear();
  const auto length = array_length(executionPlan);
  programRows_.reserve(length);
  for (std::uint32_t i = 0; i < length; i += 1u) {
    const auto rowVal = executionPlan[i];
    ProgramRow row;
    row.opcodeName = string_or(rowVal, "opcode");
    row.op = parse_opcode(row.opcodeName);
    row.basic = string_or(rowVal, "basic");
    row.delegateReason = string_or(rowVal, "delegateReason");
    row.address = uint_or(rowVal, "address", 0);
    row.line = int_or(rowVal, "line", 0);
    row.rd = int_or(rowVal, "rd", -1);
    row.rs = int_or(rowVal, "rs", -1);
    row.rt = int_or(rowVal, "rt", -1);
    row.fs = int_or(rowVal, "fs", -1);
    row.ft = int_or(rowVal, "ft", -1);
    row.base = int_or(rowVal, "base", -1);
    row.immediate = int_or(rowVal, "immediate", 0);
    row.target = uint_or(rowVal, "target", 0);
    row.absolute = uint_or(rowVal, "absolute", 0);
    row.cc = int_or(rowVal, "cc", 0);
    row.delegate = bool_or(rowVal, "delegate", false) || row.op == Opcode::Delegate;
    if (row.delegate && row.delegateReason.empty()) row.delegateReason = "unsupported";
    programIndex_.insert({ row.address, programRows_.size() });
    programRows_.push_back(std::move(row));
  }
}

void NativeMarsEngine::importState(val snapshot, bool preserveProgram, bool preserveBreakpoints) {
  assembled_ = bool_or(snapshot, "assembled", false);
  halted_ = bool_or(snapshot, "halted", false);
  pc_ = uint_or(snapshot, "pc", memoryMap_.textBase);
  steps_ = int_or(snapshot, "steps", 0);
  heapPointer_ = uint_or(snapshot, "heapPointer", memoryMap_.heapBase);
  delayedBranchTarget_ = has_property(snapshot, "delayedBranchTarget") && !snapshot["delayedBranchTarget"].isNull()
    ? static_cast<std::int32_t>(snapshot["delayedBranchTarget"].as<double>())
    : -1;
  lastMemoryWriteAddress_ = has_property(snapshot, "lastMemoryWriteAddress") && !snapshot["lastMemoryWriteAddress"].isNull()
    ? static_cast<std::int32_t>(snapshot["lastMemoryWriteAddress"].as<double>())
    : -1;

  registers_.fill(0);
  cop0_.fill(0);
  cop1_.fill(0);
  fpuFlags_.fill(0);

  const auto registers = snapshot["registers"];
  for (std::uint32_t i = 0; i < std::min<std::uint32_t>(34u, array_length(registers)); i += 1u) {
    registers_[i] = static_cast<std::int32_t>(registers[i].as<double>());
  }
  const auto cop0 = snapshot["cop0"];
  for (std::uint32_t i = 0; i < std::min<std::uint32_t>(32u, array_length(cop0)); i += 1u) {
    cop0_[i] = static_cast<std::int32_t>(cop0[i].as<double>());
  }
  const auto cop1 = snapshot["cop1"];
  for (std::uint32_t i = 0; i < std::min<std::uint32_t>(32u, array_length(cop1)); i += 1u) {
    cop1_[i] = static_cast<std::int32_t>(cop1[i].as<double>());
  }
  const auto fpuFlags = snapshot["fpuFlags"];
  for (std::uint32_t i = 0; i < std::min<std::uint32_t>(8u, array_length(fpuFlags)); i += 1u) {
    fpuFlags_[i] = static_cast<std::uint8_t>(fpuFlags[i].as<double>() != 0.0 ? 1 : 0);
  }

  memoryWords_.clear();
  dirtyWordAddresses_.clear();
  memoryBytesUsed_ = 0;
  const auto memoryWords = snapshot["memoryWords"];
  for (std::uint32_t i = 0; i < array_length(memoryWords); i += 1u) {
    const auto entry = memoryWords[i];
    if (!entry.isArray() || array_length(entry) < 2u) continue;
    const auto address = static_cast<std::uint32_t>(entry[0].as<double>());
    const auto value = static_cast<std::int32_t>(entry[1].as<double>());
    if (value == 0) continue;
    memoryWords_.insert({ address, value });
    memoryBytesUsed_ += count_non_zero_bytes(value);
  }

  clearExecutionHistory();

  if (!preserveProgram) {
    loadProgram(snapshot["executionPlan"]);
  }

  if (!preserveBreakpoints) {
    breakpoints_.clear();
    const auto breakpoints = snapshot["breakpoints"];
    for (std::uint32_t i = 0; i < array_length(breakpoints); i += 1u) {
      breakpoints_.insert(static_cast<std::uint32_t>(breakpoints[i].as<double>()));
    }
  }

  forceZeroRegister();
}

void NativeMarsEngine::loadState(val snapshot) {
  configure(snapshot["settings"], snapshot["memoryMap"]);
  importState(snapshot, array_length(snapshot["executionPlan"]) == 0u, false);
}

void NativeMarsEngine::replaceStateFromHost(val snapshot, val previousState) {
  HistoryEntry previous = captureHistoryEntry();
  auto preservedHistory = executionHistory_;
  const auto preservedHistoryBytes = executionHistoryBytes_;
  configure(snapshot["settings"], snapshot["memoryMap"]);
  importState(snapshot, true, false);
  executionHistory_ = std::move(preservedHistory);
  executionHistoryBytes_ = preservedHistoryBytes;
  previous.pc = uint_or(previousState, "pc", previous.pc);
  previous.steps = int_or(previousState, "steps", previous.steps);
  previous.halted = bool_or(previousState, "halted", previous.halted);

  const auto registers = previousState["registers"];
  for (std::uint32_t i = 0; i < std::min<std::uint32_t>(34u, array_length(registers)); i += 1u) {
    previous.registers[i] = static_cast<std::int32_t>(registers[i].as<double>());
  }
  const auto cop0 = previousState["cop0"];
  for (std::uint32_t i = 0; i < std::min<std::uint32_t>(32u, array_length(cop0)); i += 1u) {
    previous.cop0[i] = static_cast<std::int32_t>(cop0[i].as<double>());
  }
  const auto cop1 = previousState["cop1"];
  for (std::uint32_t i = 0; i < std::min<std::uint32_t>(32u, array_length(cop1)); i += 1u) {
    previous.cop1[i] = static_cast<std::int32_t>(cop1[i].as<double>());
  }
  const auto fpuFlags = previousState["fpuFlags"];
  for (std::uint32_t i = 0; i < std::min<std::uint32_t>(8u, array_length(fpuFlags)); i += 1u) {
    previous.fpuFlags[i] = static_cast<std::uint8_t>(fpuFlags[i].as<double>() != 0.0 ? 1 : 0);
  }
  previous.heapPointer = uint_or(previousState, "heapPointer", previous.heapPointer);
  previous.delayedBranchTarget = has_property(previousState, "delayedBranchTarget") && !previousState["delayedBranchTarget"].isNull()
    ? static_cast<std::int32_t>(previousState["delayedBranchTarget"].as<double>())
    : -1;
  previous.lastMemoryWriteAddress = has_property(previousState, "lastMemoryWriteAddress") && !previousState["lastMemoryWriteAddress"].isNull()
    ? static_cast<std::int32_t>(previousState["lastMemoryWriteAddress"].as<double>())
    : -1;
  std::unordered_map<std::uint32_t, std::int32_t> previousWordMap;
  const auto previousWordEntries = previousState["memoryWords"];
  for (std::uint32_t i = 0; i < array_length(previousWordEntries); i += 1u) {
    const auto entry = previousWordEntries[i];
    if (!entry.isArray() || array_length(entry) < 2u) continue;
    const auto address = static_cast<std::uint32_t>(entry[0].as<double>());
    const auto value = static_cast<std::int32_t>(entry[1].as<double>());
    if (value != 0) previousWordMap[address] = value;
  }

  previous.memoryChanges.clear();
  for (const auto& entry : previousWordMap) {
    const auto current = memoryWords_.find(entry.first);
    const auto currentValue = current == memoryWords_.end() ? 0 : current->second;
    if (currentValue != entry.second) {
      previous.memoryChanges[entry.first] = WordChange{ true, entry.second };
    }
  }
  for (const auto& entry : memoryWords_) {
    if (previousWordMap.find(entry.first) == previousWordMap.end()) {
      previous.memoryChanges[entry.first] = WordChange{ false, 0 };
    }
  }
  previous.estimatedBytes = HISTORY_BASE_ESTIMATE_BYTES + static_cast<std::uint32_t>(previous.memoryChanges.size()) * BACKSTEP_MEMORY_CHANGE_ENTRY_ESTIMATE_BYTES;
  pushExecutionHistory(std::move(previous));
}

val NativeMarsEngine::exportState(bool includeProgram, bool includeBreakpoints) const {
  val snapshot = val::object();
  snapshot.set("assembled", assembled_);
  snapshot.set("halted", halted_);
  snapshot.set("pc", pc_);
  snapshot.set("steps", steps_);
  snapshot.set("heapPointer", heapPointer_);
  snapshot.set("delayedBranchTarget", delayedBranchTarget_ >= 0 ? val(static_cast<double>(static_cast<std::uint32_t>(delayedBranchTarget_))) : val::null());
  snapshot.set("lastMemoryWriteAddress", lastMemoryWriteAddress_ >= 0 ? val(static_cast<double>(static_cast<std::uint32_t>(lastMemoryWriteAddress_))) : val::null());
  snapshot.set("memoryUsageBytes", memoryBytesUsed_);
  snapshot.set("maxMemoryBytes", settings_.maxMemoryBytes);
  snapshot.set("backstepDepth", static_cast<std::uint32_t>(executionHistory_.size()));
  snapshot.set("backstepHistoryBytes", executionHistoryBytes_);
  snapshot.set("backstepHistoryBudgetBytes", getBackstepHistoryBudgetBytes());

  val registers = val::array();
  for (std::uint32_t i = 0; i < registers_.size(); i += 1u) registers.set(i, registers_[i]);
  snapshot.set("registers", registers);
  val cop0 = val::array();
  for (std::uint32_t i = 0; i < cop0_.size(); i += 1u) cop0.set(i, cop0_[i]);
  snapshot.set("cop0", cop0);
  val cop1 = val::array();
  for (std::uint32_t i = 0; i < cop1_.size(); i += 1u) cop1.set(i, cop1_[i]);
  snapshot.set("cop1", cop1);
  val flags = val::array();
  for (std::uint32_t i = 0; i < fpuFlags_.size(); i += 1u) flags.set(i, fpuFlags_[i]);
  snapshot.set("fpuFlags", flags);

  val memoryWords = val::array();
  std::uint32_t wordIndex = 0;
  for (const auto& entry : memoryWords_) {
    val pair = val::array();
    pair.set(0u, entry.first);
    pair.set(1u, entry.second);
    memoryWords.set(wordIndex++, pair);
  }
  snapshot.set("memoryWords", memoryWords);

  val memoryMap = val::object();
  memoryMap.set("textBase", memoryMap_.textBase);
  memoryMap.set("externBase", memoryMap_.externBase);
  memoryMap.set("dataBase", memoryMap_.dataBase);
  memoryMap.set("dataSegmentBase", memoryMap_.dataSegmentBase);
  memoryMap.set("heapBase", memoryMap_.heapBase);
  memoryMap.set("stackBase", memoryMap_.stackBase);
  memoryMap.set("stackPointer", memoryMap_.stackPointer);
  memoryMap.set("globalPointer", memoryMap_.globalPointer);
  memoryMap.set("kernelBase", memoryMap_.kernelBase);
  memoryMap.set("kernelTextBase", memoryMap_.kernelTextBase);
  memoryMap.set("kernelDataBase", memoryMap_.kernelDataBase);
  memoryMap.set("exceptionHandlerAddress", memoryMap_.exceptionHandlerAddress);
  snapshot.set("memoryMap", memoryMap);

  if (includeProgram) {
    val plan = val::array();
    for (std::uint32_t i = 0; i < programRows_.size(); i += 1u) {
      const auto& row = programRows_[i];
      val item = val::object();
      item.set("address", row.address);
      item.set("line", row.line);
      item.set("basic", row.basic);
      item.set("opcode", row.opcodeName);
      item.set("rd", row.rd);
      item.set("rs", row.rs);
      item.set("rt", row.rt);
      item.set("fs", row.fs);
      item.set("ft", row.ft);
      item.set("base", row.base);
      item.set("immediate", row.immediate);
      item.set("target", row.target);
      item.set("absolute", row.absolute);
      item.set("cc", row.cc);
      item.set("delegate", row.delegate);
      item.set("delegateReason", row.delegateReason);
      plan.set(i, item);
    }
    snapshot.set("executionPlan", plan);
  }

  if (includeBreakpoints) {
    val breakpoints = val::array();
    std::uint32_t index = 0;
    for (const auto address : breakpoints_) breakpoints.set(index++, address);
    snapshot.set("breakpoints", breakpoints);
  }

  return snapshot;
}

val NativeMarsEngine::exportRuntimeState(bool includeBreakpoints) {
  val snapshot = val::object();
  snapshot.set("assembled", assembled_);
  snapshot.set("halted", halted_);
  snapshot.set("pc", pc_);
  snapshot.set("steps", steps_);
  snapshot.set("heapPointer", heapPointer_);
  snapshot.set("delayedBranchTarget", delayedBranchTarget_ >= 0 ? val(static_cast<double>(static_cast<std::uint32_t>(delayedBranchTarget_))) : val::null());
  snapshot.set("lastMemoryWriteAddress", lastMemoryWriteAddress_ >= 0 ? val(static_cast<double>(static_cast<std::uint32_t>(lastMemoryWriteAddress_))) : val::null());
  if (lastMemoryWriteAddress_ >= 0) {
    const auto lastWriteAddress = static_cast<std::uint32_t>(lastMemoryWriteAddress_);
    const auto lastWriteValueIt = memoryWords_.find(lastWriteAddress);
    const auto lastWriteValue = lastWriteValueIt == memoryWords_.end() ? 0 : lastWriteValueIt->second;
    snapshot.set("lastMemoryWriteValue", lastWriteValue);
  } else {
    snapshot.set("lastMemoryWriteValue", val::null());
  }
  snapshot.set("memoryUsageBytes", memoryBytesUsed_);
  snapshot.set("maxMemoryBytes", settings_.maxMemoryBytes);
  snapshot.set("backstepDepth", static_cast<std::uint32_t>(executionHistory_.size()));
  snapshot.set("backstepHistoryBytes", executionHistoryBytes_);
  snapshot.set("backstepHistoryBudgetBytes", getBackstepHistoryBudgetBytes());

  val registers = val::array();
  for (std::uint32_t i = 0; i < registers_.size(); i += 1u) registers.set(i, registers_[i]);
  snapshot.set("registers", registers);
  val cop0 = val::array();
  for (std::uint32_t i = 0; i < cop0_.size(); i += 1u) cop0.set(i, cop0_[i]);
  snapshot.set("cop0", cop0);
  val cop1 = val::array();
  for (std::uint32_t i = 0; i < cop1_.size(); i += 1u) cop1.set(i, cop1_[i]);
  snapshot.set("cop1", cop1);
  val flags = val::array();
  for (std::uint32_t i = 0; i < fpuFlags_.size(); i += 1u) flags.set(i, fpuFlags_[i]);
  snapshot.set("fpuFlags", flags);

  val memoryDelta = val::array();
  std::uint32_t deltaIndex = 0;
  for (const auto address : dirtyWordAddresses_) {
    const auto entry = memoryWords_.find(address);
    const auto value = entry == memoryWords_.end() ? 0 : entry->second;
    val pair = val::array();
    pair.set(0u, address);
    pair.set(1u, value);
    memoryDelta.set(deltaIndex++, pair);
  }
  snapshot.set("memoryDelta", memoryDelta);
  dirtyWordAddresses_.clear();

  if (includeBreakpoints) {
    val breakpoints = val::array();
    std::uint32_t index = 0;
    for (const auto address : breakpoints_) breakpoints.set(index++, address);
    snapshot.set("breakpoints", breakpoints);
  }

  return snapshot;
}

HistoryEntry NativeMarsEngine::captureHistoryEntry() const {
  HistoryEntry entry;
  entry.pc = pc_;
  entry.steps = steps_;
  entry.halted = halted_;
  entry.registers = registers_;
  entry.cop0 = cop0_;
  entry.cop1 = cop1_;
  entry.fpuFlags = fpuFlags_;
  entry.heapPointer = heapPointer_;
  entry.delayedBranchTarget = delayedBranchTarget_;
  entry.lastMemoryWriteAddress = lastMemoryWriteAddress_;
  entry.estimatedBytes = HISTORY_BASE_ESTIMATE_BYTES;
  return entry;
}

void NativeMarsEngine::restoreHistoryEntry(const HistoryEntry& entry) {
  pc_ = entry.pc;
  steps_ = entry.steps;
  halted_ = entry.halted;
  registers_ = entry.registers;
  cop0_ = entry.cop0;
  cop1_ = entry.cop1;
  fpuFlags_ = entry.fpuFlags;
  heapPointer_ = entry.heapPointer;
  delayedBranchTarget_ = entry.delayedBranchTarget;
  lastMemoryWriteAddress_ = entry.lastMemoryWriteAddress;

  for (const auto& change : entry.memoryChanges) {
    const auto current = memoryWords_.find(change.first);
    if (current != memoryWords_.end()) {
      memoryBytesUsed_ -= count_non_zero_bytes(current->second);
      memoryWords_.erase(current);
    }
    if (change.second.existed && change.second.value != 0) {
      memoryWords_[change.first] = change.second.value;
      memoryBytesUsed_ += count_non_zero_bytes(change.second.value);
    }
    markDirtyWord(change.first);
  }

  forceZeroRegister();
}

std::uint32_t NativeMarsEngine::getBackstepHistoryBudgetBytes() const {
  if (settings_.maxBackstepHistoryBytes > 0) {
    return static_cast<std::uint32_t>(settings_.maxBackstepHistoryBytes);
  }
  if (settings_.maxMemoryBytes <= 0) {
    return BACKSTEP_HISTORY_BUDGET_CAP_BYTES;
  }
  const auto derived = static_cast<std::uint32_t>(settings_.maxMemoryBytes / static_cast<std::int32_t>(BACKSTEP_HISTORY_BUDGET_DIVISOR));
  return std::max(
    BACKSTEP_HISTORY_BUDGET_MIN_BYTES,
    std::min(BACKSTEP_HISTORY_BUDGET_CAP_BYTES, derived)
  );
}

void NativeMarsEngine::pushExecutionHistory(HistoryEntry entry) {
  if (settings_.maxBacksteps <= 0) {
    clearExecutionHistory();
    return;
  }

  entry.estimatedBytes = HISTORY_BASE_ESTIMATE_BYTES
    + static_cast<std::uint32_t>(entry.memoryChanges.size()) * BACKSTEP_MEMORY_CHANGE_ENTRY_ESTIMATE_BYTES;

  const auto budget = getBackstepHistoryBudgetBytes();
  while (
    !executionHistory_.empty()
    && (
      static_cast<std::int32_t>(executionHistory_.size()) >= settings_.maxBacksteps
      || (executionHistoryBytes_ + entry.estimatedBytes) > budget
    )
  ) {
    executionHistoryBytes_ -= executionHistory_.front().estimatedBytes;
    executionHistory_.pop_front();
  }

  executionHistoryBytes_ += entry.estimatedBytes;
  executionHistory_.push_back(std::move(entry));
}

void NativeMarsEngine::recordWordChange(std::uint32_t baseAddress) {
  if (!activeHistory_) return;
  if (activeHistory_->memoryChanges.find(baseAddress) != activeHistory_->memoryChanges.end()) return;
  const auto current = memoryWords_.find(baseAddress);
  if (current == memoryWords_.end()) {
    activeHistory_->memoryChanges.insert({ baseAddress, WordChange{ false, 0 } });
    return;
  }
  activeHistory_->memoryChanges.insert({ baseAddress, WordChange{ true, current->second } });
}

void NativeMarsEngine::markDirtyWord(std::uint32_t baseAddress) {
  dirtyWordAddresses_.insert(baseAddress);
}

void NativeMarsEngine::ensureMemoryCapacity(std::uint32_t additionalNonZeroBytes) const {
  if (additionalNonZeroBytes == 0 || settings_.maxMemoryBytes <= 0) return;
  if ((memoryBytesUsed_ + additionalNonZeroBytes) > static_cast<std::uint32_t>(settings_.maxMemoryBytes)) {
    throw std::runtime_error("Memory limit exceeded: {requested} bytes requested (limit {limit} bytes).");
  }
}

bool NativeMarsEngine::isTextAddress(std::uint32_t address) const {
  const auto userTextStart = memoryMap_.textBase;
  const auto userTextEnd = memoryMap_.dataSegmentBase != 0 ? memoryMap_.dataSegmentBase : memoryMap_.dataBase;
  const auto kernelTextStart = memoryMap_.kernelTextBase != 0 ? memoryMap_.kernelTextBase : memoryMap_.kernelBase;
  const auto kernelTextEnd = memoryMap_.kernelDataBase;
  const bool inUserText = address >= userTextStart && address < userTextEnd;
  const bool inKernelText = address >= kernelTextStart && address < kernelTextEnd;
  return inUserText || inKernelText;
}

void NativeMarsEngine::assertWritableAddress(std::uint32_t address, std::uint32_t byteLength) const {
  if (settings_.selfModifyingCode) return;
  const auto size = std::max<std::uint32_t>(1u, byteLength);
  for (std::uint32_t i = 0; i < size; i += 1u) {
    const auto current = address + i;
    if (isTextAddress(current)) {
      throw std::runtime_error("Self-modifying code is disabled for text segment writes ({address}).");
    }
  }
}

std::uint8_t NativeMarsEngine::getByte(std::uint32_t address) const {
  const auto base = address & ~0x3u;
  const auto entry = memoryWords_.find(base);
  const auto word = entry == memoryWords_.end() ? 0u : static_cast<std::uint32_t>(entry->second);
  return static_cast<std::uint8_t>(get_word_byte(word, address & 0x3u));
}

void NativeMarsEngine::setByte(std::uint32_t address, std::uint8_t value) {
  const auto addr = address;
  const auto base = addr & ~0x3u;
  const auto oldWordIt = memoryWords_.find(base);
  const auto oldWord = oldWordIt == memoryWords_.end() ? 0 : oldWordIt->second;
  const auto oldByte = getByte(addr);
  if (oldByte == value) return;

  const auto oldNonZero = oldByte != 0 ? 1u : 0u;
  const auto newNonZero = value != 0 ? 1u : 0u;
  if (newNonZero > oldNonZero) ensureMemoryCapacity(newNonZero - oldNonZero);

  recordWordChange(base);
  const auto newWord = set_word_byte(static_cast<std::uint32_t>(oldWord), addr & 0x3u, value);
  if (oldWordIt != memoryWords_.end()) {
    memoryBytesUsed_ -= count_non_zero_bytes(oldWordIt->second);
    memoryWords_.erase(oldWordIt);
  }
  if (newWord != 0) {
    memoryWords_[base] = newWord;
    memoryBytesUsed_ += count_non_zero_bytes(newWord);
  }
  lastMemoryWriteAddress_ = static_cast<std::int32_t>(base);
  markDirtyWord(base);
}

std::int32_t NativeMarsEngine::readByte(std::uint32_t address, bool signedRead) const {
  const auto value = getByte(address);
  return signedRead ? static_cast<std::int32_t>(static_cast<std::int8_t>(value)) : static_cast<std::int32_t>(value);
}

void NativeMarsEngine::writeByte(std::uint32_t address, std::int32_t value) {
  assertWritableAddress(address, 1u);
  setByte(address, static_cast<std::uint8_t>(value & 0xff));
}

std::int32_t NativeMarsEngine::readHalf(std::uint32_t address, bool signedRead) const {
  if ((address & 0x1u) != 0u) {
    throw std::runtime_error("Address not aligned on halfword boundary: {address}");
  }
  const auto value = static_cast<std::uint32_t>((getByte(address) << 8u) | getByte(address + 1u));
  return signedRead ? sign_extend16(static_cast<std::int32_t>(value)) : static_cast<std::int32_t>(value & 0xffffu);
}

void NativeMarsEngine::writeHalf(std::uint32_t address, std::int32_t value) {
  if ((address & 0x1u) != 0u) {
    throw std::runtime_error("Address not aligned on halfword boundary: {address}");
  }
  assertWritableAddress(address, 2u);
  const auto numeric = zero_extend16(value);
  setByte(address, static_cast<std::uint8_t>((numeric >> 8u) & 0xffu));
  setByte(address + 1u, static_cast<std::uint8_t>(numeric & 0xffu));
}

std::int32_t NativeMarsEngine::readWord(std::uint32_t address) const {
  if ((address & 0x3u) != 0u) {
    throw std::runtime_error("Address not aligned on word boundary: {address}");
  }
  const auto entry = memoryWords_.find(address);
  if (entry != memoryWords_.end()) return entry->second;
  return compose_word(getByte(address), getByte(address + 1u), getByte(address + 2u), getByte(address + 3u));
}

void NativeMarsEngine::writeWord(std::uint32_t address, std::int32_t value) {
  if ((address & 0x3u) != 0u) {
    throw std::runtime_error("Address not aligned on word boundary: {address}");
  }
  assertWritableAddress(address, 4u);
  const auto old = memoryWords_.find(address);
  const auto oldValue = old == memoryWords_.end() ? 0 : old->second;
  if (oldValue == value) return;

  const auto oldCount = count_non_zero_bytes(oldValue);
  const auto newCount = count_non_zero_bytes(value);
  if (newCount > oldCount) ensureMemoryCapacity(newCount - oldCount);

  recordWordChange(address);
  if (old != memoryWords_.end()) {
    memoryBytesUsed_ -= oldCount;
    memoryWords_.erase(old);
  }
  if (value != 0) {
    memoryWords_[address] = value;
    memoryBytesUsed_ += newCount;
  }
  lastMemoryWriteAddress_ = static_cast<std::int32_t>(address);
  markDirtyWord(address);
}

void NativeMarsEngine::forceZeroRegister() {
  registers_[0] = 0;
}

bool NativeMarsEngine::hasInstructionAt(std::uint32_t address) const {
  return programIndex_.find(address) != programIndex_.end();
}

std::uint32_t NativeMarsEngine::getMemoryUsageBytes() const {
  return memoryBytesUsed_;
}

bool NativeMarsEngine::toggleBreakpoint(std::uint32_t address) {
  const auto found = breakpoints_.find(address);
  if (found != breakpoints_.end()) {
    breakpoints_.erase(found);
    return false;
  }
  breakpoints_.insert(address);
  return true;
}

void NativeMarsEngine::trimExecutionHistory() {
  const auto budget = getBackstepHistoryBudgetBytes();
  while (
    executionHistory_.size() > 1u
    && (
      static_cast<std::int32_t>(executionHistory_.size()) > settings_.maxBacksteps
      || executionHistoryBytes_ > budget
    )
  ) {
    executionHistoryBytes_ -= executionHistory_.front().estimatedBytes;
    executionHistory_.pop_front();
  }
}

val NativeMarsEngine::toResultVal(const StepResult& result) const {
  val object = val::object();
  object.set("ok", result.ok);
  object.set("done", result.done);
  object.set("exception", result.exception);
  object.set("stoppedOnBreakpoint", result.stoppedOnBreakpoint);
  object.set("waitingForInput", result.waitForInput);
  object.set("runIo", result.runIo);
  object.set("sleepMs", result.sleepMs);
  object.set("delegate", result.delegate);
  if (!result.haltReason.empty()) object.set("haltReason", result.haltReason);
  if (!result.delegateReason.empty()) object.set("delegateReason", result.delegateReason);
  if (!result.opcode.empty()) object.set("opcode", result.opcode);
  if (!result.messageKey.empty()) {
    object.set("messageKey", result.messageKey);
    val args = val::object();
    if (result.hasMessageAddress) args.set("address", result.messageAddress);
    if (result.hasMessageLine) args.set("line", result.messageLine);
    if (result.hasMessageCode) args.set("code", result.messageCode);
    object.set("messageArgs", args);
  }
  return object;
}

StepResult NativeMarsEngine::raiseException(std::int32_t cause, const std::string& messageKey, bool hasBadAddress, std::uint32_t badAddress) {
  const auto code = cause & 0x1f;
  const auto preserved = static_cast<std::uint32_t>(cop0_[COP0_CAUSE]) & 0x7ffffc83u;
  cop0_[COP0_CAUSE] = clamp32(preserved | (static_cast<std::uint32_t>(code) << 2u));
  if (hasBadAddress) {
    cop0_[COP0_VADDR] = clamp32(badAddress);
  }
  cop0_[COP0_EPC] = clamp32(pc_);
  cop0_[COP0_STATUS] |= (1 << 1);

  StepResult result;
  result.exception = true;
  result.messageKey = messageKey.empty() ? "exception {code}" : messageKey;
  if (messageKey.empty()) {
    result.hasMessageCode = true;
    result.messageCode = code;
  }
  if (hasInstructionAt(memoryMap_.exceptionHandlerAddress)) {
    result.hasNextPc = true;
    result.nextPc = memoryMap_.exceptionHandlerAddress;
    return result;
  }

  result.halt = true;
  return result;
}

StepResult NativeMarsEngine::executeInstruction(const ProgramRow& row) {
  StepResult result;
  if (row.delegate) {
    result.delegate = true;
    result.delegateReason = row.delegateReason.empty() ? "unsupported" : row.delegateReason;
    result.opcode = row.opcodeName;
    return result;
  }

  const auto nextPc = pc_ + 4u;
  const auto reg = [&](std::int32_t index) -> std::int32_t& { return registers_[static_cast<std::size_t>(index)]; };
  const auto cop1 = [&](std::int32_t index) -> std::int32_t& { return cop1_[static_cast<std::size_t>(index)]; };
  const auto resolveAddress = [&]() -> std::uint32_t {
    if (row.base >= 0) {
      return static_cast<std::uint32_t>((registers_[static_cast<std::size_t>(row.base)] | 0) + row.immediate);
    }
    return row.absolute;
  };
  const auto getHiLoUnsigned = [&]() -> std::uint64_t {
    return (static_cast<std::uint64_t>(static_cast<std::uint32_t>(registers_[32])) << 32u)
      | static_cast<std::uint64_t>(static_cast<std::uint32_t>(registers_[33]));
  };
  const auto setHiLoUnsigned = [&](std::uint64_t value) {
    registers_[32] = clamp32(static_cast<std::uint32_t>((value >> 32u) & 0xffffffffu));
    registers_[33] = clamp32(static_cast<std::uint32_t>(value & 0xffffffffu));
  };
  const auto setHiLoSigned = [&](std::int64_t value) {
    const auto numeric = static_cast<std::uint64_t>(value);
    registers_[32] = clamp32(static_cast<std::uint32_t>((numeric >> 32u) & 0xffffffffu));
    registers_[33] = clamp32(static_cast<std::uint32_t>(numeric & 0xffffffffu));
  };

  switch (row.op) {
    case Opcode::Nop:
      forceZeroRegister();
      return result;
    case Opcode::Eret:
      cop0_[COP0_STATUS] &= ~(1 << 1);
      forceZeroRegister();
      result.hasNextPc = true;
      result.nextPc = static_cast<std::uint32_t>(cop0_[COP0_EPC]);
      result.noDelay = true;
      return result;
    case Opcode::Break: {
      auto ex = raiseException(BREAKPOINT, "break instruction executed; code = {code}");
      ex.hasMessageCode = true;
      ex.messageCode = row.immediate;
      return ex;
    }
    case Opcode::Teq:
    case Opcode::Tne:
    case Opcode::Tge:
    case Opcode::Tgeu:
    case Opcode::Tlt:
    case Opcode::Tltu: {
      const auto a = reg(row.rs);
      const auto b = reg(row.rt);
      bool trap = false;
      if (row.op == Opcode::Teq) trap = a == b;
      else if (row.op == Opcode::Tne) trap = a != b;
      else if (row.op == Opcode::Tge) trap = a >= b;
      else if (row.op == Opcode::Tgeu) trap = static_cast<std::uint32_t>(a) >= static_cast<std::uint32_t>(b);
      else if (row.op == Opcode::Tlt) trap = a < b;
      else trap = static_cast<std::uint32_t>(a) < static_cast<std::uint32_t>(b);
      if (trap) return raiseException(TRAP, "trap");
      forceZeroRegister();
      return result;
    }
    case Opcode::Teqi:
    case Opcode::Tnei:
    case Opcode::Tgei:
    case Opcode::Tgeiu:
    case Opcode::Tlti:
    case Opcode::Tltiu: {
      const auto a = reg(row.rs);
      const auto b = sign_extend16(row.immediate);
      bool trap = false;
      if (row.op == Opcode::Teqi) trap = a == b;
      else if (row.op == Opcode::Tnei) trap = a != b;
      else if (row.op == Opcode::Tgei) trap = a >= b;
      else if (row.op == Opcode::Tgeiu) trap = static_cast<std::uint32_t>(a) >= static_cast<std::uint32_t>(b);
      else if (row.op == Opcode::Tlti) trap = a < b;
      else trap = static_cast<std::uint32_t>(a) < static_cast<std::uint32_t>(b);
      if (trap) return raiseException(TRAP, "trap");
      forceZeroRegister();
      return result;
    }
    case Opcode::Add:
    case Opcode::Addu:
    case Opcode::Sub:
    case Opcode::Subu:
    case Opcode::And:
    case Opcode::Or:
    case Opcode::Xor:
    case Opcode::Nor:
    case Opcode::Slt:
    case Opcode::Sltu:
    case Opcode::Mul:
    case Opcode::Movn:
    case Opcode::Movz: {
      const auto a = reg(row.rs);
      const auto b = reg(row.rt);
      if (row.op == Opcode::Add) {
        if (add_overflow(a, b)) return raiseException(OVERFLOW, "arithmetic overflow");
        reg(row.rd) = add32(a, b);
      } else if (row.op == Opcode::Addu) reg(row.rd) = add32(a, b);
      else if (row.op == Opcode::Sub) {
        if (sub_overflow(a, b)) return raiseException(OVERFLOW, "arithmetic overflow");
        reg(row.rd) = sub32(a, b);
      } else if (row.op == Opcode::Subu) reg(row.rd) = sub32(a, b);
      else if (row.op == Opcode::And) reg(row.rd) = a & b;
      else if (row.op == Opcode::Or) reg(row.rd) = a | b;
      else if (row.op == Opcode::Xor) reg(row.rd) = a ^ b;
      else if (row.op == Opcode::Nor) reg(row.rd) = ~(a | b);
      else if (row.op == Opcode::Slt) reg(row.rd) = a < b ? 1 : 0;
      else if (row.op == Opcode::Sltu) reg(row.rd) = static_cast<std::uint32_t>(a) < static_cast<std::uint32_t>(b) ? 1 : 0;
      else if (row.op == Opcode::Mul) {
        const auto product = static_cast<std::int64_t>(a) * static_cast<std::int64_t>(b);
        registers_[32] = clamp32(static_cast<std::uint32_t>((static_cast<std::uint64_t>(product) >> 32u) & 0xffffffffu));
        registers_[33] = clamp32(static_cast<std::uint32_t>(static_cast<std::uint64_t>(product) & 0xffffffffu));
        reg(row.rd) = registers_[33];
      } else if (row.op == Opcode::Movn) {
        if (b != 0) reg(row.rd) = a;
      } else if (b == 0) {
        reg(row.rd) = a;
      }
      forceZeroRegister();
      return result;
    }
    case Opcode::Clz:
    case Opcode::Clo: {
      const auto value = static_cast<std::uint32_t>(reg(row.rs));
      reg(row.rd) = row.op == Opcode::Clz ? (value == 0u ? 32 : __builtin_clz(value)) : (value == 0xffffffffu ? 32 : __builtin_clz(~value));
      forceZeroRegister();
      return result;
    }
    case Opcode::Addi:
    case Opcode::Addiu:
    case Opcode::Andi:
    case Opcode::Ori:
    case Opcode::Xori:
    case Opcode::Slti:
    case Opcode::Sltiu: {
      const auto a = reg(row.rs);
      const auto s16 = sign_extend16(row.immediate);
      if (row.op == Opcode::Addi) {
        if (add_overflow(a, s16)) return raiseException(OVERFLOW, "arithmetic overflow");
        reg(row.rt) = add32(a, s16);
      } else if (row.op == Opcode::Addiu) reg(row.rt) = add32(a, s16);
      else if (row.op == Opcode::Andi) reg(row.rt) = a & static_cast<std::int32_t>(zero_extend16(row.immediate));
      else if (row.op == Opcode::Ori) reg(row.rt) = a | static_cast<std::int32_t>(zero_extend16(row.immediate));
      else if (row.op == Opcode::Xori) reg(row.rt) = a ^ static_cast<std::int32_t>(zero_extend16(row.immediate));
      else if (row.op == Opcode::Slti) reg(row.rt) = a < s16 ? 1 : 0;
      else reg(row.rt) = static_cast<std::uint32_t>(a) < static_cast<std::uint32_t>(s16) ? 1 : 0;
      forceZeroRegister();
      return result;
    }
    case Opcode::Lui:
      reg(row.rt) = clamp32(zero_extend16(row.immediate) << 16u);
      forceZeroRegister();
      return result;
    case Opcode::Sll:
    case Opcode::Srl:
    case Opcode::Sra: {
      const auto amount = static_cast<std::uint32_t>(row.immediate) & 0x1fu;
      if (row.op == Opcode::Sll) reg(row.rd) = clamp32(static_cast<std::uint32_t>(reg(row.rt)) << amount);
      else if (row.op == Opcode::Srl) reg(row.rd) = clamp32(static_cast<std::uint32_t>(reg(row.rt)) >> amount);
      else reg(row.rd) = reg(row.rt) >> amount;
      forceZeroRegister();
      return result;
    }
    case Opcode::Sllv:
    case Opcode::Srlv:
    case Opcode::Srav: {
      const auto amount = static_cast<std::uint32_t>(reg(row.rs)) & 0x1fu;
      if (row.op == Opcode::Sllv) reg(row.rd) = clamp32(static_cast<std::uint32_t>(reg(row.rt)) << amount);
      else if (row.op == Opcode::Srlv) reg(row.rd) = clamp32(static_cast<std::uint32_t>(reg(row.rt)) >> amount);
      else reg(row.rd) = reg(row.rt) >> amount;
      forceZeroRegister();
      return result;
    }
    case Opcode::Mult:
    case Opcode::Multu:
    case Opcode::Div:
    case Opcode::Divu:
    case Opcode::Madd:
    case Opcode::Maddu:
    case Opcode::Msub:
    case Opcode::Msubu: {
      const auto a = reg(row.rs);
      const auto b = reg(row.rt);
      if (row.op == Opcode::Mult || row.op == Opcode::Multu) {
        if (row.op == Opcode::Mult) setHiLoSigned(static_cast<std::int64_t>(a) * static_cast<std::int64_t>(b));
        else setHiLoUnsigned(static_cast<std::uint64_t>(static_cast<std::uint32_t>(a)) * static_cast<std::uint64_t>(static_cast<std::uint32_t>(b)));
      } else if (row.op == Opcode::Div || row.op == Opcode::Divu) {
        if (b != 0) {
          if (row.op == Opcode::Div) {
            if (a == std::numeric_limits<std::int32_t>::min() && b == -1) {
              registers_[33] = std::numeric_limits<std::int32_t>::min();
              registers_[32] = 0;
            } else {
              registers_[33] = a / b;
              registers_[32] = a % b;
            }
          } else {
            const auto ua = static_cast<std::uint32_t>(a);
            const auto ub = static_cast<std::uint32_t>(b);
            registers_[33] = clamp32(ua / ub);
            registers_[32] = clamp32(ua % ub);
          }
        }
      } else {
        const auto currentUnsigned = getHiLoUnsigned();
        if (row.op == Opcode::Madd || row.op == Opcode::Msub) {
          const auto current = static_cast<std::int64_t>(currentUnsigned);
          const auto product = static_cast<std::int64_t>(a) * static_cast<std::int64_t>(b);
          setHiLoSigned(row.op == Opcode::Madd ? (current + product) : (current - product));
        } else {
          const auto product = static_cast<std::uint64_t>(static_cast<std::uint32_t>(a)) * static_cast<std::uint64_t>(static_cast<std::uint32_t>(b));
          setHiLoUnsigned(row.op == Opcode::Maddu ? (currentUnsigned + product) : (currentUnsigned - product));
        }
      }
      forceZeroRegister();
      return result;
    }
    case Opcode::Mfhi:
    case Opcode::Mflo:
    case Opcode::Mthi:
    case Opcode::Mtlo:
      if (row.op == Opcode::Mfhi) reg(row.rd) = registers_[32];
      else if (row.op == Opcode::Mflo) reg(row.rd) = registers_[33];
      else if (row.op == Opcode::Mthi) registers_[32] = reg(row.rd);
      else registers_[33] = reg(row.rd);
      forceZeroRegister();
      return result;
    case Opcode::Mfc0:
    case Opcode::Mtc0:
      if (row.op == Opcode::Mfc0) reg(row.rt) = cop0_[static_cast<std::size_t>(row.rd)];
      else cop0_[static_cast<std::size_t>(row.rd)] = reg(row.rt);
      forceZeroRegister();
      return result;
    case Opcode::Mfc1:
    case Opcode::Mtc1:
      if (row.op == Opcode::Mfc1) reg(row.rt) = cop1_[static_cast<std::size_t>(row.fs)];
      else cop1_[static_cast<std::size_t>(row.fs)] = reg(row.rt);
      forceZeroRegister();
      return result;
    case Opcode::Lw:
    case Opcode::Sw:
    case Opcode::Lb:
    case Opcode::Lbu:
    case Opcode::Sb:
    case Opcode::Lh:
    case Opcode::Lhu:
    case Opcode::Sh:
    case Opcode::Ll:
    case Opcode::Sc:
    case Opcode::Lwl:
    case Opcode::Lwr:
    case Opcode::Swl:
    case Opcode::Swr:
    case Opcode::Lwc1:
    case Opcode::Swc1: {
      const auto addr = resolveAddress();
      try {
        if (row.op == Opcode::Lw || row.op == Opcode::Ll) reg(row.rt) = readWord(addr);
        else if (row.op == Opcode::Sw) writeWord(addr, reg(row.rt));
        else if (row.op == Opcode::Lb) reg(row.rt) = readByte(addr, true);
        else if (row.op == Opcode::Lbu) reg(row.rt) = readByte(addr, false);
        else if (row.op == Opcode::Sb) writeByte(addr, reg(row.rt));
        else if (row.op == Opcode::Lh) reg(row.rt) = readHalf(addr, true);
        else if (row.op == Opcode::Lhu) reg(row.rt) = readHalf(addr, false);
        else if (row.op == Opcode::Sh) writeHalf(addr, reg(row.rt));
        else if (row.op == Opcode::Sc) { writeWord(addr, reg(row.rt)); reg(row.rt) = 1; }
        else if (row.op == Opcode::Lwl) {
          auto merged = reg(row.rt);
          for (std::uint32_t i = 0; i <= (addr % 4u); i += 1u) merged = set_word_byte(static_cast<std::uint32_t>(merged), 3u - i, getByte(addr - i));
          reg(row.rt) = merged;
        } else if (row.op == Opcode::Lwr) {
          auto merged = reg(row.rt);
          for (std::uint32_t i = 0; i <= (3u - (addr % 4u)); i += 1u) merged = set_word_byte(static_cast<std::uint32_t>(merged), i, getByte(addr + i));
          reg(row.rt) = merged;
        } else if (row.op == Opcode::Swl) {
          const auto source = static_cast<std::uint32_t>(reg(row.rt));
          for (std::uint32_t i = 0; i <= (addr % 4u); i += 1u) writeByte(addr - i, static_cast<std::int32_t>(get_word_byte(source, 3u - i)));
        } else if (row.op == Opcode::Swr) {
          const auto source = static_cast<std::uint32_t>(reg(row.rt));
          for (std::uint32_t i = 0; i <= (3u - (addr % 4u)); i += 1u) writeByte(addr + i, static_cast<std::int32_t>(get_word_byte(source, i)));
        } else if (row.op == Opcode::Lwc1) cop1(row.fs) = readWord(addr);
        else writeWord(addr, cop1(row.fs));
      } catch (const std::runtime_error& error) {
        const bool writeOp =
          row.op == Opcode::Sw || row.op == Opcode::Sb || row.op == Opcode::Sh || row.op == Opcode::Sc
          || row.op == Opcode::Swl || row.op == Opcode::Swr || row.op == Opcode::Swc1;
        auto ex = raiseException(writeOp ? ADDRESS_STORE : ADDRESS_LOAD, error.what(), true, addr);
        ex.hasMessageAddress = true;
        ex.messageAddress = addr;
        return ex;
      }
      forceZeroRegister();
      return result;
    }
    case Opcode::Beq:
    case Opcode::Bne:
      if ((row.op == Opcode::Beq && reg(row.rs) == reg(row.rt)) || (row.op == Opcode::Bne && reg(row.rs) != reg(row.rt))) {
        result.hasNextPc = true;
        result.nextPc = row.target;
      }
      return result;
    case Opcode::Bgtz:
    case Opcode::Blez:
    case Opcode::Bltz:
    case Opcode::Bgez:
    case Opcode::Bgezal:
    case Opcode::Bltzal: {
      const auto value = reg(row.rs);
      bool take = false;
      if (row.op == Opcode::Bgtz) take = value > 0;
      else if (row.op == Opcode::Blez) take = value <= 0;
      else if (row.op == Opcode::Bltz || row.op == Opcode::Bltzal) take = value < 0;
      else take = value >= 0;
      if (take) {
        if (row.op == Opcode::Bgezal || row.op == Opcode::Bltzal) registers_[31] = clamp32(nextPc);
        forceZeroRegister();
        result.hasNextPc = true;
        result.nextPc = row.target;
      }
      return result;
    }
    case Opcode::Bc1f:
    case Opcode::Bc1t: {
      const auto flag = fpuFlags_[static_cast<std::size_t>(row.cc & 0x7)];
      if ((row.op == Opcode::Bc1t && flag == 1u) || (row.op == Opcode::Bc1f && flag == 0u)) {
        result.hasNextPc = true;
        result.nextPc = row.target;
      }
      return result;
    }
    case Opcode::J:
    case Opcode::Jal:
      if (row.op == Opcode::Jal) registers_[31] = clamp32(nextPc);
      forceZeroRegister();
      result.hasNextPc = true;
      result.nextPc = row.target;
      return result;
    case Opcode::Jr:
    case Opcode::Jalr:
      if (row.op == Opcode::Jalr && row.rd >= 0) reg(row.rd) = clamp32(nextPc);
      forceZeroRegister();
      result.hasNextPc = true;
      result.nextPc = static_cast<std::uint32_t>(reg(row.rs));
      return result;
    case Opcode::Movf:
    case Opcode::Movt: {
      const auto flag = fpuFlags_[static_cast<std::size_t>(row.cc & 0x7)];
      const bool take = row.op == Opcode::Movt ? flag == 1u : flag == 0u;
      if (take) reg(row.rd) = reg(row.rs);
      forceZeroRegister();
      return result;
    }
    case Opcode::Delegate:
    default:
      result.delegate = true;
      result.delegateReason = "unsupported";
      result.opcode = row.opcodeName;
      return result;
  }
}

StepResult NativeMarsEngine::stepInternal() {
  if (!assembled_) {
    StepResult result;
    result.ok = false;
    result.messageKey = "Program is not assembled.";
    return result;
  }

  if (halted_) {
    StepResult result;
    result.done = true;
    result.messageKey = "Program already halted.";
    return result;
  }

  if (breakpoints_.find(pc_) != breakpoints_.end()) {
    StepResult result;
    result.stoppedOnBreakpoint = true;
    result.hasMessageAddress = true;
    result.messageAddress = pc_;
    result.messageKey = "Breakpoint hit at {address}.";
    return result;
  }

  const auto rowIt = programIndex_.find(pc_);
  if (rowIt == programIndex_.end()) {
    halted_ = true;
    StepResult result;
    result.done = true;
    result.haltReason = "cliff";
    result.messageKey = "Program completed.";
    return result;
  }

  HistoryEntry history;
  bool captureHistory = settings_.maxBacksteps > 0 && getBackstepHistoryBudgetBytes() > 0u;
  if (captureHistory) {
    history = captureHistoryEntry();
    activeHistory_ = &history;
  } else {
    activeHistory_ = nullptr;
  }

  lastMemoryWriteAddress_ = -1;
  const auto& row = programRows_[rowIt->second];
  StepResult result;
  try {
    result = executeInstruction(row);
  } catch (const std::exception& error) {
    result = raiseException(RESERVED, error.what());
  }
  activeHistory_ = nullptr;

  if (result.delegate) {
    result.opcode = row.opcodeName;
    return result;
  }

  if (captureHistory) {
    history.estimatedBytes = HISTORY_BASE_ESTIMATE_BYTES
      + static_cast<std::uint32_t>(history.memoryChanges.size()) * BACKSTEP_MEMORY_CHANGE_ENTRY_ESTIMATE_BYTES;
    pushExecutionHistory(std::move(history));
  }

  steps_ += 1;
  const auto sequentialPc = pc_ + 4u;
  const auto pendingBranchTarget = delayedBranchTarget_ >= 0 ? static_cast<std::uint32_t>(delayedBranchTarget_) : 0u;
  const bool hasPendingBranch = delayedBranchTarget_ >= 0;
  std::uint32_t resolvedNextPc = sequentialPc;

  if (result.exception && settings_.delayedBranching && hasPendingBranch) {
    cop0_[COP0_CAUSE] = clamp32(static_cast<std::uint32_t>(cop0_[COP0_CAUSE]) | 0x80000000u);
    cop0_[COP0_EPC] = clamp32(pc_ - 4u);
  }

  if (result.exception || result.noDelay) {
    delayedBranchTarget_ = -1;
    if (result.hasNextPc) resolvedNextPc = result.nextPc;
  } else if (settings_.delayedBranching) {
    resolvedNextPc = hasPendingBranch ? pendingBranchTarget : sequentialPc;
    delayedBranchTarget_ = -1;
    if (result.hasNextPc) {
      if (has_delay_slot(row.op)) {
        if (!hasPendingBranch) resolvedNextPc = sequentialPc;
        delayedBranchTarget_ = static_cast<std::int32_t>(result.nextPc);
      } else {
        resolvedNextPc = result.nextPc;
      }
    }
  } else {
    delayedBranchTarget_ = -1;
    if (result.hasNextPc) resolvedNextPc = result.nextPc;
  }

  pc_ = resolvedNextPc;
  if (result.halt) halted_ = true;
  if (!hasInstructionAt(pc_) && !halted_) halted_ = true;

  result.done = halted_;
  if (result.messageKey.empty()) {
    result.messageKey = "Executed line {line}.";
    result.hasMessageLine = true;
    result.messageLine = row.line;
  }
  return result;
}

val NativeMarsEngine::step() {
  return toResultVal(stepInternal());
}

val NativeMarsEngine::go(std::int32_t maxSteps) {
  StepResult lastResult;
  bool hasLastResult = false;
  std::int32_t executed = 0;
  while (executed < maxSteps) {
    const auto stepsBefore = steps_;
    lastResult = stepInternal();
    hasLastResult = true;
    const bool instructionExecuted = steps_ != stepsBefore;
    const bool stopNow =
      !lastResult.ok
      || lastResult.delegate
      || lastResult.stoppedOnBreakpoint
      || lastResult.done
      || lastResult.waitForInput;
    if (stopNow) {
      auto output = toResultVal(lastResult);
      output.set("stepsExecuted", executed + (instructionExecuted ? 1 : 0));
      return output;
    }
    if (instructionExecuted) executed += 1;
  }
  auto output = toResultVal(hasLastResult ? lastResult : StepResult());
  output.set("stepsExecuted", executed);
  return output;
}

val NativeMarsEngine::backstep() {
  if (executionHistory_.empty()) {
    StepResult result;
    result.ok = false;
    result.messageKey = "No backstep history available.";
    return toResultVal(result);
  }

  auto previous = executionHistory_.back();
  executionHistoryBytes_ -= previous.estimatedBytes;
  executionHistory_.pop_back();
  restoreHistoryEntry(previous);

  StepResult result;
  result.messageKey = "Returned to {address}.";
  result.hasMessageAddress = true;
  result.messageAddress = pc_;
  return toResultVal(result);
}

val NativeMarsEngine::stop() {
  if (!assembled_) {
    StepResult result;
    result.ok = false;
    result.messageKey = "Program is not assembled.";
    return toResultVal(result);
  }
  halted_ = true;
  StepResult result;
  result.done = true;
  result.haltReason = "user";
  result.messageKey = "Execution stopped.";
  return toResultVal(result);
}

EMSCRIPTEN_BINDINGS(webmars_native_engine) {
  emscripten::class_<NativeMarsEngine>("NativeMarsEngine")
    .constructor<>()
    .function("configure", &NativeMarsEngine::configure)
    .function("assemble", &NativeMarsEngine::assemble)
    .function("loadState", &NativeMarsEngine::loadState)
    .function("replaceStateFromHost", &NativeMarsEngine::replaceStateFromHost)
    .function("exportState", &NativeMarsEngine::exportState)
    .function("exportRuntimeState", &NativeMarsEngine::exportRuntimeState)
    .function("step", &NativeMarsEngine::step)
    .function("go", &NativeMarsEngine::go)
    .function("backstep", &NativeMarsEngine::backstep)
    .function("stop", &NativeMarsEngine::stop)
    .function("toggleBreakpoint", &NativeMarsEngine::toggleBreakpoint)
    .function("getMemoryUsageBytes", &NativeMarsEngine::getMemoryUsageBytes)
    .function("trimExecutionHistory", &NativeMarsEngine::trimExecutionHistory)
    .function("readByte", &NativeMarsEngine::hostReadByte)
    .function("writeByte", &NativeMarsEngine::hostWriteByte)
    .function("readWord", &NativeMarsEngine::hostReadWord)
    .function("writeWord", &NativeMarsEngine::hostWriteWord)
    .function("clear", &NativeMarsEngine::clear);
}

}  // namespace
