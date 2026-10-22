import { chapters, parts, MANUAL } from "../content/index.mjs";

/* =========================================================================
   Manual do webMARS — composição e navegação
   O conteúdo editorial vive em content/*.mjs. Este módulo compõe a página
   como um livro: cabeça corrente, numeração de figuras, notas na margem,
   listagens anotadas e glosa marginal a partir dos catálogos do produto.
   ========================================================================= */

const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
const APPENDIX_IDS = ["sobre-o-manual", "cobertura", "changelog"];

const book = document.querySelector("#book");
const nav = document.querySelector("#chapter-navigation");
const article = document.querySelector("#chapter-content");
const navToggle = document.querySelector("#nav-toggle");
const navScrim = document.querySelector("#nav-scrim");
const runningRecto = document.querySelector("#running-recto");
const readingProgress = document.querySelector("#reading-progress");
const themeToggle = document.querySelector("#theme-toggle");
const themeGlyph = document.querySelector("#theme-glyph");
const announcer = document.querySelector("#route-announcer");
const searchDialog = document.querySelector("#search-dialog");
const searchTrigger = document.querySelector("#search-trigger");
const searchInput = document.querySelector("#search-input");
const searchResults = document.querySelector("#search-results");
const searchHint = document.querySelector("#search-hint");
const toast = document.querySelector("#toast");
const appLink = document.querySelector("#webmars-app-link");
const supportLink = document.querySelector("#manual-support-link");
const brandEdition = document.querySelector(".brand-edition");
const chapterFilter = document.querySelector("#chapter-filter");
const embedded = window.parent !== window && new URLSearchParams(location.search).get("embedded") === "1";

if (brandEdition) brandEdition.textContent = `Ed. ${MANUAL.displayVersion.replace(/^v/, "")}`;

if (appLink) {
  appLink.href = String(window.WebMarsManualConfig?.appUrl || "../");
}
if (supportLink) {
  const supportUrl = String(window.WebMarsManualConfig?.supportUrl || "").trim();
  if (supportUrl) {
    supportLink.href = supportUrl;
    supportLink.hidden = false;
  }
}

let currentChapter = null;
let sectionObserver = null;
let referenceDataPromise = null;
let referenceData = null;
let referenceTab = "basicInstructions";
let referenceFilter = "";
let searchCursor = -1;
let toastTimer = 0;
let activeGloss = null;

/* --- Utilitários -------------------------------------------------------- */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  return (template.content.textContent || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9$#.]+/g, " ")
    .trim();
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function romanize(index) {
  return ROMAN[index] || String(index);
}

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [chapterId = "inicio", ...sectionParts] = raw.split("/").filter(Boolean);
  return { chapterId, sectionId: sectionParts.join("/") };
}

function chapterHref(chapterId, sectionId = "") {
  return `#/${chapterId}${sectionId ? `/${sectionId}` : ""}`;
}

function readingLabel(minutes) {
  return `${minutes} min`;
}

/* --- Índice lateral ----------------------------------------------------- */

function chaptersOfPart(part) {
  return chapters.filter((chapter) => chapter.part === part && !APPENDIX_IDS.includes(chapter.id));
}

function navEntryTitle(chapter) {
  return chapter.home ? "Folha de rosto" : chapter.title;
}

function renderNavigation() {
  nav.innerHTML = parts.map((part, index) => {
    const entries = chaptersOfPart(part);
    if (!entries.length) return "";
    return `<section class="nav-part">
      <p class="nav-part-label"><span class="part-numeral">Parte ${romanize(index + 1)}</span><span>${escapeHtml(part)}</span></p>
      <ul>${entries.map((chapter) => `<li>
        <a class="nav-chapter" href="${chapterHref(chapter.id)}" data-chapter-link="${escapeHtml(chapter.id)}">
          <span class="nav-numeral">${escapeHtml(chapter.number || "—")}</span>
          <span>${escapeHtml(navEntryTitle(chapter))}</span>
        </a>
      </li>`).join("")}</ul>
    </section>`;
  }).join("");
}

function filterChapters() {
  const terms = normalize(chapterFilter.value).split(" ").filter(Boolean);
  let visible = 0;
  for (const link of nav.querySelectorAll("[data-chapter-link]")) {
    const chapter = chapterById.get(link.dataset.chapterLink);
    const text = normalize([chapter.title, chapter.summary, ...chapter.keywords].join(" "));
    const matches = terms.every((term) => text.includes(term));
    link.parentElement.hidden = !matches;
    if (matches) visible += 1;
  }
  for (const part of nav.querySelectorAll(".nav-part")) {
    part.hidden = ![...part.querySelectorAll("[data-chapter-link]")].some((link) => !link.parentElement.hidden);
  }
  document.querySelector("#chapter-filter-empty").hidden = visible > 0;
}

function renderNavSections(chapter) {
  nav.querySelectorAll(".nav-sections").forEach((list) => list.remove());
  const link = nav.querySelector(`[data-chapter-link="${CSS.escape(chapter.id)}"]`);
  if (!link || !chapter.sections.length) return;
  const list = document.createElement("ul");
  list.className = "nav-sections";
  list.innerHTML = chapter.sections
    .map((section) => `<li><a href="${chapterHref(chapter.id, section.id)}" data-nav-section="${escapeHtml(section.id)}">${escapeHtml(section.title)}</a></li>`)
    .join("");
  link.parentElement.append(list);
}

function updateActiveNav(chapterId) {
  nav.querySelectorAll("[data-chapter-link]").forEach((link) => {
    if (link.dataset.chapterLink === chapterId) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function closeNav() {
  book.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
  navScrim.hidden = true;
}

/* --- Folha de rosto e índice geral -------------------------------------- */

function tocEntry(chapter) {
  return `<a class="toc-entry" href="${chapterHref(chapter.id)}">
    <span class="toc-numeral">${escapeHtml(chapter.number || "—")}</span>
    <span class="toc-title">${escapeHtml(navEntryTitle(chapter))}</span>
    <span class="toc-leader" aria-hidden="true"></span>
    <span class="toc-folio">${readingLabel(chapter.readingMinutes)}</span>
  </a>`;
}

function renderTitlePage(chapter) {
  return `<header class="title-page">
    <p class="imprint">Edição ${escapeHtml(MANUAL.version)} · ${escapeHtml(MANUAL.locale)}</p>
    <h1>Manual do webMARS</h1>
    <p class="title-sub">${escapeHtml(chapter.title)}</p>
    <div class="imprint-lines">
      <p>webMARS <b>${escapeHtml(MANUAL.webmarsVersion)}</b> · ${chapters.length} capítulos e páginas de referência</p>
      <p>Pesquisa local · leitura integrada ou em separador independente</p>
    </div>
  </header>
  <details class="contents-block"><summary>Consultar o índice completo</summary>
  <nav aria-label="Índice geral">
    ${parts.map((part, index) => {
      const entries = chaptersOfPart(part);
      if (!entries.length) return "";
      return `<section class="contents-part">
        <p class="contents-part-label"><span class="part-numeral">Parte ${romanize(index + 1)}</span><span>${escapeHtml(part)}</span></p>
        ${entries.map(tocEntry).join("")}
      </section>`;
    }).join("")}
    <section class="contents-part">
      <p class="contents-part-label"><span class="part-numeral">Apêndices</span></p>
      ${APPENDIX_IDS.map((id) => chapterById.get(id)).filter(Boolean).map(tocEntry).join("")}
    </section>
  </nav></details>`;
}

/* --- Abertura de capítulo ----------------------------------------------- */

function renderChapterOpener(chapter) {
  const label = chapter.number ? `Capítulo <span class="chapter-numeral">${escapeHtml(chapter.number)}</span>` : escapeHtml(chapter.part);
  const contents = chapter.sections.length > 1
    ? `<details class="chapter-contents"><summary>Neste capítulo · ${chapter.sections.length} secções</summary>
       <nav aria-label="Neste capítulo">
        ${chapter.sections.map((section, index) => `<a class="toc-entry" href="${chapterHref(chapter.id, section.id)}">
          <span class="toc-numeral">${escapeHtml(sectionNumeral(chapter, index))}</span>
          <span class="toc-title">${escapeHtml(section.title)}</span>
          <span class="toc-leader" aria-hidden="true"></span>
        </a>`).join("")}
      </nav></details>`
    : "";
  return `<header class="chapter-opener">
    <p class="chapter-label">${label}<span class="label-rule" aria-hidden="true"></span><span>${escapeHtml(chapter.part)}</span></p>
    <h1>${escapeHtml(chapter.title)}</h1>
    <p class="standfirst">${escapeHtml(chapter.intro)}</p>
    <div class="opener-meta">
      <span>Nível <b>${escapeHtml(chapter.level)}</b></span>
      <span>Leitura <b>${readingLabel(chapter.readingMinutes)}</b></span>
      <span>Verificado com webMARS <b>${escapeHtml(MANUAL.webmarsVersion)}</b></span>
    </div>
    ${contents}
  </header>`;
}

function sectionNumeral(chapter, index) {
  if (!chapter.number) return String(index + 1);
  return `${chapter.number}.${index + 1}`;
}

function renderSection(chapter, section, index) {
  const numeral = chapter.home ? "" : `<span class="section-numeral" aria-hidden="true">${escapeHtml(sectionNumeral(chapter, index))}</span>`;
  return `<section class="manual-section prose" id="${escapeHtml(section.id)}" data-section-id="${escapeHtml(section.id)}" data-section-title="${escapeHtml(section.title)}">
    <h2>${numeral}<a href="${chapterHref(chapter.id, section.id)}">${escapeHtml(section.title)}</a></h2>
    ${section.content}
  </section>`;
}

function renderFooter(chapter) {
  const index = chapters.indexOf(chapter);
  const previous = index > 0 ? chapters[index - 1] : null;
  const next = index < chapters.length - 1 ? chapters[index + 1] : null;
  const sources = Array.isArray(chapter.sources) ? chapter.sources : [];
  return `<footer class="chapter-footer">
    <nav class="page-navigation" aria-label="Capítulos anterior e seguinte">
      ${previous ? `<a href="${chapterHref(previous.id)}"><small>← Anterior</small>${escapeHtml(navEntryTitle(previous))}</a>` : "<span></span>"}
      ${next ? `<a href="${chapterHref(next.id)}"><small>Seguinte →</small>${escapeHtml(navEntryTitle(next))}</a>` : "<span></span>"}
    </nav>
    <div class="colophon">
      <span>Manual ${escapeHtml(MANUAL.version)} · webMARS ${escapeHtml(MANUAL.webmarsVersion)}</span>
      <button type="button" id="copy-link">Copiar ligação</button>
      <button type="button" id="print-page">Imprimir capítulo</button>
      <span>Use <kbd>←</kbd> <kbd>→</kbd> para mudar de capítulo</span>
    </div>
    ${sources.length ? `<details class="source-details">
      <summary>Verificação editorial e fontes</summary>
      <p>Comportamento verificado com webMARS ${escapeHtml(MANUAL.webmarsVersion)}, commit <code>${escapeHtml(MANUAL.verifiedCommit.slice(0, 12))}</code>. Ficheiros principais:</p>
      <ul>${sources.map((source) => `<li><code>${escapeHtml(source)}</code></li>`).join("")}</ul>
    </details>` : ""}
  </footer>`;
}

function renderNotFound(chapterId) {
  article.innerHTML = `<header class="chapter-opener">
    <p class="chapter-label">Erro<span class="label-rule" aria-hidden="true"></span><span>Rota desconhecida</span></p>
    <h1>Esta página não existe nesta edição.</h1>
    <p class="standfirst">Não encontrámos “${escapeHtml(chapterId)}”. Volte à folha de rosto ou procure no índice remissivo.</p>
    <div class="colophon">
      <a href="#/inicio">Voltar à folha de rosto</a>
      <button type="button" id="not-found-search">Abrir o índice remissivo</button>
    </div>
  </header>`;
  document.querySelector("#not-found-search")?.addEventListener("click", openSearch);
}

/* --- Realce de listagens ------------------------------------------------ */

const C_KEYWORDS = new Set([
  "int", "char", "void", "return", "if", "else", "while", "for", "do", "break", "continue",
  "struct", "unsigned", "signed", "long", "short", "float", "double", "const", "static",
  "sizeof", "typedef", "switch", "case", "default", "bool", "true", "false", "NULL"
]);

function tokenSpan(kind, text) {
  const safe = escapeHtml(text);
  if (kind === "plain") return safe;
  if (kind === "mnemonic") return `<span class="tok-mnemonic" data-gloss="mnemonic" data-key="${escapeHtml(text.toLowerCase())}">${safe}</span>`;
  if (kind === "register") return `<span class="tok-register" data-gloss="register" data-key="${escapeHtml(text.toLowerCase())}">${safe}</span>`;
  if (kind === "directive") return `<span class="tok-directive" data-gloss="directive" data-key="${escapeHtml(text.toLowerCase())}">${safe}</span>`;
  return `<span class="tok-${kind}">${safe}</span>`;
}

function highlightMipsLine(line) {
  const tokens = [];
  let index = 0;
  let sawOperation = false;

  while (index < line.length) {
    const char = line[index];

    if (char === "#") {
      tokens.push(["comment", line.slice(index)]);
      break;
    }
    if (char === '"' || char === "'") {
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === "\\") end += 2;
        else if (line[end] === char) { end += 1; break; }
        else end += 1;
      }
      tokens.push(["string", line.slice(index, Math.min(end, line.length))]);
      index = Math.min(end, line.length);
      continue;
    }
    if (/\s/.test(char)) {
      const match = /^\s+/.exec(line.slice(index));
      tokens.push(["plain", match[0]]);
      index += match[0].length;
      continue;
    }
    if (char === "$") {
      const match = /^\$[\w.]*/.exec(line.slice(index));
      tokens.push(["register", match[0]]);
      index += match[0].length;
      continue;
    }
    if (char === "." && /[A-Za-z_]/.test(line[index + 1] || "")) {
      const match = /^\.[\w.]*/.exec(line.slice(index));
      tokens.push(["directive", match[0]]);
      sawOperation = true;
      index += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = /^[\w.]*/.exec(line.slice(index));
      const word = match[0];
      index += word.length;
      if (line[index] === ":") {
        tokens.push(["label", word], ["punct", ":"]);
        index += 1;
        continue;
      }
      if (!sawOperation) {
        tokens.push(["mnemonic", word]);
        sawOperation = true;
      } else {
        tokens.push(["plain", word]);
      }
      continue;
    }
    const match = /^[^\s\w$."']+/.exec(line.slice(index));
    if (match) {
      tokens.push(["punct", match[0]]);
      index += match[0].length;
      continue;
    }
    tokens.push(["plain", char]);
    index += 1;
  }

  return tokens.map(([kind, text]) => tokenSpan(kind, text)).join("");
}

function highlightMips(source) {
  return source.split("\n").map(highlightMipsLine).join("\n");
}

function highlightC(source) {
  const pattern = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(^[ \t]*#[A-Za-z_]+)|\b([A-Za-z_]\w*)\b/gm;
  let result = "";
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    result += escapeHtml(source.slice(last, match.index));
    if (match[1]) result += tokenSpan("comment", match[1]);
    else if (match[2]) result += tokenSpan("string", match[2]);
    else if (match[3]) result += tokenSpan("directive", match[3]);
    else if (C_KEYWORDS.has(match[4])) result += `<span class="tok-mnemonic">${escapeHtml(match[4])}</span>`;
    else result += escapeHtml(match[4]);
    last = match.index + match[0].length;
  }
  return result + escapeHtml(source.slice(last));
}

function highlightShell(source) {
  return source.split("\n").map((line) => {
    const hash = line.indexOf("#");
    if (hash === 0) return tokenSpan("comment", line);
    const match = /^(\s*)([\w./-]+)([\s\S]*)$/.exec(line);
    if (!match) return escapeHtml(line);
    return escapeHtml(match[1]) + `<span class="tok-mnemonic">${escapeHtml(match[2])}</span>` + escapeHtml(match[3]);
  }).join("\n");
}

function languageOf(label) {
  const value = String(label || "").toLowerCase();
  if (/mini-c|\bc0\b|\bc1\b|\bc\b/.test(value)) return "c";
  if (/terminal|npm|shell|consola/.test(value)) return "shell";
  return "mips";
}

/* --- Enriquecimento pós-render ------------------------------------------ */

function decorateListings(root, prefix) {
  let counter = 0;
  for (const pre of root.querySelectorAll("pre")) {
    if (pre.closest(".listing")) continue;
    counter += 1;
    const code = pre.querySelector("code") || pre;
    const source = code.textContent;
    const labelNode = pre.previousElementSibling?.classList?.contains("code-label") ? pre.previousElementSibling : null;
    const label = labelNode ? labelNode.textContent.trim() : "Assembly MIPS";
    const language = languageOf(label);

    if (language === "mips") code.innerHTML = highlightMips(source);
    else if (language === "c") code.innerHTML = highlightC(source);
    else code.innerHTML = highlightShell(source);

    const listing = document.createElement("figure");
    listing.className = "listing";
    listing.innerHTML = `<figcaption class="listing-head">
      <span class="listing-tag">Listagem ${prefix}${counter}</span>
      <span class="listing-lang">${escapeHtml(label)}</span>
      <button class="listing-copy" type="button">Copiar</button>
    </figcaption>`;
    pre.replaceWith(listing);
    listing.append(pre);
    labelNode?.remove();

    const copyButton = listing.querySelector(".listing-copy");
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(source);
        copyButton.textContent = "Copiado";
        setTimeout(() => { copyButton.textContent = "Copiar"; }, 1600);
      } catch {
        showToast("Não foi possível copiar a listagem.");
      }
    });
  }
}

function decorateFigures(root, prefix) {
  let counter = 0;
  for (const figure of root.querySelectorAll("figure.screenshot")) {
    counter += 1;
    const caption = figure.querySelector("figcaption");
    if (!caption) continue;
    caption.querySelector(".figure-tag")?.remove();
    const tag = document.createElement("span");
    tag.className = "figure-tag";
    tag.textContent = `Figura ${prefix}${counter}`;
    caption.prepend(tag);
  }
}

function decorateTables(root, prefix) {
  let counter = 0;
  for (const wrap of root.querySelectorAll(".table-wrap")) {
    if (wrap.previousElementSibling?.classList?.contains("table-caption")) continue;
    counter += 1;
    const caption = document.createElement("span");
    caption.className = "table-caption";
    caption.textContent = `Tabela ${prefix}${counter}`;
    wrap.before(caption);
  }
}

function decorateNotes(root, prefix) {
  let counter = 0;
  for (const note of root.querySelectorAll(".callout")) {
    counter += 1;
    const title = note.querySelector(".callout-title");
    if (title) title.dataset.note = `${prefix}${counter}`;
  }
}

function decorateDropCap(root) {
  const first = root.querySelector(".manual-section.prose");
  const paragraph = first?.firstElementChild?.nextElementSibling;
  if (paragraph?.tagName === "P" && paragraph.textContent.trim().length > 95) {
    paragraph.classList.add("drop-cap");
  }
}

function enhanceArticle(chapter) {
  const prefix = chapter.number ? `${chapter.number}.` : "";
  decorateListings(article, prefix);
  decorateFigures(article, prefix);
  decorateTables(article, prefix);
  decorateNotes(article, prefix);
  if (!chapter.home) decorateDropCap(article);
  ensureReference().then(() => upgradeGlossTargets(article)).catch(() => {});
}

/* --- Glosa marginal ----------------------------------------------------- */

const REGISTERS = new Map();

(function buildRegisterTable() {
  const rows = [
    [["$zero"], 0, "Constante zero", "Lê sempre 0; as escritas são descartadas."],
    [["$at"], 1, "Temporário do assembler", "Reservado à expansão de pseudoinstruções. Não usar em código próprio."],
    [["$v0", "$v1"], 2, "Valor de retorno", "Também transportam o número do serviço em <code>syscall</code> ($v0) e o resultado devolvido."],
    [["$a0", "$a1", "$a2", "$a3"], 4, "Argumento", "Quatro primeiros argumentos de uma chamada e parâmetros dos serviços do sistema."],
    [["$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7"], 8, "Temporário", "Não preservado: a função chamada pode destruí-lo."],
    [["$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7"], 16, "Guardado", "Preservado: quem o usa tem de o repor antes de regressar."],
    [["$t8", "$t9"], 24, "Temporário", "Não preservado, tal como $t0–$t7."],
    [["$k0", "$k1"], 26, "Reservado ao kernel", "Pode ser alterado a qualquer momento pelo handler de exceções."],
    [["$gp"], 28, "Global pointer", "Base do acesso a dados globais próximos."],
    [["$sp"], 29, "Stack pointer", "Topo da stack; começa em 0x7fffeffc e cresce para endereços inferiores."],
    [["$fp"], 30, "Frame pointer", "Base do frame corrente quando a convenção o exige."],
    [["$ra"], 31, "Return address", "Endereço de regresso escrito por <code>jal</code>."]
  ];
  for (const [names, base, role, note] of rows) {
    names.forEach((name, offset) => REGISTERS.set(name, { number: base + offset, role, note }));
  }
  for (let index = 0; index <= 31; index += 1) {
    REGISTERS.set(`$f${index}`, {
      number: index,
      role: "Registo de vírgula flutuante",
      note: "Coprocessador 1. A dupla precisão usa pares de índice par."
    });
  }
})();

const mnemonicIndex = new Map();
const directiveIndex = new Map();

function indexReference(data) {
  const add = (example, description, kind) => {
    const mnemonic = String(example || "").trim().split(/\s+/)[0]?.toLowerCase();
    if (!mnemonic) return;
    if (!mnemonicIndex.has(mnemonic)) mnemonicIndex.set(mnemonic, { forms: [], kind });
    const entry = mnemonicIndex.get(mnemonic);
    if (entry.forms.length < 3) entry.forms.push({ example, description });
  };
  for (const entry of data.basicInstructions) add(entry.example, entry.description, "Instrução básica");
  for (const entry of data.extendedInstructions) {
    const mnemonic = String(entry.example || "").trim().split(/\s+/)[0]?.toLowerCase();
    if (mnemonic && !mnemonicIndex.has(mnemonic)) add(entry.example, entry.description, "Pseudoinstrução");
  }
  for (const entry of data.directives) directiveIndex.set(String(entry.name || "").toLowerCase(), entry.description || "");
}

function glossFor(kind, key) {
  if (kind === "register") {
    const entry = REGISTERS.get(key);
    if (!entry) return null;
    return {
      term: key,
      kind: `Registo ${entry.number}`,
      form: entry.role,
      body: entry.note
    };
  }
  if (kind === "directive") {
    const description = directiveIndex.get(key);
    if (!description) return null;
    return { term: key, kind: "Diretiva do assembler", form: "", body: escapeHtml(description) };
  }
  const entry = mnemonicIndex.get(key);
  if (!entry) return null;
  return {
    term: key,
    kind: entry.kind,
    form: entry.forms[0].example,
    body: escapeHtml(entry.forms[0].description),
    extra: entry.forms.slice(1).map((form) => escapeHtml(form.example))
  };
}

function upgradeGlossTargets(root) {
  for (const span of root.querySelectorAll("[data-gloss]")) {
    if (span.tagName === "BUTTON") continue;
    if (!glossFor(span.dataset.gloss, span.dataset.key)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${span.className} glossed`;
    button.dataset.gloss = span.dataset.gloss;
    button.dataset.key = span.dataset.key;
    button.setAttribute("aria-expanded", "false");
    button.textContent = span.textContent;
    span.replaceWith(button);
  }
}

function closeGloss() {
  activeGloss?.element.remove();
  activeGloss?.trigger.setAttribute("aria-expanded", "false");
  activeGloss = null;
}

function openGloss(trigger) {
  const data = glossFor(trigger.dataset.gloss, trigger.dataset.key);
  if (!data) return;
  const wasOpen = activeGloss?.trigger === trigger;
  closeGloss();
  if (wasOpen) return;

  const element = document.createElement("aside");
  element.className = "gloss";
  element.innerHTML = `<button class="gloss-dismiss" type="button" aria-label="Fechar a glosa">×</button>
    <dfn>${escapeHtml(data.term)}</dfn>
    <span class="gloss-kind">${escapeHtml(data.kind)}</span>
    ${data.form ? `<span class="gloss-form">${escapeHtml(data.form)}</span>` : ""}
    <p>${data.body}</p>
    ${data.extra?.length ? `<p class="gloss-form">${data.extra.map(escapeHtml).join("<br>")}</p>` : ""}`;

  const wide = window.matchMedia("(min-width: 1201px)").matches;
  if (wide) {
    article.append(element);
    const top = trigger.getBoundingClientRect().top - article.getBoundingClientRect().top;
    element.style.top = `${Math.max(0, top - 4)}px`;
    element.style.left = "calc(var(--measure) + var(--gutter))";
  } else {
    (trigger.closest(".listing") || trigger.parentElement).after(element);
  }

  trigger.setAttribute("aria-expanded", "true");
  activeGloss = { trigger, element };
  element.querySelector(".gloss-dismiss").addEventListener("click", () => {
    closeGloss();
    trigger.focus();
  });
}

/* --- Cabeça corrente e progresso ---------------------------------------- */

function setRunningRecto(chapter, sectionTitle) {
  if (!chapter) {
    runningRecto.innerHTML = "";
    return;
  }
  const head = chapter.home
    ? "Folha de rosto"
    : `${chapter.number ? `Cap. ${escapeHtml(chapter.number)} ` : ""}<b>${escapeHtml(chapter.title)}</b>`;
  runningRecto.innerHTML = sectionTitle
    ? `${head}<span class="recto-sep" aria-hidden="true">§</span>${escapeHtml(sectionTitle)}`
    : head;
}

function watchSections(chapter) {
  sectionObserver?.disconnect();
  const sections = [...article.querySelectorAll("[data-section-id]")];
  if (!("IntersectionObserver" in window) || !sections.length) return;
  sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    const id = visible.target.dataset.sectionId;
    setRunningRecto(chapter, visible.target.dataset.sectionTitle);
    nav.querySelectorAll("[data-nav-section]").forEach((link) => {
      link.classList.toggle("current", link.dataset.navSection === id);
    });
  }, { rootMargin: "-15% 0px -70% 0px", threshold: [0, 1] });
  sections.forEach((section) => sectionObserver.observe(section));
}

function updateProgress() {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
  readingProgress.style.width = `${(ratio * 100).toFixed(2)}%`;
}

/* --- Encaminhamento ----------------------------------------------------- */

function scrollToRoute(sectionId) {
  requestAnimationFrame(() => {
    if (!sectionId) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ block: "start" });
  });
}

async function renderRoute() {
  const { chapterId, sectionId } = parseRoute();
  const chapter = chapterById.get(chapterId);
  closeNav();
  closeGloss();

  if (!chapter) {
    currentChapter = null;
    sectionObserver?.disconnect();
    nav.querySelectorAll(".nav-sections").forEach((list) => list.remove());
    renderNotFound(chapterId);
    updateActiveNav("");
    setRunningRecto(null);
    document.title = `Página não encontrada · ${MANUAL.title}`;
    announcer.textContent = "Página não encontrada.";
    return;
  }

  currentChapter = chapter;
  const body = chapter.sections.map((section, index) => renderSection(chapter, section, index)).join("");
  article.innerHTML = `${chapter.home ? renderTitlePage(chapter) : renderChapterOpener(chapter)}${body}${renderFooter(chapter)}`;
  document.title = `${chapter.home ? MANUAL.title : chapter.title} · ${MANUAL.displayVersion}`;

  updateActiveNav(chapter.id);
  renderNavSections(chapter);
  setRunningRecto(chapter, "");
  enhanceArticle(chapter);
  watchSections(chapter);
  bindColophon();
  if (chapter.reference) await renderReference();
  scrollToRoute(sectionId);
  updateProgress();
  announcer.textContent = chapter.home ? MANUAL.title : `${chapter.title}. ${chapter.sections.length} secções.`;
}

function bindColophon() {
  article.querySelector("#copy-link")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast("Ligação copiada.");
    } catch {
      showToast("Não foi possível copiar; use a barra de endereço.");
    }
  });
  article.querySelector("#print-page")?.addEventListener("click", () => window.print());
}

function goToNeighbour(step) {
  if (!currentChapter) return;
  const index = chapters.indexOf(currentChapter);
  const target = chapters[index + step];
  if (target) location.hash = chapterHref(target.id);
}

/* --- Referência pesquisável --------------------------------------------- */

async function fetchJsonWithFallback(paths) {
  let lastError = null;
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${path}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Não foi possível carregar os dados.");
}

function ensureReference() {
  if (referenceDataPromise) return referenceDataPromise;
  referenceDataPromise = Promise.all([
    fetchJsonWithFallback(["./data/help-reference.json"]),
    fetchJsonWithFallback(["./data/syscalls.json"]).catch(() => [])
  ]).then(([help, syscalls]) => {
    referenceData = {
      basicInstructions: help.basicInstructions || [],
      extendedInstructions: help.extendedInstructions || [],
      directives: help.directives || [],
      syscalls: Array.isArray(syscalls) ? syscalls : []
    };
    indexReference(referenceData);
    buildSearchIndex();
    return referenceData;
  });
  return referenceDataPromise;
}

function referenceLabel(key) {
  return {
    basicInstructions: "Instruções básicas",
    extendedInstructions: "Pseudoinstruções",
    directives: "Diretivas",
    syscalls: "Syscalls"
  }[key] || key;
}

function referenceEntry(entry, key) {
  if (key === "directives") return { title: entry.name || "", description: entry.description || "" };
  if (key === "syscalls") return { title: `${entry.number} · ${entry.name || "Syscall"}`, description: entry.summary || "", detail: entry.category || "" };
  return { title: entry.example || "", description: entry.description || "" };
}

function paintReference() {
  const root = document.querySelector("#reference-app");
  if (!root || !referenceData) return;
  const query = normalize(referenceFilter);
  const source = referenceData[referenceTab] || [];
  const filtered = source.filter((entry) => {
    const item = referenceEntry(entry, referenceTab);
    return !query || normalize(`${item.title} ${item.description} ${item.detail || ""}`).includes(query);
  });

  root.innerHTML = `<div class="reference-controls">
    <div class="reference-tabs" role="tablist" aria-label="Tipo de referência">${Object.keys(referenceData).map((key) => `<button type="button" role="tab" aria-selected="${key === referenceTab}" class="${key === referenceTab ? "active" : ""}" data-reference-tab="${key}">${referenceLabel(key)}<span>${referenceData[key].length}</span></button>`).join("")}</div>
    <input class="reference-search" id="reference-search" type="search" value="${escapeHtml(referenceFilter)}" placeholder="Filtrar esta tabela…" aria-label="Filtrar ${escapeHtml(referenceLabel(referenceTab))}">
    <span class="reference-count">${filtered.length} de ${source.length} entradas</span>
  </div>
  <div class="reference-list">${filtered.slice(0, 650).map((entry) => {
    const item = referenceEntry(entry, referenceTab);
    return `<article class="reference-row"><code>${escapeHtml(item.title)}</code><p>${escapeHtml(item.description)}</p>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}</article>`;
  }).join("") || '<p class="search-empty">Nenhuma entrada corresponde ao filtro.</p>'}</div>`;

  root.querySelectorAll("[data-reference-tab]").forEach((button) => button.addEventListener("click", () => {
    referenceTab = button.dataset.referenceTab;
    referenceFilter = "";
    paintReference();
  }));
  root.querySelector("#reference-search")?.addEventListener("input", (event) => {
    referenceFilter = event.target.value;
    const caret = event.target.selectionStart;
    paintReference();
    const field = document.querySelector("#reference-search");
    field?.focus();
    field?.setSelectionRange(caret, caret);
  });
}

async function renderReference() {
  const root = document.querySelector("#reference-app");
  if (!root) return;
  try {
    await ensureReference();
    paintReference();
  } catch (error) {
    root.innerHTML = `<aside class="callout danger"><span class="callout-title">Referência indisponível</span><p>${escapeHtml(error.message)}</p><p>Execute o build do subprojeto para criar a cópia autónoma em <code>dist/data</code>.</p></aside>`;
  }
}

/* --- Índice remissivo (pesquisa) ---------------------------------------- */

let searchIndex = [];

function buildSearchIndex() {
  const staticEntries = chapters.flatMap((chapter) => [
    {
      chapterId: chapter.id,
      sectionId: "",
      type: chapter.part,
      title: chapter.title,
      excerpt: chapter.summary,
      haystack: `${chapter.title} ${chapter.summary} ${chapter.intro} ${(chapter.keywords || []).join(" ")}`
    },
    ...chapter.sections.map((section) => ({
      chapterId: chapter.id,
      sectionId: section.id,
      type: chapter.title,
      title: section.title,
      excerpt: stripHtml(section.content).slice(0, 190),
      haystack: `${chapter.title} ${section.title} ${stripHtml(section.content)}`
    }))
  ]);
  const referenceEntries = referenceData
    ? Object.entries(referenceData).flatMap(([key, values]) => values.map((entry) => {
      const item = referenceEntry(entry, key);
      return {
        chapterId: "referencia-mips",
        sectionId: "catalogo",
        type: referenceLabel(key),
        title: item.title,
        excerpt: item.description,
        haystack: `${referenceLabel(key)} ${item.title} ${item.description} ${item.detail || ""}`
      };
    }))
    : [];
  searchIndex = [...staticEntries, ...referenceEntries].map((entry) => ({ ...entry, normalized: normalize(entry.haystack) }));
}

const synonyms = new Map([
  ["assemble", "montar assembler assembly"],
  ["montar", "assemble assembler assembly"],
  ["run", "executar go correr"],
  ["executar", "run go correr"],
  ["backstep", "passo atras recuar desfazer runtime"],
  ["breakpoint", "ponto paragem bp"],
  ["settings", "definicoes preferencias"],
  ["file", "ficheiro arquivo"],
  ["tool", "ferramenta"],
  ["cloud", "nuvem remoto sincronizar"],
  ["register", "registo registrador"],
  ["stack", "pilha frame"],
  ["heap", "alocacao dinamica"],
  ["syscall", "servico sistema"],
  ["branch", "desvio salto"],
  ["stall", "espera bloqueio pipeline"],
  ["flush", "descarte pipeline"]
]);

function expandedTerms(query) {
  const base = normalize(query);
  const words = base.split(/\s+/).filter(Boolean);
  return [...new Set(words.flatMap((word) => [word, ...(synonyms.get(word)?.split(" ") || [])]))];
}

function scoreEntry(entry, terms) {
  let score = 0;
  const title = normalize(entry.title);
  for (const term of terms) {
    if (title === term) score += 60;
    else if (title.startsWith(term)) score += 35;
    else if (title.includes(term)) score += 20;
    if (entry.normalized.includes(term)) score += 4;
  }
  if (terms.every((term) => entry.normalized.includes(term))) score += 10;
  return score;
}

function highlight(value, query) {
  const safe = escapeHtml(value);
  const first = String(query || "").trim().split(/\s+/)[0];
  if (!first) return safe;
  const pattern = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(`(${pattern})`, "ig"), "<mark>$1</mark>");
}

function performSearch() {
  const query = searchInput.value.trim();
  searchCursor = -1;
  if (query.length < 2) {
    searchResults.innerHTML = "";
    searchHint.textContent = "Escreva pelo menos dois caracteres. Pesquise também pelos nomes ingleses da interface.";
    return;
  }
  const terms = expandedTerms(query);
  const results = searchIndex
    .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "pt"))
    .slice(0, 40);
  searchHint.textContent = `${results.length} resultado${results.length === 1 ? "" : "s"} mostrado${results.length === 1 ? "" : "s"}.`;
  searchResults.innerHTML = results.length
    ? results.map(({ entry }, index) => `<a class="search-result" role="option" aria-selected="false" data-search-index="${index}" href="${chapterHref(entry.chapterId, entry.sectionId)}"><small>${escapeHtml(entry.type)}</small><strong>${highlight(entry.title, query)}</strong><span>${highlight(entry.excerpt, query)}</span></a>`).join("")
    : '<p class="search-empty">Sem resultados. Tente um nome inglês, uma instrução ou um conceito mais curto.</p>';
  searchResults.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => searchDialog.close()));
}

function moveSearchCursor(direction) {
  const options = [...searchResults.querySelectorAll("[role=option]")];
  if (!options.length) return;
  searchCursor = Math.max(0, Math.min(options.length - 1, searchCursor + direction));
  options.forEach((option, index) => option.setAttribute("aria-selected", String(index === searchCursor)));
  options[searchCursor].scrollIntoView({ block: "nearest" });
}

function openSearch() {
  if (!searchDialog.open) searchDialog.showModal();
  requestAnimationFrame(() => {
    searchInput.focus();
    searchInput.select();
  });
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2400);
}

/* --- Tema --------------------------------------------------------------- */

const THEME_GLYPH = { auto: "◐", light: "☀", dark: "☾" };
const THEME_LABEL = { auto: "Tema do sistema", light: "Tema claro", dark: "Tema escuro" };

function currentTheme() {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "auto";
}

function applyTheme(theme) {
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    if (embedded) return updateThemeControl(theme);
    if (theme === "auto") localStorage.removeItem("webmars-manual-theme");
    else localStorage.setItem("webmars-manual-theme", theme);
  } catch { /* armazenamento indisponível */ }
  updateThemeControl(theme);
}

function updateThemeControl(theme) {
  themeGlyph.textContent = THEME_GLYPH[theme];
  themeToggle.setAttribute("aria-label", `${THEME_LABEL[theme]}. Alternar.`);
  themeToggle.title = THEME_LABEL[theme];
}

/* --- Ligações ----------------------------------------------------------- */

chapterFilter.addEventListener("input", filterChapters);
window.addEventListener("message", (event) => {
  if (!embedded || event.source !== window.parent || event.origin !== location.origin
    || event.data?.type !== "webmars:manual-theme" || !["light", "dark"].includes(event.data.theme)) return;
  applyTheme(event.data.theme);
});

navToggle.addEventListener("click", () => {
  const open = !book.classList.contains("nav-open");
  book.classList.toggle("nav-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navScrim.hidden = !open;
});
navScrim.addEventListener("click", closeNav);

searchTrigger.addEventListener("click", openSearch);
searchInput.addEventListener("input", performSearch);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") { event.preventDefault(); moveSearchCursor(1); }
  if (event.key === "ArrowUp") { event.preventDefault(); moveSearchCursor(-1); }
  if (event.key === "Enter" && searchCursor >= 0) {
    event.preventDefault();
    searchResults.querySelector(`[data-search-index="${searchCursor}"]`)?.click();
  }
});

themeToggle.addEventListener("click", () => {
  const order = ["auto", "light", "dark"];
  applyTheme(order[(order.indexOf(currentTheme()) + 1) % order.length]);
});

article.addEventListener("click", (event) => {
  const trigger = event.target.closest("button.glossed");
  if (trigger) {
    event.preventDefault();
    openGloss(trigger);
    return;
  }
  if (!event.target.closest(".gloss")) closeGloss();
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const inField = event.target.closest?.("input, textarea, select, [contenteditable], dialog, pre, .table-wrap");
  if (event.key === "Escape" && activeGloss) {
    activeGloss.trigger.focus();
    closeGloss();
    return;
  }
  if (inField) return;
  if (event.key === "/") { event.preventDefault(); openSearch(); }
  if (event.key === "ArrowRight") goToNeighbour(1);
  if (event.key === "ArrowLeft") goToNeighbour(-1);
});

window.addEventListener("hashchange", renderRoute);
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", closeGloss);

/* --- Arranque ----------------------------------------------------------- */

applyTheme(currentTheme());
renderNavigation();
buildSearchIndex();
renderRoute();
ensureReference().catch(() => {});
