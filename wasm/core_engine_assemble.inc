val NativeMarsEngine::assemble(const std::string& sourceCode, val options) {
  struct SourceLine {
    std::int32_t lineNumber = 0;
    std::string fileName;
    std::string statement;
  };
  struct MacroDefinition {
    std::string name;
    std::vector<std::string> args;
    std::vector<SourceLine> body;
  };
  struct PassState {
    std::string segment = "text";
    std::uint32_t textAddress = 0;
    std::uint32_t externAddress = 0;
    std::uint32_t dataAddress = 0;
    std::uint32_t kernelTextAddress = 0;
    std::uint32_t kernelDataAddress = 0;
    bool autoAlignData = true;
    bool autoAlignKernelData = true;
    bool reorder = true;
    bool at = true;
    bool macro = true;
    std::string currentDataDirective = ".word";
    std::unordered_set<std::string> globalDeclarations;
  };

  clear();
  const auto normalizedSource = std::string(sourceCode);
  const auto sourceName = normalize_path_like(string_or(options, "sourceName", "main.s"));
  const bool programArgumentsEnabled = bool_or(options, "programArgumentsEnabled", false);
  const auto programArgumentsLine = string_or(options, "programArguments", std::string());
  const auto includeFiles = options["includeFiles"];
  const auto referencePseudoOps = options["referencePseudoOps"];
  const auto referenceBasicInstructions = options["referenceBasicInstructions"];
  std::vector<AssembleMessage> warnings;
  std::vector<AssembleMessage> errors;
  std::vector<AssembledTextRow> textRows;
  std::vector<std::pair<std::string, std::uint32_t>> labelsOrdered;
  std::unordered_map<std::string, std::uint32_t> labels;
  std::string fallbackReason;
  const auto referencePseudoIndex = build_reference_pseudo_index(referencePseudoOps);
  const auto referenceInstructionIndex = build_reference_instruction_index(referenceBasicInstructions);

  auto buildSnapshot = [&]() {
    val snapshot = exportState(false, true);
    snapshot.set("source", normalizedSource);
    val rows = val::array();
    for (std::uint32_t i = 0; i < textRows.size(); i += 1u) {
      const auto& row = textRows[i];
      val item = val::object();
      item.set("index", i);
      item.set("address", row.address);
      item.set("line", row.line);
      item.set("source", row.source);
      item.set("basic", row.basic);
      item.set("addressHex", to_hex32(row.address));
      item.set("code", row.code);
      item.set("machineCodeHex", row.machineCodeHex);
      rows.set(i, item);
    }
    snapshot.set("textRows", rows);

    val dataRows = val::array();
    const auto dataBase = memoryMap_.dataBase;
    for (std::uint32_t i = 0; i < 32u; i += 1u) {
      const auto address = dataBase + (i * 4u);
      const auto entry = memoryWords_.find(address);
      const auto value = entry == memoryWords_.end() ? 0 : entry->second;
      val item = val::object();
      item.set("address", address);
      item.set("addressHex", to_hex32(address));
      item.set("value", value);
      item.set("valueUnsigned", static_cast<double>(static_cast<std::uint32_t>(value)));
      item.set("valueHex", to_hex32(static_cast<std::uint32_t>(value)));
      dataRows.set(i, item);
    }
    snapshot.set("dataRows", dataRows);

    val labelsValue = val::array();
    std::sort(labelsOrdered.begin(), labelsOrdered.end(), [](const auto& left, const auto& right) {
      if (left.second != right.second) return left.second < right.second;
      return left.first < right.first;
    });
    for (std::uint32_t i = 0; i < labelsOrdered.size(); i += 1u) {
      val item = val::object();
      item.set("label", labelsOrdered[i].first);
      item.set("address", labelsOrdered[i].second);
      labelsValue.set(i, item);
    }
    snapshot.set("labels", labelsValue);

    val warningsValue = val::array();
    for (std::uint32_t i = 0; i < warnings.size(); i += 1u) {
      val item = val::object();
      item.set("line", warnings[i].line);
      item.set("message", warnings[i].message);
      warningsValue.set(i, item);
    }
    snapshot.set("warnings", warningsValue);

    val errorsValue = val::array();
    for (std::uint32_t i = 0; i < errors.size(); i += 1u) {
      val item = val::object();
      item.set("line", errors[i].line);
      item.set("message", errors[i].message);
      errorsValue.set(i, item);
    }
    snapshot.set("errors", errorsValue);
    return snapshot;
  };

  auto buildResult = [&](bool ok, bool fallback) {
    val result = val::object();
    result.set("ok", ok);
    result.set("native", ok && !fallback);
    result.set("fallback", fallback);
    if (!fallbackReason.empty()) result.set("reason", fallbackReason);
    result.set("snapshot", buildSnapshot());
    return result;
  };

  auto resolveValue = [&](const std::string& token, bool firstPass) -> double {
    bool immediateOk = false;
    const auto immediate = parse_immediate_native(token, &immediateOk);
    if (immediateOk) return static_cast<double>(immediate);
    const auto clean = trim_copy(token);
    auto found = labels.find(clean);
    if (found != labels.end()) return static_cast<double>(found->second);
    const auto opIndex = clean.find_first_of("+-");
    if (opIndex != std::string::npos && opIndex > 0) {
      const auto label = trim_copy(clean.substr(0, opIndex));
      bool deltaOk = false;
      const auto delta = parse_immediate_native(clean.substr(opIndex + 1), &deltaOk);
      found = labels.find(label);
      if (deltaOk && found != labels.end()) {
        return static_cast<double>(clean[opIndex] == '-' ? (found->second - delta) : (found->second + delta));
      }
    }
    return firstPass ? 0.0 : std::numeric_limits<double>::quiet_NaN();
  };

  auto nextRegister = [](const std::string& token) {
    const auto reg = resolve_register_token(token);
    return (reg >= 0 && reg < 31) ? ("$" + std::to_string(reg + 1)) : token;
  };

  auto resolvePseudoTokenValue = [&](const std::string& token, bool firstPass) -> double {
    bool immediateOk = false;
    const auto direct = parse_immediate_native(token, &immediateOk);
    if (immediateOk) return static_cast<double>(direct);
    if (firstPass) return std::numeric_limits<double>::quiet_NaN();
    const auto resolved = resolveValue(token, false);
    return std::isfinite(resolved) ? resolved : std::numeric_limits<double>::quiet_NaN();
  };

  auto resolvePseudoTemplateValue = [&](const std::string& token, bool firstPass) -> std::int32_t {
    const auto resolved = resolvePseudoTokenValue(token, firstPass);
    return std::isfinite(resolved) ? static_cast<std::int32_t>(resolved) : 0;
  };

  auto resolvePseudoTokenAddress = [&](const std::string& token, bool firstPass) -> double {
    const auto resolved = resolvePseudoTokenValue(token, firstPass);
    return std::isfinite(resolved) ? static_cast<double>(static_cast<std::uint32_t>(resolved)) : std::numeric_limits<double>::quiet_NaN();
  };

  auto composePseudoSourceValueToken = [](const std::vector<std::string>& sourceTokens, std::size_t index) {
    const auto base = index < sourceTokens.size() ? trim_copy(sourceTokens[index]) : std::string();
    if (base.empty()) return std::string();
    const auto op = index + 1u < sourceTokens.size() ? trim_copy(sourceTokens[index + 1u]) : std::string();
    const auto rhs = index + 2u < sourceTokens.size() ? trim_copy(sourceTokens[index + 2u]) : std::string();
    if ((op == "+" || op == "-") && !rhs.empty()) return base + op + rhs;
    return base;
  };

  auto nextPseudoRegister = [&](const std::string& token) {
    const auto floatIndex = resolve_float_register_token(token);
    if (floatIndex >= 0) return floatIndex < 31 ? ("$f" + std::to_string(floatIndex + 1)) : token;
    const auto registerIndex = resolve_register_token(token);
    if (registerIndex >= 0) return registerIndex < 31 ? ("$" + std::to_string(registerIndex + 1)) : token;
    return token;
  };

  auto matchPseudoPatternToken = [&](const std::string& patternToken, const std::string& actualToken, bool firstPass) {
    const auto pattern = trim_copy(patternToken);
    const auto actual = trim_copy(actualToken);
    if (pattern == "(" || pattern == ")") return pattern == actual;

    const auto lowerPattern = lower_copy(pattern);
    if (lowerPattern.size() >= 3u && lowerPattern[0] == '$' && lowerPattern[1] == 'f' && std::isdigit(static_cast<unsigned char>(lowerPattern[2])) != 0) {
      return resolve_float_register_token(actual) >= 0;
    }
    if (!lowerPattern.empty() && lowerPattern[0] == '$') return is_explicit_register_operand_native(actual);
    if (lowerPattern == "label") return is_label_identifier_native(actual);
    if (starts_with_ci(lowerPattern, "label+") || starts_with_ci(lowerPattern, "label-")) {
      return parse_pseudo_label_expression_native(actual).valid;
    }

    bool numericOk = false;
    const auto numericPattern = parse_immediate_native(pattern, &numericOk);
    if (numericOk) {
      const auto actualValue = resolvePseudoTokenValue(actual, firstPass);
      if (!std::isfinite(actualValue)) return false;
      const auto narrowed = static_cast<std::int32_t>(actualValue);
      if (numericPattern == 10) return fits_pseudo_unsigned5(narrowed);
      if (numericPattern == -100) return fits_pseudo_signed16(narrowed);
      if (numericPattern == 100) return fits_pseudo_unsigned16(narrowed);
      if (std::abs(numericPattern) == 100000) return true;
      return narrowed == numericPattern;
    }

    return lowerPattern == lower_copy(actual);
  };

  auto renderPseudoInstructionTokens = [](const std::vector<std::string>& tokens) {
    if (tokens.empty()) return std::string();
    if (tokens.size() == 1u) return tokens[0];
    const auto opcode = tokens[0];
    std::vector<std::string> operands;
    std::string current;
    std::int32_t parenDepth = 0;
    for (std::size_t i = 1; i < tokens.size(); i += 1u) {
      const auto& token = tokens[i];
      if (token == "(") {
        current.push_back('(');
        parenDepth += 1;
        continue;
      }
      if (token == ")") {
        current.push_back(')');
        parenDepth = std::max<std::int32_t>(0, parenDepth - 1);
        continue;
      }
      if (current.empty()) {
        current = token;
        continue;
      }
      if (parenDepth > 0) {
        current += token;
        continue;
      }
      operands.push_back(current);
      current = token;
    }
    if (!current.empty()) operands.push_back(current);
    if (operands.empty()) return opcode;
    std::string rendered = opcode + " ";
    for (std::size_t i = 0; i < operands.size(); i += 1u) {
      if (i > 0) rendered += ", ";
      rendered += operands[i];
    }
    return rendered;
  };

  auto parseIndexedTemplateToken = [](const std::string& token, const std::string& prefix, std::int32_t& index, std::int32_t& plus, bool& unsignedFlag) {
    if (!starts_with_ci(token, prefix)) return false;
    std::size_t cursor = prefix.size();
    if (cursor >= token.size() || std::isdigit(static_cast<unsigned char>(token[cursor])) == 0) return false;
    std::size_t endDigits = cursor;
    while (endDigits < token.size() && std::isdigit(static_cast<unsigned char>(token[endDigits])) != 0) endDigits += 1u;
    index = static_cast<std::int32_t>(std::stoi(token.substr(cursor, endDigits - cursor)));
    plus = 0;
    unsignedFlag = false;
    cursor = endDigits;
    if (cursor < token.size() && (token[cursor] == 'P' || token[cursor] == 'p')) {
      cursor += 1u;
      if (cursor >= token.size() || std::isdigit(static_cast<unsigned char>(token[cursor])) == 0) return false;
      plus = static_cast<std::int32_t>(token[cursor] - '0');
      cursor += 1u;
    }
    if (cursor < token.size() && (token[cursor] == 'U' || token[cursor] == 'u')) {
      unsignedFlag = true;
      cursor += 1u;
    }
    return cursor == token.size();
  };

  auto resolvePseudoTemplateToken = [&](const std::string& token, const std::vector<std::string>& sourceTokens, bool firstPass) -> std::string {
    const auto templateToken = trim_copy(token);
    if (templateToken.empty()) return {};

    if (starts_with_ci(templateToken, "RG") && templateToken.size() > 2u) {
      const auto index = static_cast<std::size_t>(std::stoi(templateToken.substr(2)));
      return index < sourceTokens.size() ? sourceTokens[index] : std::string();
    }
    if (starts_with_ci(templateToken, "NR") && templateToken.size() > 2u) {
      const auto index = static_cast<std::size_t>(std::stoi(templateToken.substr(2)));
      return index < sourceTokens.size() ? nextPseudoRegister(sourceTokens[index]) : std::string();
    }
    if (starts_with_ci(templateToken, "OP") && templateToken.size() > 2u) {
      const auto index = static_cast<std::size_t>(std::stoi(templateToken.substr(2)));
      return index < sourceTokens.size() ? sourceTokens[index] : std::string();
    }
    if (templateToken == "LAB") return sourceTokens.empty() ? std::string() : sourceTokens.back();
    if (templateToken == "S32") {
      return std::to_string(32 - resolvePseudoTemplateValue(sourceTokens.empty() ? std::string() : sourceTokens.back(), firstPass));
    }
    if (starts_with_ci(templateToken, "BROFF") && templateToken.size() >= 7u) {
      return std::string(1, settings_.delayedBranching ? templateToken[6] : templateToken[5]);
    }

    std::int32_t index = 0;
    std::int32_t plus = 0;
    bool unsignedFlag = false;
    if (parseIndexedTemplateToken(templateToken, "VHL", index, plus, unsignedFlag)) {
      const auto value = static_cast<std::uint32_t>(resolvePseudoTemplateValue(index < static_cast<std::int32_t>(sourceTokens.size()) ? sourceTokens[static_cast<std::size_t>(index)] : std::string(), firstPass) + plus);
      return std::to_string(high16_logical_value_native(value));
    }
    if (parseIndexedTemplateToken(templateToken, "VH", index, plus, unsignedFlag)) {
      const auto value = static_cast<std::uint32_t>(resolvePseudoTemplateValue(index < static_cast<std::int32_t>(sourceTokens.size()) ? sourceTokens[static_cast<std::size_t>(index)] : std::string(), firstPass) + plus);
      return std::to_string(high16_carry_value_native(value));
    }
    if (parseIndexedTemplateToken(templateToken, "VL", index, plus, unsignedFlag)) {
      const auto value = static_cast<std::uint32_t>(resolvePseudoTemplateValue(index < static_cast<std::int32_t>(sourceTokens.size()) ? sourceTokens[static_cast<std::size_t>(index)] : std::string(), firstPass) + plus);
      return std::to_string(unsignedFlag ? low16_unsigned_value_native(value) : static_cast<std::uint32_t>(low16_signed_value_native(value)));
    }
    if (parseIndexedTemplateToken(templateToken, "LH", index, plus, unsignedFlag)) {
      const auto raw = resolvePseudoTokenAddress(index < static_cast<std::int32_t>(sourceTokens.size()) ? sourceTokens[static_cast<std::size_t>(index)] : std::string(), firstPass);
      const auto value = static_cast<std::uint32_t>((std::isfinite(raw) ? raw : 0.0) + plus);
      return std::to_string(high16_carry_value_native(value));
    }
    if (parseIndexedTemplateToken(templateToken, "LL", index, plus, unsignedFlag)) {
      const auto raw = resolvePseudoTokenAddress(index < static_cast<std::int32_t>(sourceTokens.size()) ? sourceTokens[static_cast<std::size_t>(index)] : std::string(), firstPass);
      const auto value = static_cast<std::uint32_t>((std::isfinite(raw) ? raw : 0.0) + plus);
      return std::to_string(unsignedFlag ? low16_unsigned_value_native(value) : static_cast<std::uint32_t>(low16_signed_value_native(value)));
    }
    if (starts_with_ci(templateToken, "LLP")) {
      plus = 0;
      unsignedFlag = false;
      std::size_t cursor = 3;
      if (cursor < templateToken.size() && (templateToken[cursor] == 'P' || templateToken[cursor] == 'p')) {
        cursor += 1u;
        if (cursor < templateToken.size() && std::isdigit(static_cast<unsigned char>(templateToken[cursor])) != 0) {
          plus = static_cast<std::int32_t>(templateToken[cursor] - '0');
          cursor += 1u;
        }
      }
      if (cursor < templateToken.size() && (templateToken[cursor] == 'U' || templateToken[cursor] == 'u')) {
        unsignedFlag = true;
        cursor += 1u;
      }
      if (cursor == templateToken.size()) {
        const auto raw = resolvePseudoTokenAddress(composePseudoSourceValueToken(sourceTokens, 2u), firstPass);
        const auto value = static_cast<std::uint32_t>((std::isfinite(raw) ? raw : 0.0) + plus);
        return std::to_string(unsignedFlag ? low16_unsigned_value_native(value) : static_cast<std::uint32_t>(low16_signed_value_native(value)));
      }
    }
    if (starts_with_ci(templateToken, "LHPA")) {
      plus = 0;
      std::size_t cursor = 4;
      if (cursor < templateToken.size() && (templateToken[cursor] == 'P' || templateToken[cursor] == 'p')) {
        cursor += 1u;
        if (cursor < templateToken.size() && std::isdigit(static_cast<unsigned char>(templateToken[cursor])) != 0) {
          plus = static_cast<std::int32_t>(templateToken[cursor] - '0');
          cursor += 1u;
        }
      }
      if (cursor == templateToken.size()) {
        const auto raw = resolvePseudoTokenAddress(composePseudoSourceValueToken(sourceTokens, 2u), firstPass);
        const auto value = static_cast<std::uint32_t>((std::isfinite(raw) ? raw : 0.0) + plus);
        return std::to_string(high16_carry_value_native(value));
      }
    }
    if (templateToken == "LHPN" || templateToken == "LHL") {
      const auto raw = resolvePseudoTokenAddress(composePseudoSourceValueToken(sourceTokens, 2u), firstPass);
      const auto value = static_cast<std::uint32_t>(std::isfinite(raw) ? raw : 0.0);
      return std::to_string(high16_logical_value_native(value));
    }

    return templateToken;
  };

  auto canUseCompactPseudoTemplates = [&](const NativeReferencePseudoEntry& entry, const std::vector<std::string>& sourceTokens, bool firstPass) {
    if (entry.compactTemplateTokens.empty() || firstPass) return false;
    std::unordered_set<std::int32_t> labelSourceTokens;
    for (const auto& templateTokens : entry.compactTemplateTokens) {
      for (const auto& token : templateTokens) {
        std::int32_t tokenIndex = 0;
        std::int32_t plus = 0;
        bool unsignedFlag = false;
        if (parseIndexedTemplateToken(token, "LL", tokenIndex, plus, unsignedFlag) || parseIndexedTemplateToken(token, "LH", tokenIndex, plus, unsignedFlag)) {
          labelSourceTokens.insert(tokenIndex);
        } else if (starts_with_ci(token, "LLP") || starts_with_ci(token, "LHPA") || token == "LHPN" || token == "LHL") {
          labelSourceTokens.insert(2);
        }
      }
    }
    if (labelSourceTokens.empty()) return false;
    for (const auto index : labelSourceTokens) {
      if (index < 0 || index >= static_cast<std::int32_t>(sourceTokens.size())) return false;
      const auto value = resolvePseudoTokenAddress(sourceTokens[static_cast<std::size_t>(index)], false);
      if (!std::isfinite(value) || !fits_pseudo_signed16(clamp32(static_cast<std::uint32_t>(value)))) return false;
    }
    return true;
  };

  auto expandPseudoFromReference = [&](const std::string& statement, bool firstPass, bool allowExtendedAssembler, std::vector<std::string>& expanded) -> bool {
    if (!allowExtendedAssembler) return false;
    const auto sourceTokens = tokenize_pseudo_source_statement_native(statement);
    if (sourceTokens.empty()) return false;
    const auto opcode = lower_copy(sourceTokens[0]);
    const auto found = referencePseudoIndex.find(opcode);
    if (found == referencePseudoIndex.end()) return false;
    for (const auto& entry : found->second) {
      if (entry.sourceTokens.size() != sourceTokens.size()) continue;
      bool matched = true;
      for (std::size_t i = 0; i < entry.sourceTokens.size(); i += 1u) {
        if (!matchPseudoPatternToken(entry.sourceTokens[i], sourceTokens[i], firstPass)) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;
      const auto& templateSet = canUseCompactPseudoTemplates(entry, sourceTokens, firstPass)
        ? entry.compactTemplateTokens
        : entry.defaultTemplateTokens;
      if (templateSet.empty()) continue;
      expanded.clear();
      for (const auto& templateTokens : templateSet) {
        if (templateTokens.size() == 1u && templateTokens[0] == "DBNOP") {
          if (settings_.delayedBranching) expanded.push_back("nop");
          continue;
        }
        std::vector<std::string> resolvedTokens;
        resolvedTokens.reserve(templateTokens.size());
        for (const auto& templateToken : templateTokens) {
          const auto resolved = resolvePseudoTemplateToken(templateToken, sourceTokens, firstPass);
          if (resolved.empty()) {
            expanded.clear();
            break;
          }
          resolvedTokens.push_back(resolved);
        }
        if (resolvedTokens.empty()) break;
        const auto rendered = renderPseudoInstructionTokens(resolvedTokens);
        if (rendered.empty()) {
          expanded.clear();
          break;
        }
        expanded.push_back(rendered);
      }
      if (!expanded.empty()) return true;
    }
    return false;
  };

  auto expandPseudo = [&](const std::string& statement, bool firstPass, bool allowExtendedAssembler, std::vector<std::string>& expanded) -> bool {
    expanded.clear();
    const auto tokens = tokenize_statement_native(statement);
    if (tokens.empty()) return true;
    const auto opcode = lower_copy(tokens[0]);
    const auto fitsSigned16 = [](std::int32_t value) { return value >= -32768 && value <= 32767; };
    const auto fitsUnsigned16 = [](std::int32_t value) { return value >= 0 && value <= 65535; };
    const auto immediateValue = [&](const std::string& token) -> std::int32_t {
      const auto resolved = resolveValue(token, firstPass);
      return std::isfinite(resolved) ? static_cast<std::int32_t>(resolved) : 0;
    };
    const auto loadToAt = [&](const std::string& token, bool preferUnsigned = true) {
      std::vector<std::string> rows;
      const auto value = immediateValue(token);
      if (fitsSigned16(value)) rows.push_back("addiu $at, $zero, " + std::to_string(value));
      else if (preferUnsigned && fitsUnsigned16(value)) rows.push_back("ori $at, $zero, " + std::to_string(value));
      else {
        const auto numeric = static_cast<std::uint32_t>(value);
        rows.push_back("lui $at, " + std::to_string(((numeric >> 16u) + ((numeric & 0x8000u) ? 1u : 0u)) & 0xffffu));
        rows.push_back("ori $at, $at, " + std::to_string(numeric & 0xffffu));
      }
      return rows;
    };

    if (!allowExtendedAssembler) {
      expanded.push_back(statement);
      return true;
    }
    const bool canUseReferencePseudo =
      parse_opcode(opcode) == Opcode::Delegate
      || is_known_pseudo_opcode(opcode);
    if (canUseReferencePseudo && expandPseudoFromReference(statement, firstPass, allowExtendedAssembler, expanded)) return true;
    if (opcode == "nop") { expanded.push_back("sll $zero, $zero, 0"); return true; }
    if (opcode == "move" && tokens.size() >= 3u) { expanded.push_back("addu " + tokens[1] + ", " + tokens[2] + ", $zero"); return true; }
    if (opcode == "not" && tokens.size() >= 3u) { expanded.push_back("nor " + tokens[1] + ", " + tokens[2] + ", $zero"); return true; }
    if (opcode == "neg" && tokens.size() >= 3u) { expanded.push_back("sub " + tokens[1] + ", $zero, " + tokens[2]); return true; }
    if (opcode == "negu" && tokens.size() >= 3u) { expanded.push_back("subu " + tokens[1] + ", $zero, " + tokens[2]); return true; }
    if (opcode == "abs" && tokens.size() >= 3u) {
      expanded.push_back("sra $at, " + tokens[2] + ", 31");
      expanded.push_back("xor " + tokens[1] + ", $at, " + tokens[2]);
      expanded.push_back("subu " + tokens[1] + ", " + tokens[1] + ", $at");
      return true;
    }
    if (opcode == "li" && tokens.size() >= 3u) {
      const auto value = immediateValue(tokens[2]);
      if (fitsSigned16(value)) expanded.push_back("addiu " + tokens[1] + ", $zero, " + std::to_string(value));
      else if (fitsUnsigned16(value)) expanded.push_back("ori " + tokens[1] + ", $zero, " + std::to_string(value));
      else {
        const auto numeric = static_cast<std::uint32_t>(value);
        expanded.push_back("lui " + tokens[1] + ", " + std::to_string(((numeric >> 16u) + ((numeric & 0x8000u) ? 1u : 0u)) & 0xffffu));
        expanded.push_back("ori " + tokens[1] + ", " + tokens[1] + ", " + std::to_string(numeric & 0xffffu));
      }
      return true;
    }
    if (opcode == "la" && tokens.size() >= 3u) {
      const auto value = static_cast<std::uint32_t>(immediateValue(tokens[2]));
      expanded.push_back("lui " + tokens[1] + ", " + std::to_string(((value >> 16u) + ((value & 0x8000u) ? 1u : 0u)) & 0xffffu));
      expanded.push_back("ori " + tokens[1] + ", " + tokens[1] + ", " + std::to_string(value & 0xffffu));
      return true;
    }
    if ((opcode == "lw" || opcode == "sw" || opcode == "lb" || opcode == "lbu" || opcode == "sb" || opcode == "lh" || opcode == "lhu" || opcode == "sh" || opcode == "ll" || opcode == "sc" || opcode == "lwl" || opcode == "lwr" || opcode == "swl" || opcode == "swr" || opcode == "lwc1" || opcode == "swc1")
      && tokens.size() >= 3u && tokens[2].find('(') == std::string::npos && tokens[2].find(')') == std::string::npos) {
      const auto rawValue = resolveValue(tokens[2], firstPass);
      if (std::isfinite(rawValue)) {
        const auto value = static_cast<std::uint32_t>(static_cast<std::int32_t>(rawValue));
        if (fitsSigned16(static_cast<std::int32_t>(rawValue))) {
          expanded.push_back(opcode + " " + tokens[1] + ", " + std::to_string(static_cast<std::int32_t>(rawValue)) + "($0)");
        } else if (fitsUnsigned16(static_cast<std::int32_t>(rawValue))) {
          expanded.push_back("ori $1, $0, " + std::to_string(value & 0xffffu));
          expanded.push_back(opcode + " " + tokens[1] + ", 0($1)");
        } else {
          expanded.push_back("lui $1, " + std::to_string(((value >> 16u) + ((value & 0x8000u) ? 1u : 0u)) & 0xffffu));
          expanded.push_back(opcode + " " + tokens[1] + ", " + std::to_string(static_cast<std::int32_t>(value & 0xffffu)) + "($1)");
        }
        return true;
      }
    }
    if (opcode == "b" && tokens.size() >= 2u) { expanded.push_back("bgez $zero, " + tokens[1]); return true; }
    if (opcode == "beqz" && tokens.size() >= 3u) { expanded.push_back("beq " + tokens[1] + ", $zero, " + tokens[2]); return true; }
    if (opcode == "bnez" && tokens.size() >= 3u) { expanded.push_back("bne " + tokens[1] + ", $zero, " + tokens[2]); return true; }
    if (opcode == "l.s" && tokens.size() >= 3u) { expanded.push_back("lwc1 " + tokens[1] + ", " + tokens[2]); return true; }
    if (opcode == "s.s" && tokens.size() >= 3u) { expanded.push_back("swc1 " + tokens[1] + ", " + tokens[2]); return true; }
    if (opcode == "l.d" && tokens.size() >= 3u) { expanded.push_back("ldc1 " + tokens[1] + ", " + tokens[2]); return true; }
    if (opcode == "s.d" && tokens.size() >= 3u) { expanded.push_back("sdc1 " + tokens[1] + ", " + tokens[2]); return true; }
    if (opcode == "mfc1.d" && tokens.size() >= 3u) {
      expanded.push_back("mfc1 " + tokens[1] + ", " + tokens[2]);
      expanded.push_back("mfc1 " + nextRegister(tokens[1]) + ", " + nextRegister(tokens[2]));
      return true;
    }
    if (opcode == "mtc1.d" && tokens.size() >= 3u) {
      expanded.push_back("mtc1 " + tokens[1] + ", " + tokens[2]);
      expanded.push_back("mtc1 " + nextRegister(tokens[1]) + ", " + nextRegister(tokens[2]));
      return true;
    }
    if (opcode == "blt" || opcode == "bltu" || opcode == "bgt" || opcode == "bgtu" || opcode == "ble" || opcode == "bleu" || opcode == "bge" || opcode == "bgeu") {
      if (tokens.size() < 4u) return false;
      const bool isUnsigned = opcode.back() == 'u';
      const auto sltOp = isUnsigned ? std::string("sltu") : std::string("slt");
      const bool rightIsRegister = is_explicit_register_operand_native(tokens[2]);
      const auto loaded = rightIsRegister ? std::vector<std::string>() : loadToAt(tokens[2], isUnsigned);
      expanded.insert(expanded.end(), loaded.begin(), loaded.end());
      const auto right = rightIsRegister ? tokens[2] : std::string("$at");
      if (opcode.rfind("blt", 0) == 0) {
        expanded.push_back(sltOp + " $at, " + tokens[1] + ", " + right);
        expanded.push_back("bne $at, $zero, " + tokens[3]);
      } else if (opcode.rfind("bgt", 0) == 0) {
        expanded.push_back(sltOp + " $at, " + right + ", " + tokens[1]);
        expanded.push_back("bne $at, $zero, " + tokens[3]);
      } else if (opcode.rfind("ble", 0) == 0) {
        expanded.push_back(sltOp + " $at, " + right + ", " + tokens[1]);
        expanded.push_back("beq $at, $zero, " + tokens[3]);
      } else {
        expanded.push_back(sltOp + " $at, " + tokens[1] + ", " + right);
        expanded.push_back("beq $at, $zero, " + tokens[3]);
      }
      return true;
    }
    return !is_known_pseudo_opcode(opcode) ? (expanded.push_back(statement), true) : false;
  };

  std::unordered_map<std::string, std::string> includeSourceMap;
  auto registerIncludeSource = [&](const std::string& name, const std::string& source) {
    const auto normalized = normalize_path_like(name);
    if (normalized.empty()) return;
    includeSourceMap[normalized] = source;
  };

  if (includeFiles.isArray()) {
    for (std::uint32_t i = 0; i < array_length(includeFiles); i += 1u) {
      const auto pair = includeFiles[i];
      if (!pair.isArray() || array_length(pair) < 2u) continue;
      registerIncludeSource(pair[0].as<std::string>(), pair[1].as<std::string>());
    }
  } else if (!includeFiles.isUndefined() && !includeFiles.isNull()) {
    const auto keys = val::global("Object").call<val>("keys", includeFiles);
    for (std::uint32_t i = 0; i < array_length(keys); i += 1u) {
      const auto key = keys[i].as<std::string>();
      registerIncludeSource(key, includeFiles[key].as<std::string>());
    }
  }
  registerIncludeSource(sourceName, normalizedSource);

  std::vector<SourceLine> flattenedLines;
  auto resolveInclude = [&](const std::string& requested, const std::string& currentFile) {
    const auto cleanRequest = normalize_path_like(requested);
    std::vector<std::string> candidates;
    const auto joined = path_join_like(path_dirname_like(currentFile), cleanRequest);
    if (!joined.empty()) candidates.push_back(joined);
    if (!cleanRequest.empty()) candidates.push_back(cleanRequest);
    for (const auto& candidate : candidates) {
      if (includeSourceMap.find(candidate) != includeSourceMap.end()) return candidate;
    }
    return std::string();
  };

  std::function<void(const std::string&, const std::vector<std::string>&)> walkIncludeTree;
  walkIncludeTree = [&](const std::string& fileName, const std::vector<std::string>& stack) {
    const auto normalizedName = normalize_path_like(fileName);
    const auto found = includeSourceMap.find(normalizedName);
    if (found == includeSourceMap.end()) {
      errors.push_back({ 0, "Error reading include file " + path_basename_like(normalizedName) });
      return;
    }

    auto text = found->second;
    text.erase(std::remove(text.begin(), text.end(), '\r'), text.end());
    std::size_t cursor = 0;
    std::int32_t lineNumber = 1;
    while (cursor <= text.size()) {
      const auto next = text.find('\n', cursor);
      const auto lineText = text.substr(cursor, next == std::string::npos ? std::string::npos : next - cursor);
      cursor = next == std::string::npos ? text.size() + 1 : next + 1;
      const auto statement = trim_copy(strip_comment_native(lineText));
      if (!statement.empty()) {
        if (starts_with_ci(statement, ".include")) {
          const auto includeBody = trim_copy(statement.substr(8));
          if (includeBody.size() < 2u || !((includeBody.front() == '"' && includeBody.back() == '"') || (includeBody.front() == '\'' && includeBody.back() == '\''))) {
            errors.push_back({ lineNumber, "[" + normalizedName + "] malformed .include directive." });
          } else {
            const auto includeName = includeBody.substr(1, includeBody.size() - 2u);
            const auto resolved = resolveInclude(includeName, normalizedName);
            if (resolved.empty()) {
              errors.push_back({ lineNumber, "Error reading include file " + includeName });
            } else if (std::find(stack.begin(), stack.end(), resolved) != stack.end()) {
              errors.push_back({ lineNumber, "[" + normalizedName + "] circular include detected for '" + resolved + "'." });
            } else {
              auto nextStack = stack;
              nextStack.push_back(resolved);
              walkIncludeTree(resolved, nextStack);
            }
          }
        } else {
          flattenedLines.push_back({ lineNumber, normalizedName, statement });
        }
      }
      lineNumber += 1;
    }
  };
  walkIncludeTree(sourceName, { sourceName });

  std::vector<SourceLine> lines;
  std::unordered_map<std::string, std::string> eqvMap;
  std::unordered_map<std::string, MacroDefinition> macros;
  std::int32_t macroCounter = 0;

  auto applyEqv = [&](const std::string& statement) {
    std::vector<std::pair<std::string, std::string>> entries(eqvMap.begin(), eqvMap.end());
    std::sort(entries.begin(), entries.end(), [](const auto& left, const auto& right) {
      return left.first.size() > right.first.size();
    });
    auto output = statement;
    for (const auto& entry : entries) {
      output = replace_identifier_tokens(output, entry.first, entry.second);
    }
    return output;
  };

  std::function<void(const SourceLine&, std::int32_t)> emitLine;
  emitLine = [&](const SourceLine& lineObj, std::int32_t depth) {
    if (depth > 20) {
      errors.push_back({ lineObj.lineNumber, "[" + lineObj.fileName + "] Macro expansion depth exceeded." });
      return;
    }

    const auto eqvApplied = trim_copy(applyEqv(lineObj.statement));
    if (eqvApplied.empty()) return;
    const auto invocation = parse_macro_invocation_native(eqvApplied);
    if (!invocation.valid) {
      lines.push_back({ lineObj.lineNumber, lineObj.fileName, eqvApplied });
      return;
    }
    const auto macroName = invocation.name;
    const auto args = invocation.args;
    const auto key = macroName + "/" + std::to_string(args.size());
    const auto foundMacro = macros.find(key);
    if (foundMacro == macros.end()) {
      for (const auto& entry : macros) {
        if (entry.second.name == macroName) {
          errors.push_back({ lineObj.lineNumber, "Forward reference or invalid parameters for macro \"" + macroName + "\"" });
          return;
        }
      }
      lines.push_back({ lineObj.lineNumber, lineObj.fileName, eqvApplied });
      return;
    }

    std::unordered_map<std::string, std::string> argMap;
    for (std::size_t i = 0; i < foundMacro->second.args.size(); i += 1u) {
      argMap[foundMacro->second.args[i]] = i < args.size() ? args[i] : std::string();
    }

    std::unordered_set<std::string> labelSet;
    for (const auto& entry : foundMacro->second.body) {
      const auto colon = entry.statement.find(':');
      if (colon == std::string::npos) continue;
      const auto label = trim_copy(entry.statement.substr(0, colon));
      if (is_label_identifier_native(label)) labelSet.insert(label);
    }

    const auto suffix = "_M" + std::to_string(macroCounter++);
    for (const auto& entry : foundMacro->second.body) {
      auto expandedStatement = entry.statement;
      for (const auto& replacement : argMap) {
        expandedStatement = replace_identifier_tokens(expandedStatement, replacement.first, replacement.second);
      }
      for (const auto& label : labelSet) {
        expandedStatement = replace_identifier_tokens(expandedStatement, label, label + suffix);
      }
      emitLine({ lineObj.lineNumber, lineObj.fileName, expandedStatement }, depth + 1);
    }
  };

  for (std::size_t i = 0; i < flattenedLines.size(); i += 1u) {
    const auto& lineEntry = flattenedLines[i];
    const auto& statement = lineEntry.statement;
    if (statement.empty()) continue;

    if (starts_with_ci(statement, ".eqv")) {
      const auto body = trim_copy(statement.substr(4));
      const auto tokens = tokenize_statement_native(body);
      if (tokens.size() < 2u || !is_label_identifier_native(tokens[0])) {
        errors.push_back({ lineEntry.lineNumber, "[" + lineEntry.fileName + "] Malformed .eqv directive." });
      } else {
        std::size_t valueStart = body.find(tokens[1]);
        const auto value = valueStart == std::string::npos ? std::string() : trim_copy(body.substr(valueStart));
        eqvMap[tokens[0]] = value;
      }
      continue;
    }

    if (starts_with_ci(statement, ".macro")) {
      const auto header = parse_macro_header_native(statement);
      if (!header.valid) {
        errors.push_back({ lineEntry.lineNumber, "[" + lineEntry.fileName + "] Malformed .macro header." });
        continue;
      }

      const auto key = header.name + "/" + std::to_string(header.args.size());
      if (macros.find(key) != macros.end()) {
        warnings.push_back({ lineEntry.lineNumber, "[" + lineEntry.fileName + "] Duplicate macro '" + key + "' ignored." });
      }

      std::vector<SourceLine> bodyLines;
      bool closed = false;
      while (i + 1u < flattenedLines.size()) {
        i += 1u;
        const auto& innerEntry = flattenedLines[i];
        const auto innerLine = trim_copy(strip_comment_native(innerEntry.statement));
        if (starts_with_ci(innerLine, ".macro")) {
          errors.push_back({ innerEntry.lineNumber, "[" + innerEntry.fileName + "] Nested macros are not allowed." });
          continue;
        }
        if (starts_with_ci(innerLine, ".end_macro")) {
          if (lower_copy(innerLine) != ".end_macro") {
            errors.push_back({ innerEntry.lineNumber, "[" + innerEntry.fileName + "] invalid text after .END_MACRO" });
          }
          closed = true;
          break;
        }
        if (!innerLine.empty()) bodyLines.push_back({ innerEntry.lineNumber, innerEntry.fileName, innerLine });
      }

      if (!closed) {
        errors.push_back({ lineEntry.lineNumber, "[" + lineEntry.fileName + "] Macro '" + header.name + "' missing .end_macro." });
        continue;
      }

      if (macros.find(key) == macros.end()) {
        macros[key] = { header.name, header.args, bodyLines };
      }
      continue;
    }

    if (starts_with_ci(statement, ".end_macro")) {
      if (lower_copy(statement) != ".end_macro") {
        errors.push_back({ lineEntry.lineNumber, "[" + lineEntry.fileName + "] invalid text after .END_MACRO" });
      } else {
        errors.push_back({ lineEntry.lineNumber, "[" + lineEntry.fileName + "] .END_MACRO without .MACRO" });
      }
      continue;
    }

    emitLine(lineEntry, 0);
  }

  const std::unordered_set<std::string> supportedDirectives = {
    ".text", ".data", ".ktext", ".kdata", ".byte", ".half", ".word", ".float", ".double",
    ".ascii", ".asciiz", ".align", ".space", ".extern", ".globl", ".set", ".include"
  };
  const auto hasAtRegisterToken = [](const std::string& statementText) {
    return lower_copy(statementText).find("$at") != std::string::npos;
  };
  const auto emitsAtFromPseudo = [&](const std::string& sourceStatement, const std::vector<std::string>& expandedStatements) {
    if (hasAtRegisterToken(sourceStatement)) return false;
    for (const auto& item : expandedStatements) {
      if (hasAtRegisterToken(item)) return true;
    }
    return false;
  };
  const std::uint32_t strictSegmentBytes = 4u * 1024u * 1024u;
  auto strictSegmentStart = [&](const std::string& segment) -> std::uint32_t {
    if (segment == "text") return memoryMap_.textBase;
    if (segment == "data") return memoryMap_.dataSegmentBase;
    if (segment == "ktext") return memoryMap_.kernelTextBase;
    if (segment == "kdata") return memoryMap_.kernelDataBase;
    if (segment == "stack") return (memoryMap_.stackBase - strictSegmentBytes) & 0xffffffffu;
    return 0u;
  };
  auto strictSegmentSize = [&](const std::string& segment) -> std::uint32_t {
    if (segment == "stack") return strictSegmentBytes + 4u;
    return strictSegmentBytes;
  };
  auto isStrictRangeInside = [](std::uint32_t start, std::uint32_t size, std::uint32_t address, std::uint32_t byteLength) {
    if (byteLength == 0u) return true;
    const std::uint64_t windowStart = static_cast<std::uint64_t>(start);
    const std::uint64_t windowEnd = windowStart + static_cast<std::uint64_t>(size);
    const std::uint64_t addrStart = static_cast<std::uint64_t>(address);
    const std::uint64_t addrEnd = addrStart + static_cast<std::uint64_t>(byteLength);
    return addrStart >= windowStart && addrEnd <= windowEnd;
  };
  auto validateStrictSegmentRange = [&](const std::string& segment, std::uint32_t address, std::uint32_t byteLength, std::int32_t line, const std::string& context) {
    if (!settings_.strictMarsCompatibility) return true;
    const auto start = strictSegmentStart(segment);
    const auto size = strictSegmentSize(segment);
    if (isStrictRangeInside(start, size, address, byteLength)) return true;
    errors.push_back({
      line,
      "Strict MARS segment limit exceeded for " + context + " at " + to_hex32(address) + " (" + std::to_string(byteLength) + " byte(s))."
    });
    return false;
  };

  auto updateSegment = [&](PassState& state, const std::string& directive, const std::string& token, std::int32_t lineNumber = 0) {
    const auto explicitValue = resolveValue(token, false);
    if (directive == ".text") {
      state.segment = "text";
      if (std::isfinite(explicitValue)) {
        const auto explicitAddress = static_cast<std::uint32_t>(explicitValue);
        if (validateStrictSegmentRange("text", explicitAddress, 1u, lineNumber, ".text directive")) {
          state.textAddress = explicitAddress;
        }
      }
    } else if (directive == ".data") {
      state.segment = "data";
      if (std::isfinite(explicitValue)) {
        const auto explicitAddress = static_cast<std::uint32_t>(explicitValue);
        if (validateStrictSegmentRange("data", explicitAddress, 1u, lineNumber, ".data directive")) {
          state.dataAddress = explicitAddress;
        }
      }
      state.autoAlignData = true;
      state.currentDataDirective = ".word";
    } else if (directive == ".ktext") {
      state.segment = "ktext";
      if (std::isfinite(explicitValue)) {
        const auto explicitAddress = static_cast<std::uint32_t>(explicitValue);
        if (validateStrictSegmentRange("ktext", explicitAddress, 1u, lineNumber, ".ktext directive")) {
          state.kernelTextAddress = explicitAddress;
        }
      }
    } else if (directive == ".kdata") {
      state.segment = "kdata";
      if (std::isfinite(explicitValue)) {
        const auto explicitAddress = static_cast<std::uint32_t>(explicitValue);
        if (validateStrictSegmentRange("kdata", explicitAddress, 1u, lineNumber, ".kdata directive")) {
          state.kernelDataAddress = explicitAddress;
        }
      }
      state.autoAlignKernelData = true;
      state.currentDataDirective = ".word";
    }
  };

  PassState pass1;
  pass1.textAddress = memoryMap_.textBase;
  pass1.externAddress = memoryMap_.externBase;
  pass1.dataAddress = memoryMap_.dataBase;
  pass1.kernelTextAddress = memoryMap_.kernelTextBase;
  pass1.kernelDataAddress = memoryMap_.kernelDataBase;

  auto alignAddress = [](std::uint32_t& address, std::uint32_t alignment) {
    if (alignment <= 1u) return;
    address = (address + alignment - 1u) & ~(alignment - 1u);
  };

  auto processDataDirective = [&](const std::string& statement, std::int32_t line, PassState& state, bool sizeOnly) -> bool {
    const auto tokens = tokenize_statement_native(statement);
    if (tokens.empty()) return true;
    const auto directive = lower_copy(tokens[0]);
    const auto args = split_arguments_native(trim_copy(statement.substr(tokens[0].size())));
    auto& address = state.segment == "kdata" ? state.kernelDataAddress : state.dataAddress;
    auto& autoAlign = state.segment == "kdata" ? state.autoAlignKernelData : state.autoAlignData;
    const auto currentDataSegment = state.segment == "kdata" ? std::string("kdata") : std::string("data");
    const auto enforceStrictDataRange = [&](std::uint32_t byteLength, const std::string& contextLabel) {
      return validateStrictSegmentRange(currentDataSegment, address, byteLength, line, contextLabel);
    };
    const auto alignAddressRef = [&](std::uint32_t alignment) {
      if (alignment <= 1u) return;
      address = (address + alignment - 1u) & ~(alignment - 1u);
    };
    const auto writeIntegerBySize = [&](std::uint32_t addr, int size, std::uint32_t value) {
      if (size == 1) {
        writeByte(addr, static_cast<std::uint8_t>(value & 0xffu));
      } else if (size == 2) {
        writeByte(addr, static_cast<std::uint8_t>(value & 0xffu));
        writeByte((addr + 1u) & 0xffffffffu, static_cast<std::uint8_t>((value >> 8u) & 0xffu));
      } else {
        writeByte(addr, static_cast<std::uint8_t>(value & 0xffu));
        writeByte((addr + 1u) & 0xffffffffu, static_cast<std::uint8_t>((value >> 8u) & 0xffu));
        writeByte((addr + 2u) & 0xffffffffu, static_cast<std::uint8_t>((value >> 16u) & 0xffu));
        writeByte((addr + 3u) & 0xffffffffu, static_cast<std::uint8_t>((value >> 24u) & 0xffu));
      }
    };
    const auto warnIfTruncated = [&](std::int32_t value, int size) {
      if (size == 1 && (value < -128 || value > 127)) {
        warnings.push_back({ line, "Value '" + std::to_string(value) + "' is out-of-range for .byte and may be truncated." });
      }
      if (size == 2 && (value < -32768 || value > 32767)) {
        warnings.push_back({ line, "Value '" + std::to_string(value) + "' is out-of-range for .half and may be truncated." });
      }
    };
    const auto parseRepeatedArg = [&](const std::string& arg, std::string& valueToken, std::int32_t& repetitions) -> bool {
      const auto colon = arg.rfind(':');
      if (colon == std::string::npos) {
        valueToken = trim_copy(arg);
        repetitions = 1;
        return true;
      }
      valueToken = trim_copy(arg.substr(0, colon));
      bool ok = false;
      const auto count = parse_immediate_native(arg.substr(colon + 1u), &ok);
      if (!ok || count <= 0) {
        errors.push_back({ line, "Invalid repetition factor '" + trim_copy(arg.substr(colon + 1u)) + "' in '" + arg + "'." });
        return false;
      }
      repetitions = count;
      return true;
    };

    if (directive == ".globl") {
      auto globlArgs = args;
      if (globlArgs.size() <= 1u && tokens.size() > 1u) {
        globlArgs.assign(tokens.begin() + 1u, tokens.end());
      }
      if (globlArgs.empty()) {
        errors.push_back({ line, "\".globl\" directive requires at least one argument." });
        return true;
      }
      for (const auto& token : globlArgs) {
        const auto symbol = trim_copy(token);
        if (!is_label_identifier_native(symbol)) {
          errors.push_back({ line, "\".globl\" directive argument must be label." });
          return true;
        }
        state.globalDeclarations.insert(symbol);
      }
      return true;
    }
    if (directive == ".extern") {
      auto externArgs = args;
      if (externArgs.size() != 2u && tokens.size() == 3u) {
        externArgs = { tokens[1], tokens[2] };
      }
      if (externArgs.size() != 2u) {
        errors.push_back({ line, "\".extern\" directive requires two operands (label and size)." });
        return true;
      }
      const auto symbol = trim_copy(externArgs[0]);
      bool ok = false;
      const auto size = parse_immediate_native(externArgs[1], &ok);
      if (!is_label_identifier_native(symbol)) {
        errors.push_back({ line, "Invalid .extern symbol '" + externArgs[0] + "'." });
        return true;
      }
      if (!ok || size < 0) {
        errors.push_back({ line, "\".extern\" requires a non-negative integer size" });
        return true;
      }
      if (labels.find(symbol) == labels.end()) {
        labels[symbol] = state.externAddress;
        labelsOrdered.push_back({ symbol, state.externAddress });
        state.externAddress = (state.externAddress + static_cast<std::uint32_t>(size)) & 0xffffffffu;
      }
      return true;
    }
    if (directive == ".set") {
      if (args.empty()) {
        errors.push_back({ line, "\".set\" requires at least one argument." });
        return true;
      }
      if (sizeOnly) warnings.push_back({ line, "MARS currently ignores the .set directive." });
      return true;
    }
    if (directive == ".include") {
      return true;
    }
    if (directive == ".align") {
      if (args.size() != 1u) {
        errors.push_back({ line, "\".align\" requires one operand" });
        return true;
      }
      bool ok = false;
      const auto amount = parse_immediate_native(args[0], &ok);
      if (!ok || amount < 0) {
        errors.push_back({ line, "\".align\" requires a non-negative integer" });
        return true;
      }
      if (amount <= 0) autoAlign = false;
      else {
        autoAlign = true;
        alignAddressRef(1u << std::min<std::uint32_t>(static_cast<std::uint32_t>(amount), 16u));
      }
      return true;
    }
    if (directive == ".space") {
      if (args.size() != 1u) {
        errors.push_back({ line, "\".space\" requires one operand" });
        return true;
      }
      bool ok = false;
      const auto amount = parse_immediate_native(args[0], &ok);
      if (!ok || amount < 0) {
        errors.push_back({ line, "\".space\" requires a non-negative integer" });
        return true;
      }
      if (!enforceStrictDataRange(static_cast<std::uint32_t>(amount), directive)) return true;
      address = (address + static_cast<std::uint32_t>(amount)) & 0xffffffffu;
      return true;
    }
    if (directive == ".ascii" || directive == ".asciiz") {
      for (const auto& arg : args) {
        bool ok = false;
        const auto text = parse_string_literal_native(arg, &ok);
        if (!ok) {
          errors.push_back({ line, "Malformed string literal in data directive." });
          continue;
        }
        const auto totalBytes = static_cast<std::uint32_t>(text.size() + (directive == ".asciiz" ? 1u : 0u));
        if (!enforceStrictDataRange(totalBytes, directive)) return true;
        for (const char ch : text) {
          if (!sizeOnly) writeByte(address, static_cast<std::uint8_t>(ch));
          address = (address + 1u) & 0xffffffffu;
        }
        if (directive == ".asciiz") {
          if (!sizeOnly) writeByte(address, 0);
          address = (address + 1u) & 0xffffffffu;
        }
      }
      return true;
    }

    int size = directive == ".byte" ? 1 : directive == ".half" ? 2 : (directive == ".word" || directive == ".float" ? 4 : directive == ".double" ? 8 : 0);
    if (size == 0) {
      fallbackReason = "directive:" + directive;
      return false;
    }
    if (autoAlign && size > 1) alignAddressRef(size == 8 ? 8u : static_cast<std::uint32_t>(size));

    for (const auto& arg : args) {
      std::string valueToken;
      std::int32_t repetitions = 1;
      if (!parseRepeatedArg(arg, valueToken, repetitions)) continue;
      for (std::int32_t repetition = 0; repetition < repetitions; repetition += 1) {
        const auto bytesNeeded = directive == ".double" ? 8u : static_cast<std::uint32_t>(size);
        if (!enforceStrictDataRange(bytesNeeded, directive)) return true;
        if (directive == ".float" || directive == ".double") {
          char* end = nullptr;
          const auto number = directive == ".float" ? static_cast<double>(std::strtof(valueToken.c_str(), &end)) : std::strtod(valueToken.c_str(), &end);
          if (!end || !trim_copy(end).empty()) {
            errors.push_back({ line, "Invalid " + directive + " value '" + valueToken + "'." });
          } else if (!sizeOnly) {
            if (directive == ".float") {
              const auto number32 = static_cast<float>(number);
              std::uint32_t bits = 0;
              std::memcpy(&bits, &number32, sizeof(bits));
              writeIntegerBySize(address, 4, bits);
            } else {
              std::uint64_t bits = 0;
              std::memcpy(&bits, &number, sizeof(bits));
              for (std::uint32_t i = 0; i < 8u; i += 1u) {
                writeByte((address + i) & 0xffffffffu, static_cast<std::uint8_t>((bits >> (8u * i)) & 0xffu));
              }
            }
          }
          address = (address + static_cast<std::uint32_t>(size)) & 0xffffffffu;
          continue;
        }

        const auto resolved = resolveValue(valueToken, false);
        if (!std::isfinite(resolved)) {
          errors.push_back({ line, "Cannot resolve '" + valueToken + "' in data directive." });
        } else if (!sizeOnly) {
          const auto narrowed = static_cast<std::int32_t>(resolved);
          warnIfTruncated(narrowed, size);
          writeIntegerBySize(address, size, static_cast<std::uint32_t>(narrowed));
        } else {
          warnIfTruncated(static_cast<std::int32_t>(resolved), size);
        }
        address = (address + static_cast<std::uint32_t>(size)) & 0xffffffffu;
      }
    }
    return true;
  };

  auto predictAlignedDataLabelAddress = [&](const PassState& state, const std::string& statement) -> std::optional<std::uint32_t> {
    if (state.segment != "data" && state.segment != "kdata") return std::nullopt;
    const auto colon = statement.find(':');
    if (colon == std::string::npos) return std::nullopt;
    const auto stripped = trim_copy(statement.substr(colon + 1u));
    if (stripped.empty() || stripped[0] != '.') return std::nullopt;
    const auto tokens = tokenize_statement_native(stripped);
    if (tokens.empty()) return std::nullopt;
    const auto directive = lower_copy(tokens[0]);
    std::uint32_t alignment = 0;
    if (directive == ".half") alignment = 2u;
    else if (directive == ".word" || directive == ".float") alignment = 4u;
    else if (directive == ".double") alignment = 8u;
    if (alignment <= 1u) return std::nullopt;
    const bool autoAlign = state.segment == "kdata" ? state.autoAlignKernelData : state.autoAlignData;
    if (!autoAlign) return std::nullopt;
    std::uint32_t address = state.segment == "kdata" ? state.kernelDataAddress : state.dataAddress;
    address = (address + alignment - 1u) & ~(alignment - 1u);
    return address;
  };

  auto applyLabel = [&](const std::string& statement, const PassState& state, std::int32_t line, bool record, std::string& stripped) {
    stripped = statement;
    const auto colon = statement.find(':');
    if (colon == std::string::npos) return;
    const auto label = trim_copy(statement.substr(0, colon));
    if (label.empty()) return;
    if (record) {
      std::uint32_t address = state.textAddress;
      if (state.segment == "data") address = predictAlignedDataLabelAddress(state, statement).value_or(state.dataAddress);
      else if (state.segment == "ktext") address = state.kernelTextAddress;
      else if (state.segment == "kdata") address = predictAlignedDataLabelAddress(state, statement).value_or(state.kernelDataAddress);
      if (labels.find(label) != labels.end()) errors.push_back({ line, "Duplicate label '" + label + "'." });
      else {
        labels[label] = address;
        labelsOrdered.push_back({ label, address });
      }
    }
    stripped = trim_copy(statement.substr(colon + 1));
  };

  for (const auto& line : lines) {
    std::string statement;
    applyLabel(line.statement, pass1, line.lineNumber, true, statement);
    if (statement.empty()) continue;
    if (statement[0] == '.') {
      const auto tokens = tokenize_statement_native(statement);
      const auto directive = lower_copy(tokens[0]);
      if (directive == ".text" || directive == ".data" || directive == ".ktext" || directive == ".kdata") {
        updateSegment(pass1, directive, tokens.size() > 1 ? tokens[1] : std::string(), line.lineNumber);
        continue;
      }
      if (supportedDirectives.find(directive) == supportedDirectives.end()) {
        fallbackReason = "directive:" + directive;
        return buildResult(false, true);
      }
      const bool canProcess = pass1.segment == "data" || pass1.segment == "kdata" || directive == ".globl" || directive == ".set" || directive == ".extern" || directive == ".include";
      if (!canProcess) {
        errors.push_back({ line.lineNumber, "[" + line.fileName + "] \"" + directive + "\" directive cannot appear in text segment" });
        continue;
      }
      if (!processDataDirective(statement, line.lineNumber, pass1, true)) return buildResult(false, true);
      if (directive == ".byte" || directive == ".half" || directive == ".word" || directive == ".float" || directive == ".double" || directive == ".ascii" || directive == ".asciiz") {
        pass1.currentDataDirective = directive;
      }
      continue;
    }
    if (pass1.segment == "data" || pass1.segment == "kdata") {
      if (!processDataDirective(pass1.currentDataDirective + " " + statement, line.lineNumber, pass1, true)) return buildResult(false, true);
      continue;
    }
    std::vector<std::string> expanded;
    if (!expandPseudo(statement, true, pass1.macro, expanded)) {
      fallbackReason = "pseudo:" + lower_copy(tokenize_statement_native(statement).front());
      return buildResult(false, true);
    }
    const auto expansionBytes = static_cast<std::uint32_t>(expanded.size() * 4u);
    if (pass1.segment == "text") {
      if (!validateStrictSegmentRange("text", pass1.textAddress, expansionBytes, line.lineNumber, "instruction expansion")) continue;
      pass1.textAddress = (pass1.textAddress + expansionBytes) & 0xffffffffu;
    } else {
      if (!validateStrictSegmentRange("ktext", pass1.kernelTextAddress, expansionBytes, line.lineNumber, "instruction expansion")) continue;
      pass1.kernelTextAddress = (pass1.kernelTextAddress + expansionBytes) & 0xffffffffu;
    }
  }

  PassState pass2;
  pass2.textAddress = memoryMap_.textBase;
  pass2.externAddress = memoryMap_.externBase;
  pass2.dataAddress = memoryMap_.dataBase;
  pass2.kernelTextAddress = memoryMap_.kernelTextBase;
  pass2.kernelDataAddress = memoryMap_.kernelDataBase;

  auto resolveMemoryOperand = [&](const std::string& token, std::int32_t& base, std::int32_t& offset, std::uint32_t& absolute) -> bool {
    base = -1;
    offset = 0;
    absolute = 0;
    const auto clean = trim_copy(token);
    const auto open = clean.find('(');
    const auto close = clean.find(')');
    if (open != std::string::npos && close != std::string::npos && close > open) {
      base = resolve_register_token(clean.substr(open + 1, close - open - 1));
      if (base < 0) return false;
      const auto left = trim_copy(clean.substr(0, open));
      const auto value = left.empty() ? 0.0 : resolveValue(left, false);
      if (!left.empty() && !std::isfinite(value)) return false;
      offset = static_cast<std::int32_t>(value);
      return true;
    }
    const auto resolved = resolveValue(clean, false);
    if (!std::isfinite(resolved)) return false;
    offset = static_cast<std::int32_t>(resolved);
    absolute = static_cast<std::uint32_t>(resolved);
    return true;
  };

  auto branchTarget = [&](const std::string& token, std::uint32_t nextPc) -> std::uint32_t {
    auto found = labels.find(trim_copy(token));
    if (found != labels.end()) return found->second;
    bool immediateOk = false;
    const auto immediate = parse_immediate_native(token, &immediateOk);
    if (immediateOk) return (nextPc + (static_cast<std::uint32_t>(immediate) << 2u)) & 0xffffffffu;
    const auto resolved = resolveValue(token, false);
    return std::isfinite(resolved) ? static_cast<std::uint32_t>(resolved) : 0u;
  };

  auto buildProgramRow = [&](std::uint32_t address, std::int32_t line, const std::string& basic) {
    ProgramRow row;
    row.address = address;
    row.line = line;
    row.basic = basic;
    const auto tokens = tokenize_statement_native(basic);
    if (tokens.empty()) return row;
    const auto opcode = lower_copy(tokens[0]);
    row.opcodeName = opcode;
    row.op = parse_opcode(opcode);
    if (opcode == "syscall" || is_delegate_basic_opcode(opcode)) {
      row.delegate = true;
      row.delegateReason = opcode == "syscall" ? "syscall" : "delegate";
      row.op = Opcode::Delegate;
      return row;
    }
    if (row.op == Opcode::Delegate) {
      row.delegate = true;
      row.delegateReason = "unsupported";
      return row;
    }
    auto reg = [&](std::size_t index) { return index < tokens.size() ? resolve_register_token(tokens[index]) : -1; };
    auto freg = [&](std::size_t index) { return index < tokens.size() ? resolve_float_register_token(tokens[index]) : -1; };
    auto cop0 = [&](std::size_t index) { return index < tokens.size() ? resolve_cop0_register_token(tokens[index]) : -1; };
    auto imm = [&](std::size_t index) -> std::int32_t { return index < tokens.size() && std::isfinite(resolveValue(tokens[index], false)) ? static_cast<std::int32_t>(resolveValue(tokens[index], false)) : 0; };
    const auto nextPc = address + 4u;

    if (opcode == "nop" || opcode == "eret") {
      return row;
    }
    if (opcode == "break") row.immediate = tokens.size() > 1 ? imm(1) : 0;
    else if (opcode == "lui") { row.rt = reg(1); row.immediate = imm(2); }
    else if (opcode == "mfc0" || opcode == "mtc0") { row.rt = reg(1); row.rd = cop0(2); }
    else if (opcode == "mfc1" || opcode == "mtc1") { row.rt = reg(1); row.fs = freg(2); }
    else if (opcode == "mfhi" || opcode == "mflo" || opcode == "mthi" || opcode == "mtlo") row.rd = reg(1);
    else if (opcode == "j" || opcode == "jal") row.target = branchTarget(tokens[1], nextPc);
    else if (opcode == "jr") { row.rs = reg(1); row.rd = -1; }
    else if (opcode == "jalr") {
      row.rd = tokens.size() > 2 ? reg(1) : 31;
      row.rs = tokens.size() > 2 ? reg(2) : reg(1);
    }
    else if (opcode == "bc1f" || opcode == "bc1t") {
      row.cc = tokens.size() > 2 ? (imm(1) & 0x7) : 0;
      row.target = branchTarget(tokens.size() > 2 ? tokens[2] : tokens[1], nextPc);
    } else if (opcode == "beq" || opcode == "bne") { row.rs = reg(1); row.rt = reg(2); row.target = branchTarget(tokens[3], nextPc); }
    else if (opcode == "bgtz" || opcode == "blez" || opcode == "bltz" || opcode == "bgez" || opcode == "bgezal" || opcode == "bltzal") { row.rs = reg(1); row.target = branchTarget(tokens[2], nextPc); }
    else if (opcode == "movf" || opcode == "movt") { row.rd = reg(1); row.rs = reg(2); row.cc = tokens.size() > 3 ? (imm(3) & 0x7) : 0; }
    else if (opcode == "lw" || opcode == "sw" || opcode == "lb" || opcode == "lbu" || opcode == "sb" || opcode == "lh" || opcode == "lhu" || opcode == "sh" || opcode == "ll" || opcode == "sc" || opcode == "lwl" || opcode == "lwr" || opcode == "swl" || opcode == "swr" || opcode == "lwc1" || opcode == "swc1") {
      std::int32_t base = -1, offset = 0; std::uint32_t absolute = 0;
      if (!resolveMemoryOperand(tokens[2], base, offset, absolute)) {
        row.delegate = true;
        row.delegateReason = "malformed";
        row.op = Opcode::Delegate;
      } else {
        row.base = base;
        row.immediate = offset;
        row.absolute = absolute;
        if (opcode == "lwc1" || opcode == "swc1") row.fs = freg(1);
        else row.rt = reg(1);
      }
    } else if (opcode == "add" || opcode == "addu" || opcode == "sub" || opcode == "subu" || opcode == "and" || opcode == "or" || opcode == "xor" || opcode == "nor" || opcode == "slt" || opcode == "sltu" || opcode == "mul" || opcode == "movn" || opcode == "movz") { row.rd = reg(1); row.rs = reg(2); row.rt = reg(3); }
    else if (opcode == "clz" || opcode == "clo") { row.rd = reg(1); row.rs = reg(2); }
    else if (opcode == "addi" || opcode == "addiu" || opcode == "andi" || opcode == "ori" || opcode == "xori" || opcode == "slti" || opcode == "sltiu") { row.rt = reg(1); row.rs = reg(2); row.immediate = imm(3); }
    else if (opcode == "sll" || opcode == "srl" || opcode == "sra") { row.rd = reg(1); row.rt = reg(2); row.immediate = imm(3); }
    else if (opcode == "sllv" || opcode == "srlv" || opcode == "srav") { row.rd = reg(1); row.rt = reg(2); row.rs = reg(3); }
    else if (opcode == "mult" || opcode == "multu" || opcode == "div" || opcode == "divu" || opcode == "madd" || opcode == "maddu" || opcode == "msub" || opcode == "msubu" || opcode == "teq" || opcode == "tne" || opcode == "tge" || opcode == "tgeu" || opcode == "tlt" || opcode == "tltu") { row.rs = reg(1); row.rt = reg(2); }
    else if (opcode == "teqi" || opcode == "tnei" || opcode == "tgei" || opcode == "tgeiu" || opcode == "tlti" || opcode == "tltiu") { row.rs = reg(1); row.immediate = imm(2); }
    else { row.delegate = true; row.delegateReason = "delegate"; row.op = Opcode::Delegate; }
    return row;
  };

  auto chooseInstructionExample = [&](const std::string& opcode, std::int32_t operandCount) {
    const auto found = referenceInstructionIndex.find(lower_copy(opcode));
    if (found == referenceInstructionIndex.end() || found->second.empty()) return lower_copy(opcode);
    const auto desired = std::max(0, operandCount);
    auto entries = found->second;
    std::sort(entries.begin(), entries.end(), [&](const auto& left, const auto& right) {
      const auto leftDelta = std::abs(left.operandCount - desired);
      const auto rightDelta = std::abs(right.operandCount - desired);
      if (leftDelta != rightDelta) return leftDelta < rightDelta;
      return left.order < right.order;
    });
    return !entries.front().example.empty() ? entries.front().example : lower_copy(opcode);
  };

  auto pushInstructionCountError = [&](std::int32_t line, const std::string& opcodeToken, std::int32_t operandCount) {
    const auto found = referenceInstructionIndex.find(lower_copy(opcodeToken));
    if (found == referenceInstructionIndex.end() || found->second.empty()) {
      errors.push_back({ line, "\"" + opcodeToken + "\" is not a recognized operator" });
      return;
    }
    std::int32_t minOperands = found->second.front().operandCount;
    for (const auto& entry : found->second) minOperands = std::min(minOperands, entry.operandCount);
    const auto example = chooseInstructionExample(opcodeToken, operandCount);
    const auto detail = operandCount < minOperands
      ? "Too few or incorrectly formatted operands. Expected: " + example
      : "Too many or incorrectly formatted operands. Expected: " + example;
    errors.push_back({ line, "\"" + opcodeToken + "\": " + detail });
  };

  auto pushInstructionFormatError = [&](std::int32_t line, const std::string& opcodeToken, std::int32_t operandCount) {
    const auto found = referenceInstructionIndex.find(lower_copy(opcodeToken));
    if (found == referenceInstructionIndex.end() || found->second.empty()) {
      errors.push_back({ line, "\"" + opcodeToken + "\" is not a recognized operator" });
      return;
    }
    const auto example = chooseInstructionExample(opcodeToken, operandCount);
    errors.push_back({ line, "\"" + opcodeToken + "\": Too few or incorrectly formatted operands. Expected: " + example });
  };

  auto validateBasicInstruction = [&](const std::string& basic, std::int32_t line) -> bool {
    const auto tokens = tokenize_statement_native(basic);
    if (tokens.empty()) return true;
    const auto opcodeToken = tokens[0];
    const auto opcode = lower_copy(opcodeToken);
    const auto operandCount = static_cast<std::int32_t>(tokens.size() > 0u ? tokens.size() - 1u : 0u);
    if (opcode != "syscall" && !is_delegate_basic_opcode(opcode) && parse_opcode(opcode) == Opcode::Delegate) {
      errors.push_back({ line, "\"" + opcodeToken + "\" is not a recognized operator" });
      return false;
    }
    const auto found = referenceInstructionIndex.find(opcode);
    if (found != referenceInstructionIndex.end() && !found->second.empty()) {
      bool operandCountMatch = false;
      for (const auto& entry : found->second) {
        if (entry.operandCount == operandCount) {
          operandCountMatch = true;
          break;
        }
      }
      if (!operandCountMatch) {
        pushInstructionCountError(line, opcodeToken, operandCount);
        return false;
      }
    }
    if (opcode == "lw" || opcode == "sw" || opcode == "lb" || opcode == "lbu" || opcode == "sb" || opcode == "lh" || opcode == "lhu" || opcode == "sh" || opcode == "ll" || opcode == "sc" || opcode == "lwl" || opcode == "lwr" || opcode == "swl" || opcode == "swr" || opcode == "lwc1" || opcode == "swc1") {
      std::int32_t base = -1;
      std::int32_t offset = 0;
      std::uint32_t absolute = 0;
      if (tokens.size() < 3u || !resolveMemoryOperand(tokens[2], base, offset, absolute)) {
        pushInstructionFormatError(line, opcodeToken, operandCount);
        return false;
      }
    }
    return true;
  };

  for (const auto& line : lines) {
    std::string statement;
    applyLabel(line.statement, pass2, line.lineNumber, false, statement);
    if (statement.empty()) continue;
    if (statement[0] == '.') {
      const auto tokens = tokenize_statement_native(statement);
      const auto directive = lower_copy(tokens[0]);
      if (directive == ".text" || directive == ".data" || directive == ".ktext" || directive == ".kdata") {
        updateSegment(pass2, directive, tokens.size() > 1 ? tokens[1] : std::string(), line.lineNumber);
        continue;
      }
      if (supportedDirectives.find(directive) == supportedDirectives.end()) {
        errors.push_back({ line.lineNumber, "[" + line.fileName + "] \"" + directive + "\" directive is invalid or not implemented in MARS" });
        continue;
      }
      const bool canProcess = pass2.segment == "data" || pass2.segment == "kdata" || directive == ".globl" || directive == ".set" || directive == ".extern" || directive == ".include";
      if (!canProcess) {
        errors.push_back({ line.lineNumber, "[" + line.fileName + "] \"" + directive + "\" directive cannot appear in text segment" });
        continue;
      }
      if (!processDataDirective(statement, line.lineNumber, pass2, false)) return buildResult(false, true);
      if (directive == ".byte" || directive == ".half" || directive == ".word" || directive == ".float" || directive == ".double" || directive == ".ascii" || directive == ".asciiz") {
        pass2.currentDataDirective = directive;
      }
      continue;
    }
    if (pass2.segment == "data" || pass2.segment == "kdata") {
      if (!processDataDirective(pass2.currentDataDirective + " " + statement, line.lineNumber, pass2, false)) return buildResult(false, true);
      continue;
    }
    std::vector<std::string> expanded;
    if (!expandPseudo(statement, false, pass2.macro, expanded)) {
      fallbackReason = "pseudo:" + lower_copy(tokenize_statement_native(statement).front());
      return buildResult(false, true);
    }
    const auto emissionBytes = static_cast<std::uint32_t>(expanded.size() * 4u);
    const auto currentSegment = pass2.segment == "text" ? std::string("text") : std::string("ktext");
    const auto currentAddress = pass2.segment == "text" ? pass2.textAddress : pass2.kernelTextAddress;
    if (!validateStrictSegmentRange(currentSegment, currentAddress, emissionBytes, line.lineNumber, "instruction emission")) {
      continue;
    }
    for (std::size_t index = 0; index < expanded.size(); index += 1u) {
      if (!validateBasicInstruction(expanded[index], line.lineNumber)) continue;
      const auto address = pass2.segment == "text" ? pass2.textAddress : pass2.kernelTextAddress;
      const auto row = buildProgramRow(address, line.lineNumber, expanded[index]);
      const auto machineCodeWord = encode_instruction_word_from_program_row(row);
      if (machineCodeWord.has_value()) {
        const auto encoded = machineCodeWord.value();
        setByte(address, static_cast<std::uint8_t>(encoded & 0xffu));
        setByte((address + 1u) & 0xffffffffu, static_cast<std::uint8_t>((encoded >> 8u) & 0xffu));
        setByte((address + 2u) & 0xffffffffu, static_cast<std::uint8_t>((encoded >> 16u) & 0xffu));
        setByte((address + 3u) & 0xffffffffu, static_cast<std::uint8_t>((encoded >> 24u) & 0xffu));
      }
      const auto machineCodeHex = machineCodeWord.has_value() ? to_hex32(machineCodeWord.value()) : std::string();
      textRows.push_back({
        address,
        line.lineNumber,
        index == 0 ? statement : std::string(),
        expanded[index],
        machineCodeWord.has_value() ? machineCodeHex : to_hex32(stable_hash_native(expanded[index])),
        machineCodeHex
      });
      programRows_.push_back(row);
      programIndex_[address] = programRows_.size() - 1u;
      if (pass2.segment == "text") pass2.textAddress = (pass2.textAddress + 4u) & 0xffffffffu;
      else pass2.kernelTextAddress = (pass2.kernelTextAddress + 4u) & 0xffffffffu;
    }
  }

  clearExecutionHistory();
  delayedBranchTarget_ = -1;
  lastMemoryWriteAddress_ = -1;
  heapPointer_ = memoryMap_.heapBase;
  registers_[28] = clamp32(memoryMap_.globalPointer);
  registers_[29] = clamp32(memoryMap_.stackPointer);
  steps_ = 0;
  if (settings_.warningsAreErrors && !warnings.empty()) {
    for (const auto& warning : warnings) {
      errors.push_back({ warning.line, "Warning treated as error: " + warning.message });
    }
  }

  if (settings_.maxErrors > 0 && errors.size() > static_cast<std::size_t>(settings_.maxErrors)) {
    errors.resize(static_cast<std::size_t>(settings_.maxErrors));
  }

  halted_ = false;
  assembled_ = errors.empty();
  forceZeroRegister();

  const auto mainLabel = labels.find("main");
  pc_ = (settings_.startAtMain && mainLabel != labels.end()) ? mainLabel->second : memoryMap_.textBase;

  if (errors.empty() && programArgumentsEnabled && !programArgumentsLine.empty()) {
    std::vector<std::string> args;
    std::string current;
    bool inSingle = false;
    bool inDouble = false;
    for (std::size_t i = 0; i < programArgumentsLine.size(); i += 1u) {
      const char ch = programArgumentsLine[i];
      const char prev = i > 0 ? programArgumentsLine[i - 1] : '\0';
      if (ch == '"' && !inSingle && prev != '\\') { inDouble = !inDouble; continue; }
      if (ch == '\'' && !inDouble && prev != '\\') { inSingle = !inSingle; continue; }
      if (!inSingle && !inDouble && std::isspace(static_cast<unsigned char>(ch)) != 0) {
        if (!current.empty()) { args.push_back(current); current.clear(); }
        continue;
      }
      current.push_back(ch);
    }
    if (!current.empty()) args.push_back(current);

    auto stackCursor = memoryMap_.stackPointer;
    std::vector<std::uint32_t> argPointers(args.size(), 0);
    for (std::int32_t i = static_cast<std::int32_t>(args.size()) - 1; i >= 0; i -= 1) {
      const auto& arg = args[static_cast<std::size_t>(i)];
      stackCursor = (stackCursor - static_cast<std::uint32_t>(arg.size() + 1u)) & 0xffffffffu;
      for (std::size_t charIndex = 0; charIndex < arg.size(); charIndex += 1u) {
        writeByte(stackCursor + static_cast<std::uint32_t>(charIndex), static_cast<std::uint8_t>(arg[charIndex]));
      }
      writeByte(stackCursor + static_cast<std::uint32_t>(arg.size()), 0);
      argPointers[static_cast<std::size_t>(i)] = stackCursor;
    }
    stackCursor &= ~0x3u;
    stackCursor = (stackCursor - 4u) & 0xffffffffu;
    writeWord(stackCursor, 0);
    for (std::int32_t i = static_cast<std::int32_t>(argPointers.size()) - 1; i >= 0; i -= 1) {
      stackCursor = (stackCursor - 4u) & 0xffffffffu;
      writeWord(stackCursor, static_cast<std::int32_t>(argPointers[static_cast<std::size_t>(i)]));
    }
    registers_[4] = static_cast<std::int32_t>(args.size());
    registers_[5] = clamp32(stackCursor);
    registers_[29] = clamp32(stackCursor);
    forceZeroRegister();
  }

  if (!errors.empty()) {
    assembled_ = false;
    pc_ = memoryMap_.textBase;
  }

  return buildResult(errors.empty(), false);
}
