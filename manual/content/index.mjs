import { coreChapters } from "./chapters-core.mjs";
import { languageChapters } from "./chapters-language.mjs";
import { toolChapters, TOOL_DATA } from "./chapters-tools.mjs";
import { operationChapters } from "./chapters-operations.mjs";
import { teacherChapters } from "./chapters-teachers.mjs";
import { libraryChapters } from "./chapters-library.mjs";

export { MANUAL } from "./shared.mjs";
export { TOOL_DATA };

export const CHAPTER_ORDER = Object.freeze([
  "inicio",
  "sobre-o-manual",
  "aceder",
  "primeiros-passos",
  "interface",
  "projetos-ficheiros",
  "editor",
  "assembler",
  "executar-depurar",
  "minic",
  "modelo-mips",
  "referencia-mips",
  "ferramentas",
  "pipeline-lab",
  "cloud",
  "biblioteca-publica",
  "preferencias-acessibilidade",
  "aprender-ensinar",
  "resolucao-problemas",
  "kit-docente",
  "administrar-estender",
  "apendices",
  "cobertura",
  "changelog"
]);

const chapterSources = [
  ...coreChapters,
  ...languageChapters,
  ...toolChapters,
  ...operationChapters,
  ...teacherChapters,
  ...libraryChapters
];

const chaptersById = new Map(chapterSources.map((chapter) => [chapter.id, chapter]));
if (chaptersById.size !== chapterSources.length) {
  throw new Error("The Manual contains duplicate chapter ids.");
}

const missingChapterIds = CHAPTER_ORDER.filter((id) => !chaptersById.has(id));
const unexpectedChapterIds = chapterSources
  .map((chapter) => chapter.id)
  .filter((id) => !CHAPTER_ORDER.includes(id));
if (missingChapterIds.length || unexpectedChapterIds.length) {
  throw new Error(`Manual chapter order mismatch (missing: ${missingChapterIds.join(", ") || "none"}; unexpected: ${unexpectedChapterIds.join(", ") || "none"}).`);
}

export const chapters = CHAPTER_ORDER.map((id) => chaptersById.get(id));

export const parts = [
  "Começar",
  "Ambiente",
  "Programar",
  "Referência",
  "Explorar",
  "Serviços e configuração",
  "Aprender e manter",
  "Apêndices"
];
