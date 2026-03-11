import mars.ErrorList;
import mars.ErrorMessage;
import mars.Globals;
import mars.MIPSprogram;
import mars.ProcessingException;
import mars.ProgramStatement;
import mars.Settings;
import mars.assembler.Symbol;
import mars.assembler.SymbolTable;
import mars.mips.hardware.Coprocessor0;
import mars.mips.hardware.Coprocessor1;
import mars.mips.hardware.Memory;
import mars.mips.hardware.MemoryConfiguration;
import mars.mips.hardware.MemoryConfigurations;
import mars.mips.hardware.Register;
import mars.mips.hardware.RegisterFile;
import mars.simulator.ProgramArgumentList;
import mars.util.Binary;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Differential runner for Java MARS 4.5 used by web/scripts/differential-mars-vs-web.mjs.
 *
 * Output is a compact JSON object written to stdout or --output path.
 */
public class MarsDifferentialRunner {
  private static final int DEFAULT_MAX_STEPS = 100000;

  private static final class Options {
    String sourcePath = "";
    String outputPath = "";
    String memoryConfiguration = "Default";
    String programArgumentsLine = "";
    String stdinText = "";
    boolean extendedAssembler = true;
    boolean warningsAreErrors = false;
    boolean delayedBranching = false;
    boolean startAtMain = false;
    boolean selfModifyingCode = false;
    boolean programArgumentsEnabled = false;
    int maxSteps = DEFAULT_MAX_STEPS;
    List<Integer> memoryAddresses = new ArrayList<Integer>();
  }

  private static final class MessageRecord {
    boolean warning;
    String file;
    int line;
    int column;
    String message;

    MessageRecord(boolean warning, String file, int line, int column, String message) {
      this.warning = warning;
      this.file = file == null ? "" : file;
      this.line = line;
      this.column = column;
      this.message = message == null ? "" : message;
    }
  }

  public static void main(String[] args) throws Exception {
    Options options = parseArgs(args);
    if (options.sourcePath.trim().isEmpty()) {
      throw new IllegalArgumentException("Missing --source <path> argument.");
    }

    String source = readUtf8(Paths.get(options.sourcePath));

    PrintStream originalOut = System.out;
    PrintStream originalErr = System.err;
    java.io.InputStream originalIn = System.in;
    ByteArrayOutputStream consoleCapture = new ByteArrayOutputStream();
    PrintStream captureOut = new PrintStream(consoleCapture, true, "UTF-8");
    String json;

    try {
      System.setProperty("java.awt.headless", "true");
      System.setOut(captureOut);
      System.setErr(captureOut);
      if (options.stdinText != null && options.stdinText.length() > 0) {
        System.setIn(new ByteArrayInputStream(options.stdinText.getBytes(StandardCharsets.UTF_8)));
      }

      json = runCase(options, source, consoleCapture);
    } finally {
      captureOut.flush();
      captureOut.close();
      System.setOut(originalOut);
      System.setErr(originalErr);
      System.setIn(originalIn);
    }

    if (options.outputPath != null && options.outputPath.trim().length() > 0) {
      Path outPath = Paths.get(options.outputPath);
      Path parent = outPath.getParent();
      if (parent != null) Files.createDirectories(parent);
      Files.write(outPath, json.getBytes(StandardCharsets.UTF_8));
    } else {
      originalOut.print(json);
    }
  }

  private static String runCase(Options options, String source, ByteArrayOutputStream consoleCapture) throws Exception {
    Globals.initialize(false);
    configureSettings(options);
    applyMemoryConfiguration(options.memoryConfiguration);
    resetMachineState();

    Path sourcePath = Paths.get(options.sourcePath);
    Path parent = sourcePath.toAbsolutePath().getParent();
    if (parent != null) {
      try {
        System.setProperty("user.dir", parent.toString());
      } catch (SecurityException ignored) {
        // Best-effort only.
      }
    }

    MIPSprogram program = new MIPSprogram();
    List<MessageRecord> warnings = new ArrayList<MessageRecord>();
    List<MessageRecord> errors = new ArrayList<MessageRecord>();
    List<MessageRecord> runtimeErrors = new ArrayList<MessageRecord>();
    boolean assembledOk = false;
    boolean runDone = false;
    boolean runAttempted = false;
    String runtimeExceptionMessage = "";

    ErrorList assembleMessages = null;
    try {
      program.readSource(options.sourcePath);
      program.tokenize();
      ArrayList<MIPSprogram> files = new ArrayList<MIPSprogram>();
      files.add(program);
      assembleMessages = program.assemble(files, options.extendedAssembler, options.warningsAreErrors);
      assembledOk = true;
    } catch (ProcessingException pe) {
      collectMessages(pe.errors(), warnings, errors);
    }

    if (assembleMessages != null) {
      collectMessages(assembleMessages, warnings, errors);
    }

    if (assembledOk) {
      runAttempted = true;
      try {
        if (options.programArgumentsEnabled) {
          ArrayList<String> argv = new ArrayList<String>(parseProgramArguments(options.programArgumentsLine));
          new ProgramArgumentList(argv).storeProgramArguments();
        }
        RegisterFile.initializeProgramCounter(options.startAtMain);
        runDone = program.simulate(options.maxSteps);
      } catch (ProcessingException pe) {
        collectMessages(pe.errors(), warnings, runtimeErrors);
        runtimeExceptionMessage = safeRuntimeMessage(pe);
      } catch (Exception ex) {
        runtimeExceptionMessage = ex.getMessage() == null ? ex.toString() : ex.getMessage();
      }
    }

    captureOutFlush(consoleCapture);
    String consoleOutput = new String(consoleCapture.toByteArray(), StandardCharsets.UTF_8);

    StringBuilder out = new StringBuilder(32768);
    out.append("{");
    appendKeyValue(out, "sourcePath", options.sourcePath); out.append(",");
    appendKeyValue(out, "memoryConfiguration", options.memoryConfiguration); out.append(",");
    appendKeyValue(out, "assembledOk", assembledOk); out.append(",");
    appendKeyValue(out, "runAttempted", runAttempted); out.append(",");
    appendKeyValue(out, "runDone", runDone); out.append(",");
    appendKeyValue(out, "runtimeExceptionMessage", runtimeExceptionMessage); out.append(",");
    appendKeyValue(out, "consoleOutput", consoleOutput); out.append(",");

    out.append("\"settings\":{");
    appendKeyValue(out, "extendedAssembler", options.extendedAssembler); out.append(",");
    appendKeyValue(out, "warningsAreErrors", options.warningsAreErrors); out.append(",");
    appendKeyValue(out, "delayedBranching", options.delayedBranching); out.append(",");
    appendKeyValue(out, "startAtMain", options.startAtMain); out.append(",");
    appendKeyValue(out, "selfModifyingCode", options.selfModifyingCode); out.append(",");
    appendKeyValue(out, "programArgumentsEnabled", options.programArgumentsEnabled); out.append(",");
    appendKeyValue(out, "programArgumentsLine", options.programArgumentsLine); out.append(",");
    appendKeyValue(out, "maxSteps", options.maxSteps);
    out.append("},");

    out.append("\"warnings\":");
    appendMessagesArray(out, warnings);
    out.append(",");
    out.append("\"errors\":");
    appendMessagesArray(out, errors);
    out.append(",");
    out.append("\"runtimeErrors\":");
    appendMessagesArray(out, runtimeErrors);
    out.append(",");

    out.append("\"machineCode\":");
    appendMachineCodeArray(out, program);
    out.append(",");
    out.append("\"labels\":");
    appendLabelsArray(out, program);
    out.append(",");
    out.append("\"finalState\":");
    appendFinalState(out, options.memoryAddresses);
    out.append(",");
    out.append("\"memoryMap\":");
    appendMemoryMap(out);
    out.append("}");
    return out.toString();
  }

  private static void configureSettings(Options options) {
    Settings settings = Globals.getSettings();
    settings.setBooleanSettingNonPersistent(Settings.DELAYED_BRANCHING_ENABLED, options.delayedBranching);
    settings.setBooleanSettingNonPersistent(Settings.WARNINGS_ARE_ERRORS, options.warningsAreErrors);
    settings.setBooleanSettingNonPersistent(Settings.START_AT_MAIN, options.startAtMain);
    settings.setBooleanSettingNonPersistent(Settings.SELF_MODIFYING_CODE_ENABLED, options.selfModifyingCode);
    settings.setBooleanSettingNonPersistent(Settings.PROGRAM_ARGUMENTS, options.programArgumentsEnabled);
  }

  private static void applyMemoryConfiguration(String configName) {
    MemoryConfiguration config = MemoryConfigurations.getConfigurationByName(configName);
    if (config != null) {
      MemoryConfigurations.setCurrentConfiguration(config);
    } else {
      MemoryConfigurations.setCurrentConfiguration(MemoryConfigurations.getDefaultConfiguration());
    }
  }

  private static void resetMachineState() {
    Globals.symbolTable.clear();
    Memory.getInstance().clear();
    RegisterFile.resetRegisters();
    Coprocessor0.resetRegisters();
    Coprocessor1.resetRegisters();
  }

  private static void collectMessages(ErrorList list, List<MessageRecord> warnings, List<MessageRecord> errors) {
    if (list == null) return;
    ArrayList<?> messages = list.getErrorMessages();
    if (messages == null) return;
    for (Object entry : messages) {
      if (!(entry instanceof ErrorMessage)) continue;
      ErrorMessage message = (ErrorMessage) entry;
      MessageRecord record = new MessageRecord(
        message.isWarning(),
        message.getFilename(),
        message.getLine(),
        message.getPosition(),
        message.getMessage()
      );
      if (record.warning) warnings.add(record);
      else errors.add(record);
    }
  }

  private static String safeRuntimeMessage(ProcessingException pe) {
    if (pe == null) return "";
    if (pe.errors() != null) {
      String report = pe.errors().generateErrorAndWarningReport();
      if (report != null && report.trim().length() > 0) return report.trim();
    }
    String message = pe.getMessage();
    return message == null ? "" : message;
  }

  private static void appendMachineCodeArray(StringBuilder out, MIPSprogram program) {
    out.append("[");
    if (program != null && program.getMachineList() != null) {
      ArrayList<?> machine = program.getMachineList();
      boolean first = true;
      for (Object entry : machine) {
        if (!(entry instanceof ProgramStatement)) continue;
        ProgramStatement ps = (ProgramStatement) entry;
        if (!first) out.append(",");
        first = false;
        out.append("{");
        appendKeyValue(out, "address", ps.getAddress() >>> 0); out.append(",");
        appendKeyValue(out, "addressHex", toHex(ps.getAddress())); out.append(",");
        appendKeyValue(out, "line", ps.getSourceLine()); out.append(",");
        appendKeyValue(out, "basic", ps.getBasicAssemblyStatement()); out.append(",");
        appendKeyValue(out, "machineCodeHex", toHex(ps.getBinaryStatement()));
        out.append("}");
      }
    }
    out.append("]");
  }

  private static void appendLabelsArray(StringBuilder out, MIPSprogram program) {
    out.append("[");
    List<Map<String, Object>> labels = new ArrayList<Map<String, Object>>();
    Set<String> dedupe = new LinkedHashSet<String>();

    addSymbols(labels, dedupe, Globals.symbolTable, "global");
    if (program != null) {
      addSymbols(labels, dedupe, program.getLocalSymbolTable(), "local");
    }

    boolean first = true;
    for (Map<String, Object> label : labels) {
      if (!first) out.append(",");
      first = false;
      out.append("{");
      appendKeyValue(out, "label", String.valueOf(label.get("label"))); out.append(",");
      appendKeyValue(out, "address", ((Integer) label.get("address")).intValue() >>> 0); out.append(",");
      appendKeyValue(out, "addressHex", toHex(((Integer) label.get("address")).intValue())); out.append(",");
      appendKeyValue(out, "scope", String.valueOf(label.get("scope"))); out.append(",");
      appendKeyValue(out, "segment", String.valueOf(label.get("segment")));
      out.append("}");
    }
    out.append("]");
  }

  private static void addSymbols(List<Map<String, Object>> out, Set<String> dedupe, SymbolTable table, String scope) {
    if (table == null) return;
    ArrayList<?> symbols = table.getAllSymbols();
    if (symbols == null) return;
    for (Object symbolObj : symbols) {
      if (!(symbolObj instanceof Symbol)) continue;
      Symbol symbol = (Symbol) symbolObj;
      String label = symbol.getName();
      int address = symbol.getAddress();
      String key = label + "@" + (address >>> 0);
      if (dedupe.contains(key)) continue;
      dedupe.add(key);
      Map<String, Object> entry = new LinkedHashMap<String, Object>();
      entry.put("label", label);
      entry.put("address", Integer.valueOf(address));
      entry.put("scope", scope);
      entry.put("segment", symbol.getType() ? "data" : "text");
      out.add(entry);
    }
  }

  private static void appendFinalState(StringBuilder out, List<Integer> memoryAddresses) {
    out.append("{");
    appendKeyValue(out, "pc", RegisterFile.getProgramCounter() >>> 0); out.append(",");
    appendKeyValue(out, "pcHex", toHex(RegisterFile.getProgramCounter())); out.append(",");
    appendKeyValue(out, "hi", RegisterFile.getValue(33)); out.append(",");
    appendKeyValue(out, "lo", RegisterFile.getValue(34)); out.append(",");

    out.append("\"registers\":");
    appendRegisterArray(out, RegisterFile.getRegisters(), true);
    out.append(",");
    out.append("\"cop0\":");
    appendRegisterArray(out, Coprocessor0.getRegisters(), false);
    out.append(",");
    out.append("\"cop1\":");
    appendRegisterArray(out, Coprocessor1.getRegisters(), false);
    out.append(",");

    out.append("\"fpuFlags\":[");
    int condition = Coprocessor1.getConditionFlags();
    for (int i = 0; i < 8; i += 1) {
      if (i > 0) out.append(",");
      out.append(((condition >>> i) & 1));
    }
    out.append("],");

    out.append("\"memoryBytes\":");
    appendMemoryBytes(out, memoryAddresses);
    out.append(",");

    out.append("\"memoryWords\":");
    appendMemoryWords(out, memoryAddresses);
    out.append("}");
  }

  private static void appendRegisterArray(StringBuilder out, Register[] registers, boolean includePc) {
    out.append("[");
    boolean first = true;

    if (includePc) {
      out.append("{");
      appendKeyValue(out, "name", "$pc"); out.append(",");
      appendKeyValue(out, "number", 32); out.append(",");
      appendKeyValue(out, "value", RegisterFile.getProgramCounter()); out.append(",");
      appendKeyValue(out, "valueHex", toHex(RegisterFile.getProgramCounter()));
      out.append("}");
      first = false;
    }

    if (registers != null) {
      for (Register register : registers) {
        if (register == null) continue;
        if (!first) out.append(",");
        first = false;
        out.append("{");
        appendKeyValue(out, "name", register.getName()); out.append(",");
        appendKeyValue(out, "number", register.getNumber()); out.append(",");
        appendKeyValue(out, "value", register.getValue()); out.append(",");
        appendKeyValue(out, "valueHex", toHex(register.getValue()));
        out.append("}");
      }
    }
    out.append("]");
  }

  private static void appendMemoryWords(StringBuilder out, List<Integer> addresses) {
    out.append("[");
    boolean first = true;
    for (Integer rawAddress : addresses) {
      if (rawAddress == null) continue;
      int address = rawAddress.intValue();
      if (!first) out.append(",");
      first = false;
      out.append("{");
      appendKeyValue(out, "address", address >>> 0); out.append(",");
      appendKeyValue(out, "addressHex", toHex(address));

      try {
        Integer value = Memory.getInstance().getRawWordOrNull(address);
        if (value == null) {
          out.append(",\"present\":false,\"value\":null,\"valueHex\":null");
        } else {
          out.append(",\"present\":true,");
          appendKeyValue(out, "value", value.intValue()); out.append(",");
          appendKeyValue(out, "valueHex", toHex(value.intValue()));
        }
      } catch (Exception ex) {
        out.append(",\"present\":false,\"value\":null,\"valueHex\":null,");
        appendKeyValue(out, "error", ex.getMessage() == null ? ex.toString() : ex.getMessage());
      }
      out.append("}");
    }
    out.append("]");
  }

  private static void appendMemoryBytes(StringBuilder out, List<Integer> addresses) {
    out.append("[");
    boolean first = true;
    Set<Integer> byteAddresses = new LinkedHashSet<Integer>();
    for (Integer rawAddress : addresses) {
      if (rawAddress == null) continue;
      int base = rawAddress.intValue();
      for (int i = 0; i < 4; i += 1) {
        byteAddresses.add(Integer.valueOf(base + i));
      }
    }

    for (Integer rawAddress : byteAddresses) {
      if (rawAddress == null) continue;
      int address = rawAddress.intValue();
      if (!first) out.append(",");
      first = false;
      out.append("{");
      appendKeyValue(out, "address", address >>> 0); out.append(",");
      appendKeyValue(out, "addressHex", toHex(address));
      try {
        int value = Memory.getInstance().getByte(address) & 0xFF;
        out.append(",\"present\":true,");
        appendKeyValue(out, "value", value); out.append(",");
        appendKeyValue(out, "valueHex", "0x" + String.format(Locale.ROOT, "%02X", value));
      } catch (Exception ex) {
        out.append(",\"present\":false,\"value\":null,\"valueHex\":null,");
        appendKeyValue(out, "error", ex.getMessage() == null ? ex.toString() : ex.getMessage());
      }
      out.append("}");
    }
    out.append("]");
  }

  private static void appendMemoryMap(StringBuilder out) {
    out.append("{");
    appendKeyValue(out, "textBase", Memory.textBaseAddress >>> 0); out.append(",");
    appendKeyValue(out, "textLimit", Memory.textLimitAddress >>> 0); out.append(",");
    appendKeyValue(out, "dataSegmentBase", Memory.dataSegmentBaseAddress >>> 0); out.append(",");
    appendKeyValue(out, "dataSegmentLimit", Memory.dataSegmentLimitAddress >>> 0); out.append(",");
    appendKeyValue(out, "dataBase", Memory.dataBaseAddress >>> 0); out.append(",");
    appendKeyValue(out, "externBase", Memory.externBaseAddress >>> 0); out.append(",");
    appendKeyValue(out, "heapBase", Memory.heapBaseAddress >>> 0); out.append(",");
    appendKeyValue(out, "stackBase", Memory.stackBaseAddress >>> 0); out.append(",");
    appendKeyValue(out, "stackPointer", Memory.stackPointer >>> 0); out.append(",");
    appendKeyValue(out, "stackLimit", Memory.stackLimitAddress >>> 0); out.append(",");
    appendKeyValue(out, "kernelTextBase", Memory.kernelTextBaseAddress >>> 0); out.append(",");
    appendKeyValue(out, "kernelTextLimit", Memory.kernelTextLimitAddress >>> 0); out.append(",");
    appendKeyValue(out, "kernelDataBase", Memory.kernelDataBaseAddress >>> 0); out.append(",");
    appendKeyValue(out, "kernelDataLimit", Memory.kernelDataSegmentLimitAddress >>> 0); out.append(",");
    appendKeyValue(out, "exceptionHandlerAddress", Memory.exceptionHandlerAddress >>> 0); out.append(",");
    appendKeyValue(out, "mmioBase", Memory.memoryMapBaseAddress >>> 0); out.append(",");
    appendKeyValue(out, "mmioLimit", Memory.memoryMapLimitAddress >>> 0);
    out.append("}");
  }

  private static void appendMessagesArray(StringBuilder out, List<MessageRecord> messages) {
    out.append("[");
    boolean first = true;
    for (MessageRecord message : messages) {
      if (!first) out.append(",");
      first = false;
      out.append("{");
      appendKeyValue(out, "warning", message.warning); out.append(",");
      appendKeyValue(out, "file", message.file); out.append(",");
      appendKeyValue(out, "line", message.line); out.append(",");
      appendKeyValue(out, "column", message.column); out.append(",");
      appendKeyValue(out, "message", message.message);
      out.append("}");
    }
    out.append("]");
  }

  private static void appendKeyValue(StringBuilder out, String key, String value) {
    out.append("\"").append(escapeJson(key)).append("\":");
    if (value == null) {
      out.append("null");
    } else {
      out.append("\"").append(escapeJson(value)).append("\"");
    }
  }

  private static void appendKeyValue(StringBuilder out, String key, boolean value) {
    out.append("\"").append(escapeJson(key)).append("\":").append(value ? "true" : "false");
  }

  private static void appendKeyValue(StringBuilder out, String key, int value) {
    out.append("\"").append(escapeJson(key)).append("\":").append(value);
  }

  private static void appendKeyValue(StringBuilder out, String key, long value) {
    out.append("\"").append(escapeJson(key)).append("\":").append(value);
  }

  private static String escapeJson(String value) {
    StringBuilder escaped = new StringBuilder(value.length() + 16);
    for (int i = 0; i < value.length(); i += 1) {
      char ch = value.charAt(i);
      switch (ch) {
        case '"': escaped.append("\\\""); break;
        case '\\': escaped.append("\\\\"); break;
        case '\b': escaped.append("\\b"); break;
        case '\f': escaped.append("\\f"); break;
        case '\n': escaped.append("\\n"); break;
        case '\r': escaped.append("\\r"); break;
        case '\t': escaped.append("\\t"); break;
        default:
          if (ch < 0x20) {
            escaped.append(String.format(Locale.ROOT, "\\u%04x", (int) ch));
          } else {
            escaped.append(ch);
          }
          break;
      }
    }
    return escaped.toString();
  }

  private static String toHex(int value) {
    return "0x" + String.format(Locale.ROOT, "%08X", value);
  }

  private static void captureOutFlush(ByteArrayOutputStream capture) throws IOException {
    if (capture != null) {
      capture.flush();
    }
  }

  private static String readUtf8(Path path) throws IOException {
    byte[] bytes = Files.readAllBytes(path);
    return new String(bytes, StandardCharsets.UTF_8);
  }

  private static Options parseArgs(String[] args) {
    Options options = new Options();
    for (int i = 0; i < args.length; i += 1) {
      String arg = args[i];
      if ("--source".equals(arg) && i + 1 < args.length) {
        options.sourcePath = args[++i];
      } else if ("--output".equals(arg) && i + 1 < args.length) {
        options.outputPath = args[++i];
      } else if ("--memory-configuration".equals(arg) && i + 1 < args.length) {
        options.memoryConfiguration = args[++i];
      } else if ("--program-arguments".equals(arg) && i + 1 < args.length) {
        options.programArgumentsLine = args[++i];
      } else if ("--program-arguments-enabled".equals(arg) && i + 1 < args.length) {
        options.programArgumentsEnabled = parseBoolean(args[++i], false);
      } else if ("--stdin-text".equals(arg) && i + 1 < args.length) {
        options.stdinText = args[++i];
      } else if ("--extended-assembler".equals(arg) && i + 1 < args.length) {
        options.extendedAssembler = parseBoolean(args[++i], true);
      } else if ("--warnings-are-errors".equals(arg) && i + 1 < args.length) {
        options.warningsAreErrors = parseBoolean(args[++i], false);
      } else if ("--delayed-branching".equals(arg) && i + 1 < args.length) {
        options.delayedBranching = parseBoolean(args[++i], false);
      } else if ("--start-at-main".equals(arg) && i + 1 < args.length) {
        options.startAtMain = parseBoolean(args[++i], false);
      } else if ("--self-modifying-code".equals(arg) && i + 1 < args.length) {
        options.selfModifyingCode = parseBoolean(args[++i], false);
      } else if ("--max-steps".equals(arg) && i + 1 < args.length) {
        options.maxSteps = parseInt(args[++i], DEFAULT_MAX_STEPS);
      } else if ("--memory-addresses".equals(arg) && i + 1 < args.length) {
        options.memoryAddresses = parseAddressList(args[++i]);
      }
    }
    return options;
  }

  private static boolean parseBoolean(String text, boolean fallback) {
    if (text == null) return fallback;
    String normalized = text.trim().toLowerCase(Locale.ROOT);
    if ("1".equals(normalized) || "true".equals(normalized) || "yes".equals(normalized) || "on".equals(normalized)) return true;
    if ("0".equals(normalized) || "false".equals(normalized) || "no".equals(normalized) || "off".equals(normalized)) return false;
    return fallback;
  }

  private static int parseInt(String text, int fallback) {
    try {
      return Integer.parseInt(String.valueOf(text).trim());
    } catch (Exception ignored) {
      return fallback;
    }
  }

  private static List<Integer> parseAddressList(String text) {
    List<Integer> addresses = new ArrayList<Integer>();
    if (text == null) return addresses;
    String[] parts = text.split(",");
    Set<Integer> unique = new LinkedHashSet<Integer>();
    for (String raw : parts) {
      String item = raw.trim();
      if (item.length() == 0) continue;
      try {
        int parsed = Binary.stringToInt(item);
        unique.add(Integer.valueOf(parsed));
      } catch (Exception ignored) {
        try {
          long alt = item.toLowerCase(Locale.ROOT).startsWith("0x")
            ? Long.parseLong(item.substring(2), 16)
            : Long.parseLong(item, 10);
          unique.add(Integer.valueOf((int) (alt & 0xFFFFFFFFL)));
        } catch (Exception ignoredAgain) {
          // Ignore invalid address token.
        }
      }
    }
    addresses.addAll(unique);
    return addresses;
  }

  private static List<String> parseProgramArguments(String line) {
    List<String> tokens = new ArrayList<String>();
    if (line == null) return tokens;
    String text = line.trim();
    if (text.length() == 0) return tokens;

    StringBuilder current = new StringBuilder();
    boolean inSingle = false;
    boolean inDouble = false;
    for (int i = 0; i < text.length(); i += 1) {
      char ch = text.charAt(i);
      char prev = i > 0 ? text.charAt(i - 1) : '\0';
      if (ch == '"' && !inSingle && prev != '\\') {
        inDouble = !inDouble;
        continue;
      }
      if (ch == '\'' && !inDouble && prev != '\\') {
        inSingle = !inSingle;
        continue;
      }
      if (!inSingle && !inDouble && Character.isWhitespace(ch)) {
        if (current.length() > 0) {
          tokens.add(current.toString());
          current.setLength(0);
        }
        continue;
      }
      current.append(ch);
    }
    if (current.length() > 0) {
      tokens.add(current.toString());
    }
    return tokens;
  }
}
