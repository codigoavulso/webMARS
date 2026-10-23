export const MANUAL = Object.freeze({
  title: "Manual do webMARS",
  version: "0.2.2",
  displayVersion: "v0.2.2",
  webmarsVersion: "0.6.6",
  verifiedCommit: "00546cc84c8fc3e730eea2233a458742bd536332",
  verifiedAt: "2026-10-24",
  locale: "pt-PT"
});

export const html = String.raw;

export function codeBlock(source, label = "Assembly MIPS") {
  const escaped = String(source)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<span class="code-label">${label}</span><pre><code>${escaped}</code></pre>`;
}

export function callout(kind, title, body) {
  return `<aside class="callout ${kind}"><span class="callout-title">${title}</span>${body}</aside>`;
}

export function steps(items) {
  return `<ol class="steps">${items.map((item) => `<li>${item}</li>`).join("")}</ol>`;
}

export function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export function workflow(items) {
  return `<div class="workflow" aria-label="${items.map((item) => item.title).join(", depois ")}">${items.map((item, index) => `${index ? '<span class="workflow-arrow" aria-hidden="true">→</span>' : ""}<div class="workflow-step"><small>${item.label}</small><strong>${item.title}</strong></div>`).join("")}</div>`;
}

export function screenshot(src, alt, caption) {
  return `<figure class="screenshot"><div class="screenshot-frame"><img src="${src}" alt="${alt}" width="1280" height="720" loading="lazy"></div><figcaption>${caption}</figcaption></figure>`;
}

export const SHORTCUTS = [
  ["Ajuda", "<kbd>F1</kbd>", "Abre a ajuda integrada."],
  ["Novo", "<kbd>Ctrl</kbd> + <kbd>N</kbd>", "Cria um projeto quando não existe projeto aberto; num projeto aberto cria um ficheiro Assembly <code>.s</code>."],
  ["Abrir do disco", "<kbd>Ctrl</kbd> + <kbd>O</kbd>", "Abre o seletor de ficheiros do browser."],
  ["Guardar ficheiro ativo", "<kbd>Ctrl</kbd> + <kbd>S</kbd>", "Persiste o ficheiro no mecanismo local adequado."],
  ["Descarregar como", "<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>", "Exporta com um nome escolhido."],
  ["Fechar ficheiro", "<kbd>Ctrl</kbd> + <kbd>W</kbd>", "Fecha o separador ativo, pedindo confirmação se necessário."],
  ["Desfazer / refazer", "<kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Ctrl</kbd> + <kbd>Y</kbd>", "Percorre o histórico do editor."],
  ["Procurar", "<kbd>Ctrl</kbd> + <kbd>F</kbd>", "Procura no ficheiro ativo."],
  ["Montar", "<kbd>F3</kbd>", "Monta as fontes Assembly no âmbito configurado."],
  ["Compilar Mini-C", "<kbd>F4</kbd>", "Traduz as fontes C/C0 para Assembly."],
  ["Executar", "<kbd>F5</kbd>", "Inicia ou continua a execução."],
  ["Passo", "<kbd>F7</kbd>", "Executa uma instrução básica."],
  ["Passo atrás", "<kbd>F8</kbd>", "Aplica o delta inverso mais recente."],
  ["Pesquisar o manual", "<kbd>Ctrl</kbd> + <kbd>K</kbd>", "Abre a pesquisa deste manual."]
];

export const MENU_ATLAS = [
  ["Ficheiro", "Novo; Abrir do disco; Abrir do armazenamento do browser; Fechar; Guardar ficheiro; Guardar projeto; Descarregar; Exemplos; Exportar E/S"],
  ["Online", "Conta e métodos de entrada; projetos na nuvem; sincronização; biblioteca pública; ligações; publicações e revisões"],
  ["Editar", "Desfazer; Refazer; Cortar; Copiar; Colar; Procurar; Selecionar tudo"],
  ["Ver", "Mostra, esconde e recupera janelas do ambiente e das ferramentas"],
  ["Executar", "Compilar Mini-C; Montar; Executar; Pausar; Parar; Passo; Passo atrás; Reiniciar"],
  ["Definições", "Apresentação; assembler; Mini-C; armazenamento; Cloud; interface; runtime e memória"],
  ["Ferramentas", "Vinte ferramentas educativas, de arquitetura, desempenho e dispositivos"],
  ["Ajuda", "Centro de ajuda; manual integrado; boas-vindas; kit docente; estatísticas de utilização; referência MIPS em PDF; informação e créditos"]
];

export const MEMORY_MAP = [
  ["Texto de utilizador", "<code>0x00400000</code>", "Instruções do programa."],
  ["Extern", "<code>0x10000000</code>", "Símbolos externos e small data."],
  ["Dados estáticos", "<code>0x10010000</code>", "Valores de <code>.data</code>."],
  ["Heap", "<code>0x10040000</code>", "Cresce com <code>sbrk</code> e alocação Mini-C."],
  ["Stack pointer inicial", "<code>0x7fffeffc</code>", "A stack cresce para endereços inferiores."],
  ["Kernel", "<code>0x80000000</code>", "Texto e dados do handler."],
  ["Handler de exceções", "<code>0x80000180</code>", "Entrada predefinida do handler."],
  ["MMIO", "<code>0xffff0000</code>", "Registos dos dispositivos mapeados em memória."]
];

export const STORAGE_MATRIX = [
  ["Recuperação automática", "Ficheiros abertos, ficheiro ativo e contexto da sessão", "Browser", "Automático; útil após recarregar, não é backup"],
  ["Biblioteca de projetos", "Árvore e conteúdo dos projetos locais", "Browser", "Gerida no painel Projeto"],
  ["Abrir/guardar no browser", "Um ficheiro identificado por nome", "Browser", "Compatibilidade com o fluxo clássico"],
  ["Slots de estado", "Ficheiros, preferências, janelas, layout e modo", "Dentro do projeto", "Não guardam PC, registos ou memória em execução"],
  ["Download", "Cópia exportada do ficheiro", "Dispositivo", "É o backup portátil recomendado"],
  ["Sistema virtual de ficheiros", "Ficheiros abertos por syscalls MIPS/Mini-C", "Browser", "Separado da árvore editorial do projeto"],
  ["Cloud", "Documento completo do projeto e metadados de versão", "Servidor da instalação", "Requer conta e sincronização explícita"],
  ["Biblioteca pública", "Snapshot sanitizado e revisões imutáveis", "BackMars da instalação", "Leitura anónima; publicação explícita com conta verificada"]
];

export const SETTINGS_MATRIX = [
  ["Mostrar etiquetas", "Mostra/oculta a tabela de símbolos junto ao segmento de texto."],
  ["Argumentos do programa", "Pede a linha de argumentos; prepara <code>argc</code>/<code>argv</code> em <code>$a0</code>/<code>$a1</code>."],
  ["Input por popup", "Desvia syscalls de leitura selecionados do painel E/S para diálogos."],
  ["Separar Mensagens e E/S", "Apresenta as duas transcrições simultaneamente."],
  ["Endereços/valores hexadecimais", "Muda apenas a representação, nunca os bits."],
  ["Montar ao abrir", "Monta automaticamente uma fonte Assembly aberta."],
  ["Montar todos", "Inclui fontes Assembly na mesma diretoria do ficheiro ativo."],
  ["Avisos como erros", "Faz qualquer aviso impedir a montagem."],
  ["Começar em <code>main</code>", "Usa a etiqueta global <code>main</code> como PC inicial quando existe."],
  ["Assembler estendido", "Permite pseudoinstruções, macros e formatos estendidos."],
  ["Delayed branching", "Executa o delay slot e altera endereços de link/exceção."],
  ["Código automodificável", "Autoriza stores em regiões executáveis."],
  ["Compatibilidade estrita MARS 4.5", "Endurece regras de endereços e comportamentos de compatibilidade."],
  ["Saída Mini-C", "Escolhe perfil, comentários e abertura da janela de output."],
  ["Interface", "Tema Sistema/Claro/Escuro, idioma, menu em cima/baixo, tipo e espaçamento."],
  ["Runtime e memória", "Mapa de memória, teto de memória, histórico e handler de exceções."],
  ["Servidor BackMars", "Mostra o endpoint fixado pelo administrador desta instalação; só instalações que autorizam override permitem alterá-lo."]
];

export const FEATURE_FAMILIES = [
  ["Menus e comandos", 9, "Cobertos"],
  ["Ferramentas", 20, "Cobertas individualmente"],
  ["Instruções básicas", 157, "Referência incorporada"],
  ["Pseudoinstruções", 388, "Referência incorporada"],
  ["Diretivas", 20, "Referência incorporada"],
  ["Perfis Mini-C", 6, "Cobertos"],
  ["Mapas de memória", 3, "Cobertos"],
  ["Idiomas da aplicação", 20, "Descritos"],
  ["Categorias de exemplos", 5, "Cobertas"],
  ["Lições Assembly", 15, "Percurso documentado"],
  ["Medições de utilização", 15, "Resumo, gráficos e limites documentados"]
];
