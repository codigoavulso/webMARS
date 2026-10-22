import {
  MANUAL,
  html,
  callout,
  codeBlock,
  steps,
  table,
  workflow,
  screenshot,
  SHORTCUTS,
  MENU_ATLAS,
  STORAGE_MATRIX
} from "./shared.mjs";

const firstAssembly = `.data
mensagem: .asciiz "Olá, webMARS!\\n"

.text
.globl main
main:
    la   $a0, mensagem
    li   $v0, 4
    syscall

    li   $v0, 10
    syscall`;

const debugAssembly = `.text
.globl main
main:
    li   $t0, 1
    li   $t1, 5
ciclo:
    mul  $t0, $t0, $t1
    addiu $t1, $t1, -1
    bgtz $t1, ciclo
    move $a0, $t0
    li   $v0, 1
    syscall
    li   $v0, 10
    syscall`;

export const coreChapters = [
  {
    id: "inicio",
    number: "",
    part: "Começar",
    title: "Domine o MIPS, do primeiro registo ao pipeline",
    summary: "O ponto de entrada para aprender, ensinar e explorar o webMARS com procedimentos verificados e referência completa.",
    intro: "Este é o manual independente do webMARS: um percurso do primeiro programa Assembly às ferramentas de microarquitetura, ao compilador Mini-C e aos dispositivos MMIO. Cada explicação descreve o comportamento real da versão documentada.",
    level: "Todos os níveis",
    readingMinutes: 6,
    keywords: ["início", "manual", "webmars", "mips", "aprender", "ensinar"],
    sources: ["README.md", "assets/js/app-modules/10-ui.js", "assets/js/app-modules/20-app-runtime.js"],
    home: true,
    sections: [
      {
        id: "escolher-percurso",
        title: "Escolha o seu percurso",
        content: html`
          <div class="card-grid">
            <a class="manual-card" href="#/primeiros-passos"><span class="card-icon" aria-hidden="true">01</span><strong>Começar do zero</strong><span>Abra, monte e execute um programa completo; depois faça a primeira depuração.</span></a>
            <a class="manual-card" href="#/assembler"><span class="card-icon" aria-hidden="true">{ }</span><strong>Programar em Assembly</strong><span>Diretivas, segmentos, macros, pseudoinstruções, ABI e diagnóstico do assembler.</span></a>
            <a class="manual-card" href="#/minic"><span class="card-icon" aria-hidden="true">C0</span><strong>Usar Mini-C</strong><span>Perfis C0/C1-NATIVE, bibliotecas, projetos multificheiro e Assembly gerado.</span></a>
            <a class="manual-card" href="#/executar-depurar"><span class="card-icon" aria-hidden="true">▶</span><strong>Executar e depurar</strong><span>Breakpoints, passo, backstep, memória, registos, exceções e input.</span></a>
            <a class="manual-card" href="#/pipeline-lab"><span class="card-icon" aria-hidden="true">⇢</span><strong>Explorar o pipeline</strong><span>Hazards, forwarding, stalls, predição, CPI e laboratórios guiados.</span></a>
            <a class="manual-card" href="#/referencia-mips"><span class="card-icon" aria-hidden="true">⌘</span><strong>Consultar a referência</strong><span>565 entradas de instruções, pseudoinstruções e diretivas pesquisáveis.</span></a>
          </div>
        `
      },
      {
        id: "cobertura-edicao",
        title: "O que esta edição cobre",
        content: html`
          <p>A versão ${MANUAL.displayVersion} documenta o <strong>webMARS ${MANUAL.webmarsVersion}</strong>. Cobre o ambiente de trabalho, a árvore de projetos, a montagem MIPS32, o runtime funcional, Mini-C, Cloud, Biblioteca pública, estatísticas de utilização, ligações estáveis, todas as ferramentas incluídas, o Pipeline Lab, o Kit Docente, acessibilidade, formatos de dados, privacidade e administração.</p>
          <div class="stat-strip" aria-label="Cobertura da edição">
            <div class="stat"><strong>21</strong><span>capítulos numerados</span></div>
            <div class="stat"><strong>20</strong><span>ferramentas descritas</span></div>
            <div class="stat"><strong>565</strong><span>entradas MIPS incorporadas</span></div>
            <div class="stat"><strong>0</strong><span>dependências externas</span></div>
          </div>
          ${callout("note", "Manual e aplicação têm versões diferentes", `<p>A versão do manual indica a maturidade editorial. A etiqueta “webMARS ${MANUAL.webmarsVersion}” identifica o produto cujo comportamento foi verificado. Uma nova release da aplicação exige auditoria, mas não obriga o manual a usar o mesmo número.</p>`)}
        `
      },
      {
        id: "guias-por-tarefa",
        title: "Encontre a resposta pela tarefa",
        content: html`
          ${table(["Quero…", "Guia", "Resultado a confirmar"], [
            ["Guardar trabalho sem criar conta", '<a href="#/projetos-ficheiros">Projetos e ficheiros</a>', "Uma cópia local e uma exportação de segurança."],
            ["Usar a mesma conta com palavra-passe e Google", '<a href="#/cloud/associar-e-fundir">Associar e fundir contas</a>', "Os dois métodos dão acesso aos mesmos projetos."],
            ["Partilhar um exercício com a turma", '<a href="#/biblioteca-publica">Biblioteca pública</a>', "Uma ligação de revisão fixa, com instruções e licença."],
            ["Perceber se a app está a crescer", '<a href="#/estatisticas-utilizacao/perguntas-praticas">Ler as estatísticas</a>', "Comparar visitas, sessões e contas sem as confundir."],
            ["Descobrir por que o meu programa não avança", '<a href="#/resolucao-problemas">Resolver problemas</a>', "Distinguir erro de montagem, espera de entrada e execução."],
            ["Consultar o manual enquanto programo", '<a href="#/aceder/manual-integrado">Manual na aplicação</a>', "Ler numa janela integrada ou no seu próprio separador."]
          ])}
          <p>O campo <strong>Filtrar capítulos</strong> reduz o índice por assunto. Para procurar uma palavra no texto completo, incluindo exemplos e referência, use <strong>Índice remissivo</strong>, <kbd>Ctrl</kbd> + <kbd>K</kbd> ou <kbd>/</kbd>.</p>
        `
      },
      {
        id: "modelo-mental",
        title: "O fluxo que organiza todo o manual",
        content: html`
          <p>O webMARS separa três operações que, para quem começa, parecem uma só. <strong>Compilar</strong> traduz Mini-C em Assembly; <strong>montar</strong> traduz Assembly em instruções e dados; <strong>executar</strong> aplica essas instruções ao estado MIPS. Saber em que fase surgiu um problema reduz drasticamente o diagnóstico.</p>
          ${workflow([
            { label: "Opcional", title: "Mini-C" },
            { label: "Compilar", title: "Assembly MIPS" },
            { label: "Montar", title: "Imagem executável" },
            { label: "Executar", title: "Estado da máquina" }
          ])}
          <p>O Pipeline Lab observa ou modela a mesma sequência de instruções, mas acrescenta ciclos e estágios. Um <em>passo</em> no runtime é uma instrução funcional; um ciclo do pipeline pode mover várias instruções simultaneamente.</p>
        `
      },
      {
        id: "principios",
        title: "Princípios do webMARS",
        content: html`
          <ul>
            <li><strong>Local por omissão.</strong> Edição, compilação, execução, recuperação e projetos locais funcionam no browser. Cloud é um serviço separado.</li>
            <li><strong>Observável.</strong> Texto, dados, símbolos, registos, COP0, COP1, mensagens, E/S e ferramentas apresentam a mesma máquina.</li>
            <li><strong>Reversível durante a depuração.</strong> O backstep aplica deltas inversos a registos, memória, input, sistema virtual de ficheiros, dispositivos e outros elementos capturados.</li>
            <li><strong>Educativo, não um computador geral.</strong> Mini-C é um subconjunto; o sistema de ficheiros é virtual; temporização e áudio obedecem ao browser.</li>
            <li><strong>Compatibilidade explícita.</strong> As extensões webMARS são assinaladas e o modo estrito aproxima comportamentos sensíveis do MARS 4.5.</li>
          </ul>
        `
      }
    ]
  },
  {
    id: "sobre-o-manual",
    number: "0",
    part: "Começar",
    title: "Sobre este manual",
    summary: "Âmbito, convenções, versões, níveis de confiança e forma de leitura.",
    intro: "O manual é um subprojeto editorial autónomo. Pode acompanhar a aplicação ou ser publicado separadamente, conserva dados de referência próprios e não depende do webMARS em execução.",
    level: "Referência",
    readingMinutes: 8,
    keywords: ["versão", "convenções", "privacidade", "âmbito", "manual"],
    sources: ["manual/README.md", "manual/CONTRIBUTING.md", "CITATION.cff", "LICENSE"],
    sections: [
      {
        id: "publico",
        title: "Para quem foi escrito",
        content: html`
          <p>O percurso principal serve estudantes que ainda estão a construir um modelo mental de Assembly e arquitetura. As caixas de compatibilidade, tabelas de endereços e apêndices destinam-se também a docentes, autores de exemplos e programadores que migram materiais do MARS 4.5.</p>
          ${table(["Perfil", "Entrada recomendada", "Objetivo"], [
            ["Estudante inicial", '<a href="#/primeiros-passos">Primeiros passos</a>', "Executar e explicar um programa pequeno."],
            ["Estudante de arquitetura", '<a href="#/modelo-mips">Modelo MIPS</a> e <a href="#/pipeline-lab">Pipeline Lab</a>', "Relacionar instruções, dados, datapath e ciclos."],
            ["Programador C", '<a href="#/minic">Mini-C</a>', "Traduzir um subconjunto C para MIPS e observar a ABI."],
            ["Docente", '<a href="#/aprender-ensinar">Aprender e ensinar</a>', "Planear sequências, laboratórios e evidência de execução."],
            ["Administrador/extensor", '<a href="#/administrar-estender">Administrar e estender</a>', "Alojar, configurar e ampliar o produto."]
          ])}
        `
      },
      {
        id: "fontes-verdade",
        title: "Como uma afirmação é verificada",
        content: html`
          <p>A ordem de confiança desta edição é: <strong>comportamento observado</strong>, código de produção, testes de regressão, documentação de engenharia e, finalmente, ajuda integrada. Esta regra é importante porque algumas páginas antigas da ajuda descrevem interfaces que entretanto evoluíram.</p>
          <p>Uma funcionalidade é considerada coberta quando possui um identificador editorial, aparece numa página, tem a versão verificada e, quando é visual, um estado de captura reproduzível. A página <a href="#/cobertura">Cobertura funcional</a> torna esse compromisso auditável.</p>
          ${callout("warning", "A interface é a autoridade para a operação corrente", "<p>Se um caminho deste manual não coincidir com a versão que está a usar, confirme a etiqueta de versão. Não tente forçar uma opção incompatível apenas para reproduzir um procedimento antigo.</p>")}
        `
      },
      {
        id: "convencoes",
        title: "Convenções de leitura",
        content: html`
          <ul>
            <li><strong>Ficheiro → Exemplos</strong> representa um caminho de menus.</li>
            <li><kbd>F3</kbd> representa uma tecla; combinações mostram cada tecla separadamente.</li>
            <li><code>$t0</code>, <code>0x00400000</code>, <code>addiu</code> e <code>main.s</code> representam elementos literais.</li>
            <li><strong>Montar</strong> aplica-se a Assembly; <strong>compilar</strong> aplica-se a Mini-C; <strong>executar</strong> aplica-se à imagem MIPS.</li>
            <li>“MARS 4.5” é a aplicação Java original; “webMARS” é esta implementação para o browser.</li>
          </ul>
          ${callout("compat", "Compatibilidade", "<p>Uma caixa roxa identifica uma diferença relevante entre a extensão webMARS e o comportamento/ambiente do MARS 4.5.</p>")}
        `
      },
      {
        id: "versoes",
        title: "Versão editorial e versão do produto",
        content: html`
          ${table(["Campo", "Valor desta edição", "Significado"], [
            ["Manual", `<code>${MANUAL.version}</code>`, "Versão semântica do conteúdo e da aplicação do manual."],
            ["Apresentação", `<code>${MANUAL.displayVersion}</code>`, "Forma curta usada no cabeçalho."],
            ["webMARS", `<code>${MANUAL.webmarsVersion}</code>`, "Release funcional documentada."],
            ["Commit verificado", `<code>${MANUAL.verifiedCommit.slice(0, 12)}</code>`, "Estado exato do repositório auditado."],
            ["Data", `<time datetime="${MANUAL.verifiedAt}">${MANUAL.verifiedAt}</time>`, "Data da última verificação integral."]
          ])}
          <p>Correções ortográficas aumentam a versão <em>patch</em>. Novos capítulos ou cobertura de uma release do webMARS aumentam a versão <em>minor</em>. URLs ou formatos incompatíveis justificam uma versão <em>major</em>.</p>
        `
      },
      {
        id: "privacidade-manual",
        title: "Privacidade deste manual",
        content: html`
          <p>O manual é uma aplicação estática. A pesquisa ocorre no seu browser e não envia termos para um servidor. Não define cookies, não recolhe métricas e não carrega tipos de letra, scripts ou imagens de terceiros.</p>
          <p>A ligação “Abrir webMARS” conduz, num novo separador, à aplicação configurada pelo responsável desta edição do manual. Pode apontar para a instalação oficial, para uma universidade ou para um deployment local. A aplicação tem uma política própria: consulte <a href="#/cloud">Cloud e sincronização</a> para contas/projetos e <a href="#/estatisticas-utilizacao/o-que-e-enviado">Estatísticas de utilização</a> para a recolha automática da instalação oficial.</p>
        `
      }
    ]
  },
  {
    id: "aceder",
    number: "1",
    part: "Começar",
    title: "Aceder ao webMARS",
    summary: "Versão online, execução local, requisitos do browser, primeira abertura e recuperação.",
    intro: "O webMARS é distribuído como aplicação web estática. Não necessita de Java ou WebAssembly, mas deve ser servido por HTTP para que módulos, exemplos, bibliotecas e ajuda sejam carregados corretamente.",
    level: "Iniciante",
    readingMinutes: 10,
    keywords: ["instalar", "online", "localhost", "browser", "http", "offline", "sessão"],
    sources: ["README.md", "scripts/serve.mjs", "assets/js/app-modules/18-runtime-browser-storage.js", "docs/portability.md"],
    sections: [
      {
        id: "online",
        title: "Usar a versão online",
        content: html`
          ${steps([
            "Use a ligação <strong>Abrir webMARS</strong> no cabeçalho deste manual. O endereço é definido em <code>manual-config.js</code> e pode pertencer à instalação oficial, a uma universidade, a um docente ou ao seu ambiente local.",
            "Aguarde até a área de trabalho, os menus e o ficheiro inicial estarem visíveis. A aplicação emite o estado interno de pronta apenas depois de os módulos e catálogos necessários terminarem de carregar.",
            "Confirme o idioma no menu <strong>Definições → Interface…</strong>. Na primeira visita, o browser sugere um idioma suportado; uma escolha manual passa a ter prioridade.",
            "Para seguir este manual visualmente, escolha o tema <strong>Claro</strong>, não <strong>Sistema</strong>."
          ])}
          ${callout("note", "Conta opcional", "<p>Não precisa de criar conta para editar, compilar, montar, executar, usar ferramentas, guardar localmente, descarregar ficheiros ou abrir conteúdos públicos. A conta é necessária para projetos Cloud e para publicar ou gerir conteúdos na Biblioteca pública da instalação.</p>")}
        `
      },
      {
        id: "manual-integrado",
        title: "Ler o manual dentro da app ou num separador",
        content: html`
          ${steps([
            "Na aplicação, escolha <strong>Ajuda → Abrir o Manual</strong>, ou a mesma opção na janela de boas-vindas.",
            "O manual abre numa janela do ambiente de trabalho. Pode movê-la, redimensioná-la, maximizá-la ou minimizá-la como as outras janelas, mantendo o projeto aberto.",
            "Filtre o índice por assunto ou pesquise o texto completo com <kbd>Ctrl</kbd> + <kbd>K</kbd>. As ligações entre capítulos permanecem na janela do manual.",
            "Para estudar em paralelo ou noutro monitor, escolha <strong>Abrir num novo separador</strong> na barra da janela. Abre o capítulo e a secção que está a consultar.",
            "Também pode abrir diretamente a pasta <code>/manual/</code> desta instalação. A versão autónoma conserva a pesquisa, a referência e as imagens."
          ])}
          <p>Dentro da aplicação, o manual acompanha o tema claro ou escuro do ambiente de trabalho. No separador independente, o botão de tema permite escolher Sistema, Claro ou Escuro. A preferência autónoma não é alterada por consultar o manual integrado.</p>
          ${callout("note", "Idioma desta edição", "<p>O manual editorial está disponível em português de Portugal. A aplicação e a sua referência integrada suportam outros idiomas; mudar o idioma da app não traduz automaticamente os capítulos desta edição.</p>")}
        `
      },
      {
        id: "requisitos",
        title: "Requisitos e limites do browser",
        content: html`
          <p>Use um browser moderno com módulos JavaScript, armazenamento local, downloads e APIs de áudio. A experiência principal é desenhada para desktop e adapta-se a ecrãs estreitos. A compatibilidade é validada sobretudo em Chromium/Windows; outros motores modernos devem funcionar, mas não são uma garantia universal.</p>
          ${table(["Capacidade", "Necessária para", "Se estiver bloqueada"], [
            ["JavaScript e módulos", "Toda a aplicação", "A área de trabalho não inicia."],
            ["Armazenamento do browser", "Projetos, preferências, recuperação e VFS", "O trabalho pode não sobreviver ao reload."],
            ["Downloads", "Exportar ficheiros e relatórios", "O browser pode pedir autorização ou bloquear."],
            ["Popups/diálogos", "Input opcional e certas exportações", "Use o painel E/S ou autorize a ação iniciada pelo utilizador."],
            ["Web Audio", "Syscalls MIDI", "A primeira nota pode exigir um clique e o modo silencioso impede áudio."],
            ["Memória suficiente", "Programas, backsteps e ferramentas grandes", "Reduza o teto e o histórico; feche ferramentas não usadas."]
          ])}
        `
      },
      {
        id: "local",
        title: "Executar localmente",
        content: html`
          <p>Uma release é uma árvore de ficheiros estáticos. Descompactá-la e abrir <code>index.html</code> diretamente através de <code>file:</code> não é suportado, porque as políticas do browser podem impedir pedidos internos.</p>
          ${steps([
            "Instale Node.js 20 ou superior se trabalhar a partir do repositório.",
            "Na raiz do webMARS, inicie o servidor local incluído.",
            "Abra o endereço anunciado, por omissão <code>http://127.0.0.1:8080/</code>.",
            "Mantenha o processo ativo enquanto utiliza a aplicação. Terminar o servidor não apaga dados já guardados no browser."
          ])}
          ${codeBlock("npm start", "Terminal")}
          <p>Também pode alojar uma release em qualquer servidor HTTP estático que conserve caminhos, tipos MIME e os ficheiros de exemplos, ajuda, bibliotecas, ferramentas e Manual. A referência Java em <code>vendor/</code> só serve os testes de desenvolvimento e não é necessária no alojamento.</p>
        `
      },
      {
        id: "primeira-abertura",
        title: "Primeira abertura e preferências",
        content: html`
          <p>Na primeira visita, a janela <strong>Bem-vindo ao webMARS</strong> explica que a aplicação corre no browser e permite escolher a primeira ação, por exemplo abrir o primeiro exemplo. Pode fechá-la sem alterar o projeto; volta a estar disponível em <strong>Ajuda → Boas-vindas</strong>.</p>
          ${screenshot("./assets/screenshots/welcome-light.png", "Janela Bem-vindo ao webMARS sobre a área de trabalho, em português e no tema claro", "As Boas-vindas oferecem uma entrada orientada sem impedir o acesso ao editor, aos registos e aos restantes menus.")}
          <p>Sem preferências guardadas, o webMARS escolhe o idioma a partir das preferências do browser e usa o tema <strong>Sistema</strong>. O layout desktop começa com três janelas principais: área de trabalho à esquerda, Mensagens/E/S por baixo e Registos à direita.</p>
          <p>A aplicação guarda a seleção explícita de idioma, tema, posição do menu, opções do assembler, runtime, Mini-C e outras preferências. Limpar dados do site repõe esses valores.</p>
          ${callout("tip", "Ambiente reproduzível para aulas", "<p>Antes de uma demonstração, escolha explicitamente idioma e tema, use <strong>Definições → Guardar/carregar estado…</strong> para o projeto e descarregue uma cópia. Não dependa do tema Sistema nem de uma sessão antiga.</p>")}
        `
      },
      {
        id: "recuperacao",
        title: "Recuperar uma sessão",
        content: html`
          <p>Após um reload ou fecho involuntário, a recuperação automática tenta reabrir os ficheiros e o projeto de trabalho. Ficheiros externos que não pertencem à árvore do projeto podem reaparecer ao lado dos ficheiros persistidos.</p>
          <p>Recuperação não é versionamento: a limpeza do browser, modo privado, pressão de quota ou outro perfil elimina o acesso. Trabalho importante deve ser descarregado ou sincronizado.</p>
          ${callout("danger", "Antes de limpar dados locais", "<p>Descarregue todos os ficheiros alterados e confirme que projetos Cloud terminaram a sincronização. O comando de limpeza remove preferências, projetos locais, recuperação, VFS e posições das janelas depois da confirmação.</p>")}
        `
      },
      {
        id: "offline",
        title: "Utilização offline",
        content: html`
          <p>A release ${MANUAL.webmarsVersion} não é uma PWA instalável e não garante cache offline. Uma cópia local servida por HTTP funciona sem Internet depois de todos os ficheiros estarem disponíveis, mas Cloud e ligações externas deixam de funcionar.</p>
          <p>Para laboratórios sem rede, distribua a release completa e inicie um servidor local em cada máquina ou num servidor da rede interna. Teste os exemplos e bibliotecas antes da aula; não distribua apenas <code>index.html</code>.</p>
        `
      }
    ]
  },
  {
    id: "primeiros-passos",
    number: "2",
    part: "Começar",
    title: "Primeiros passos",
    summary: "Três tutoriais completos: Assembly, Mini-C e primeira depuração.",
    intro: "Nesta sequência vai produzir saída, observar o estado MIPS e controlar a execução. Os passos usam apenas recursos incluídos e terminam com sinais claros de sucesso.",
    level: "Iniciante",
    readingMinutes: 18,
    keywords: ["tutorial", "hello world", "montar", "executar", "minic", "breakpoint"],
    sources: ["examples/pt/hello_world_runio.asm", "examples/pt/hello_world.c", "assets/js/app-modules/20-app-runtime.js"],
    sections: [
      {
        id: "assembly",
        title: "O primeiro programa Assembly",
        content: html`
          <p>Este programa coloca o endereço de uma string em <code>$a0</code>, seleciona o syscall 4 em <code>$v0</code>, imprime e termina com o syscall 10.</p>
          ${codeBlock(firstAssembly)}
          ${steps([
            "Selecione <strong>Ficheiro → Novo → Projeto</strong>. Se já tiver um projeto aberto, feche-o primeiro ou adicione um ficheiro <code>.s</code>.",
            "Abra o separador <strong>Editor</strong>, substitua o conteúdo pelo programa e guarde o ficheiro como <code>ola.s</code>.",
            "Selecione <strong>Executar → Montar</strong> ou prima <kbd>F3</kbd>. O modo muda para <strong>Executar</strong> quando a imagem fica pronta.",
            "Confirme que o segmento de texto contém instruções a partir de <code>0x00400000</code> e que a etiqueta <code>main</code> aparece na tabela de símbolos.",
            "Selecione <strong>Executar → Executar</strong> ou prima <kbd>F5</kbd>."
          ])}
          ${callout("tip", "Resultado esperado", "<p>O painel <strong>E/S de execução</strong> apresenta <samp>Olá, webMARS!</samp> e uma linha de sistema informa que o programa terminou. O estado passa para “programa terminado”.</p>")}
        `
      },
      {
        id: "ler-estado",
        title: "Leia o que aconteceu",
        content: html`
          <p>No separador <strong>Executar</strong>, cada linha do segmento de texto mostra breakpoint, endereço, código máquina, instrução básica e fonte. Uma pseudoinstrução como <code>la</code> pode gerar mais de uma linha básica.</p>
          <ul>
            <li><strong>PC</strong> identifica a próxima instrução enquanto o programa está ativo.</li>
            <li><strong>$v0</strong> seleciona o serviço; <strong>$a0</strong> transporta o primeiro argumento.</li>
            <li>O segmento de dados contém os bytes da string e o terminador nulo.</li>
            <li><strong>Mensagens MARS</strong> contém diagnósticos de construção; <strong>E/S</strong> contém o diálogo do programa.</li>
          </ul>
          ${screenshot("./assets/screenshots/workspace-execute-light.png", "Área de trabalho do webMARS no tema claro, com o segmento de texto, dados, etiquetas, mensagens e registos visíveis", "Estado Montado no tema claro. A coluna BP da tabela — e não a margem do editor — é onde se marcam breakpoints.")}
        `
      },
      {
        id: "minic",
        title: "O primeiro programa Mini-C",
        content: html`
          ${codeBlock(`#include <stdio.h>

int main(void) {
    printf("Olá a partir de Mini-C!\\n");
    return 0;
}`, "Mini-C")}
          ${steps([
            "Num projeto aberto, selecione <strong>Ficheiro → Novo → ficheiro c</strong> e use o nome <code>ola.c</code>.",
            "Em <strong>Definições → Compilador Mini-C (C0)…</strong>, mantenha o perfil <code>C1-NATIVE</code> para este exemplo com <code>stdio.h</code>.",
            "Prima <kbd>F4</kbd>. A janela Mini-C apresenta o log e o Assembly gerado.",
            "Se não houver erros, selecione <strong>Abrir ASM como novo ficheiro</strong>. A abertura da janela de output não adiciona automaticamente o Assembly ao projeto.",
            "Ative o novo ficheiro Assembly, prima <kbd>F3</kbd> e depois <kbd>F5</kbd>."
          ])}
          ${callout("tip", "Resultado esperado", "<p>A saída apresenta <samp>Olá a partir de Mini-C!</samp>. O Assembly contém prólogo/epílogo, chamada da biblioteca e syscalls que implementam o comportamento C.</p>")}
          ${screenshot("./assets/screenshots/minic-compile-light.png", "Janela do compilador Mini-C com o separador MIPS gerado aberto no tema claro", "O output do compilador permite alternar entre o registo da compilação e o Assembly MIPS gerado antes de o abrir no projeto.")}
        `
      },
      {
        id: "depuracao",
        title: "A primeira sessão de depuração",
        content: html`
          ${codeBlock(debugAssembly)}
          ${steps([
            "Monte o programa e, no separador <strong>Executar</strong>, encontre a linha básica correspondente a <code>mul $t0, $t0, $t1</code>.",
            "Marque a caixa da coluna <strong>BP</strong> nessa linha. Os breakpoints pertencem à tabela do segmento de texto — não à margem do editor.",
            "Prima <kbd>F5</kbd>. A execução para antes da instrução marcada.",
            "Observe <code>$t0</code>, <code>$t1</code> e o PC. Prima <kbd>F7</kbd> uma vez e confirme a multiplicação.",
            "Prima <kbd>F8</kbd>. O webMARS aplica o delta inverso e repõe o estado anterior.",
            "Prima <kbd>F5</kbd> para atravessar o breakpoint uma vez e continuar; ou desmarque-o antes de continuar."
          ])}
          ${callout("note", "Passo e pseudoinstruções", "<p>O passo executa uma instrução básica da imagem montada. Se uma linha fonte expandiu para várias instruções, poderá permanecer visualmente associada à mesma fonte durante vários passos.</p>")}
        `
      },
      {
        id: "exemplos",
        title: "Abrir um exemplo incluído",
        content: html`
          <p><strong>Ficheiro → Exemplos</strong> abre submenus por categoria e, dentro de cada categoria, os exemplos. Não é uma caixa de catálogo pesquisável na versão ${MANUAL.webmarsVersion}.</p>
          ${steps([
            "Abra <strong>Ficheiro → Exemplos → Lições</strong>.",
            "Escolha <strong>01 — Registos e imediatos</strong>. O conteúdo é carregado no idioma ativo quando existe tradução.",
            "Leia os comentários no Editor antes de montar; cada lição declara o conceito e o resultado a observar.",
            "Prossiga pela ordem 01–15: a sequência passa de registos e representação para memória, funções, recursão, codificação, IEEE 754 e hierarquia de memória."
          ])}
          ${screenshot("./assets/screenshots/file-examples-light.png", "Menus Ficheiro, Exemplos e Aulas abertos, mostrando os quinze exemplos da categoria", "Os exemplos formam uma cascata de categoria e exemplo; a versão 0.6.0 não apresenta um catálogo com pesquisa.")}
        `
      },
      {
        id: "atalhos",
        title: "Atalhos essenciais",
        content: table(["Ação", "Atalho", "Efeito"], SHORTCUTS.slice(0, 13))
      },
      {
        id: "ecra-estreito",
        title: "Primeiros passos em telemóvel ou ecrã estreito",
        content: html`
          <p>Abaixo dos limiares responsivos, as janelas deixam de flutuar e tornam-se painéis empilhados. Apenas o painel escolhido ocupa a área útil. Barras móveis dão acesso a Menu, Controlos, Velocidade e Ver.</p>
          <ul>
            <li>Use o seletor de painéis para alternar entre Principal, Mensagens/E/S e Registos.</li>
            <li>Feche o teclado virtual para ganhar altura antes de inspecionar dados ou ferramentas.</li>
            <li>Submenus abrem por toque, não por hover.</li>
            <li>Ferramentas de ecrã virtual ocupam o painel; “Ajustar janela ao ecrã” permanece selecionado sem redimensionamento manual.</li>
          </ul>
        `
      }
    ]
  },
  {
    id: "interface",
    number: "3",
    part: "Ambiente",
    title: "Conhecer a interface",
    summary: "Menus, barras, modos, janelas, painéis, layout desktop e adaptação móvel.",
    intro: "A interface imita um ambiente de trabalho: janelas partilham um único projeto e um único runtime, mas cada uma pode ser movida, redimensionada, minimizada ou recuperada.",
    level: "Iniciante",
    readingMinutes: 18,
    keywords: ["interface", "menus", "janelas", "layout", "barra", "bench", "mobile"],
    sources: ["assets/js/app-modules/10-ui.js", "assets/js/app-modules/13-ui-menu-system.js", "assets/js/app-modules/20-app-runtime.js"],
    sections: [
      {
        id: "visao-geral",
        title: "Mapa do ambiente de trabalho",
        content: html`
          ${screenshot("./assets/screenshots/workspace-overview-light.png", "Visão geral do webMARS no tema claro após executar um programa, com segmentos de texto e dados, saída e registos", "A visão geral mostra como a janela Principal, Mensagens/E/S e Registos partilham o mesmo estado de execução.")}
          ${screenshot("./assets/screenshots/workspace-editor-light.png", "webMARS no tema claro em modo Editor, com projeto Mini-C, mensagens e banco de registos", "O painel Principal está no modo Editor; Mensagens/E/S ocupa a faixa inferior e Registos a coluna direita. O projeto novo contém src/main.c e src/main.s.")}
          ${table(["Zona", "Função", "Muda durante a execução"], [
            ["Menu", "Comandos por domínio: Ficheiro, Cloud, Biblioteca, Editar, Ver, Executar, Definições, Ferramentas e Ajuda.", "A disponibilidade dos comandos acompanha o estado."],
            ["Barra de ferramentas", "Acesso direto a criar, abrir, guardar, desfazer, compilar, montar e controlar.", "Botões ficam ativos/inativos."],
            ["Estado e velocidade", "Estado textual, seletor de velocidade e faixa Bench.", "Sim."],
            ["Janela Principal", "Projeto, Editor ou Executar.", "O modo Executar acompanha PC, texto e dados."],
            ["Mensagens / E/S", "Diagnósticos de compilação/montagem e conversa do programa.", "Sim."],
            ["Registos", "Inteiros, COP1 e COP0.", "Sim; alterações podem ser realçadas."],
            ["Ferramentas", "Janelas independentes ligadas ao runtime.", "Se estiverem ligadas."]
          ])}
        `
      },
      {
        id: "menus",
        title: "Barra de menus",
        content: html`
          <p>Os menus ficam no topo ou em baixo, conforme <strong>Definições → Interface…</strong>. No desktop com ponteiro, submenus abrem por hover; em toque ou layout empilhado exigem clique/toque para evitar cascatas acidentais.</p>
          ${table(["Menu", "Conteúdo"], MENU_ATLAS)}
          <p>Itens esbatidos têm uma pré-condição não satisfeita: por exemplo, não pode executar antes de montar nem guardar um projeto Cloud sem sessão autenticada.</p>
        `
      },
      {
        id: "barra-ferramentas",
        title: "Barra de ferramentas e estado",
        content: html`
          <p>A barra repete as ações de uso frequente. “Compilar” só se aplica a um ficheiro C/C0 ativo; “Montar” aplica-se às fontes Assembly; “Executar”, “Passo” e “Reiniciar” exigem uma imagem montada.</p>
          ${table(["Controlo", "Quando está disponível", "Observação"], [
            ["Novo / Abrir / Guardar", "Conforme projeto e ficheiro ativo", "Novo é contextual."],
            ["Desfazer / Refazer", "Quando o editor tem histórico", "Opera no ficheiro ativo."],
            ["Compilar", "Fonte C/C0 ativa", "Gera texto Assembly na janela Mini-C."],
            ["Montar", "Fonte Assembly ou âmbito Assembly válido", "Substitui a imagem anterior se tiver sucesso."],
            ["Executar", "Programa montado e não terminado", "Continua após pausa/breakpoint."],
            ["Passo / Backstep", "Programa montado / histórico disponível", "Uma instrução básica ou um delta inverso."],
            ["Pausa / Parar", "Execução ativa", "Pausa preserva; Parar termina."],
            ["Reiniciar", "Programa montado", "Repõe o estado inicial da mesma imagem."]
          ])}
          <p>O texto de estado distingue, entre outros, programa parado, em execução, pausado, aguardando input, num breakpoint, terminado ou com erro.</p>
        `
      },
      {
        id: "velocidade-bench",
        title: "Velocidade e faixa Bench",
        content: html`
          <p>O seletor percorre velocidades interativas até ao máximo. Em ritmos lentos, o utilizador vê a instrução e as alterações a cada passo. No máximo, o webMARS reduz realces e deslocamentos visuais dispendiosos para privilegiar throughput; ferramentas ligadas continuam a receber os dados necessários.</p>
          <p>A faixa <strong>Bench</strong> mostra durações recentes de Compilar, Montar e Executar, mais uma estimativa de ocupação JavaScript. Estes números são medições locais e voláteis, úteis para comparar o mesmo browser e máquina — não são ciclos MIPS nem um benchmark entre computadores sem protocolo controlado.</p>
        `
      },
      {
        id: "modos-principal",
        title: "Modos Projeto, Editor e Executar",
        content: html`
          <ul>
            <li><strong>Projeto</strong> apresenta biblioteca e árvore, pesquisa, ordenação e operações sobre ficheiros/pastas.</li>
            <li><strong>Editor</strong> apresenta o ficheiro ativo, separadores, numeração, cursor, procura e diagnósticos.</li>
            <li><strong>Executar</strong> apresenta o segmento de texto, símbolos e segmento de dados. Editor e segmentos não aparecem simultaneamente no mesmo painel.</li>
          </ul>
          <p>Compilar ou montar pode mudar o modo automaticamente quando o resultado relevante deve ser inspecionado. Mudar de modo não altera a execução nem fecha ficheiros.</p>
        `
      },
      {
        id: "janelas",
        title: "Mover e recuperar janelas",
        content: html`
          <p>Arraste a barra de título para mover uma janela e as margens/alças para redimensionar. Minimizar conserva a janela mas reduz a área ocupada; maximizar ocupa o desktop; fechar/esconder retira-a da vista sem necessariamente terminar a ferramenta.</p>
          <p>Use <strong>Ver</strong> para recuperar janelas ocultas. O layout guarda limites normalizados para sobreviver a alterações de viewport. Se uma geometria antiga ficar fora do ecrã, o gestor tenta limitar e reencaixar.</p>
          ${callout("tip", "Reposição segura", "<p>Se perdeu uma janela, tente primeiro <strong>Ver</strong> e o comando de layout predefinido. Limpar todo o armazenamento local é o último recurso, porque remove também projetos e preferências.</p>")}
        `
      },
      {
        id: "mensagens-io",
        title: "Mensagens MARS e E/S de execução",
        content: html`
          <p>As duas transcrições têm papéis diferentes. Mensagens MARS recebe informação e diagnóstico do assembler, compilador, Cloud e aplicação. E/S recebe bytes/texto escritos pelo programa, linhas introduzidas pelo utilizador e marcadores de sistema.</p>
          <p>Com <strong>Separar Mensagens de E/S</strong>, ambas ficam visíveis em simultâneo. Sem essa preferência, alternam por separadores. Limpar uma transcrição não reverte a máquina. <strong>Ficheiro → Exportar E/S</strong> descarrega a conversa de execução para avaliação ou diagnóstico.</p>
        `
      },
      {
        id: "registos",
        title: "Janela Registos",
        content: html`
          <p>O separador Registos lista os 32 registos gerais, número, hexadecimal e decimal, além de PC, HI e LO conforme a vista. COP1 apresenta registos de ponto flutuante e flags de condição; COP0 apresenta estado de exceção e interrupções.</p>
          <p>O realce de alterações pode ser desligado nas preferências. Em execução máxima, realces intermédios podem ser suprimidos, mas o valor final continua correto. Os registos não são campos de edição livre durante uma execução.</p>
        `
      },
      {
        id: "mobile",
        title: "Layout empilhado e móvel",
        content: html`
          <p>Em ecrãs estreitos, o desktop transforma-se numa sequência de painéis com um painel ativo. O comportamento evita janelas sobrepostas impossíveis de manipular por toque. Alturas mínimas mantêm tabelas de registos acessíveis sem criar scroll interno inacessível.</p>
          <ul>
            <li>O menu pode ocupar uma barra móvel dedicada.</li>
            <li>Submenus abrem por toque e voltam ao nível anterior.</li>
            <li>O painel Principal alterna Projeto/Editor/Executar como no desktop.</li>
            <li>Ferramentas abertas entram no seletor de painéis.</li>
            <li>Redimensionar manualmente não é o fluxo principal no layout empilhado.</li>
          </ul>
        `
      }
    ]
  },
  {
    id: "projetos-ficheiros",
    number: "4",
    part: "Ambiente",
    title: "Projetos, ficheiros e armazenamento",
    summary: "Árvore de projetos, operações de ficheiros, importação, persistência, recuperação, VFS e Cloud.",
    intro: "Um projeto organiza fontes e metadados; um ficheiro aberto é uma vista editável desse conteúdo. O webMARS oferece vários mecanismos de persistência que não são equivalentes.",
    level: "Iniciante a intermédio",
    readingMinutes: 25,
    keywords: ["projeto", "ficheiro", "pasta", "guardar", "download", "browser storage", "vfs", "quota", "arrastar"],
    sources: ["assets/js/app-modules/11-ui-file-manager.js", "assets/js/app-modules/18-runtime-browser-storage.js", "assets/js/app-modules/20-app-runtime.js"],
    sections: [
      {
        id: "conceitos",
        title: "Projeto, ficheiro ativo e biblioteca",
        content: html`
          <p>A biblioteca de projetos é o conjunto persistido no browser. Um projeto aberto fornece a árvore e o âmbito de compilação/montagem. O ficheiro ativo determina o editor, o modo de autoria e, em certas opções, a diretoria Assembly a montar.</p>
          <p>Fechar um ficheiro retira o separador, mas não elimina automaticamente a entrada da árvore. Fechar o projeto encerra o contexto completo. Eliminar é uma operação diferente e exige confirmação.</p>
        `
      },
      {
        id: "criar-projeto",
        title: "Criar e mudar de projeto",
        content: html`
          ${steps([
            "Selecione <strong>Ficheiro → Novo → Projeto</strong> ou use <kbd>Ctrl</kbd> + <kbd>N</kbd> quando nenhum projeto está aberto.",
            "Indique o nome solicitado. O webMARS cria <code>src/main.c</code> e <code>src/main.s</code> a partir dos templates e abre o painel Projeto.",
            "Adicione um ficheiro C ou Assembly pelo submenu <strong>Novo</strong> ou pela árvore.",
            "Para mudar, selecione outro projeto na biblioteca. Ficheiros alterados desencadeiam confirmação antes de perder uma vista não persistida."
          ])}
          ${callout("warning", "Ctrl+N é contextual", "<p>Com um projeto já aberto, <kbd>Ctrl</kbd> + <kbd>N</kbd> cria um novo ficheiro <code>.s</code>, embora a etiqueta visual do menu possa continuar associada ao primeiro item “Projeto”. Use o submenu se quiser evitar ambiguidade.</p>")}
        `
      },
      {
        id: "tipos",
        title: "Tipos de ficheiro",
        content: html`
          ${table(["Extensão", "Papel", "Modo"], [
            ["<code>.s</code>, <code>.asm</code>, <code>.mips</code>", "Fonte Assembly MIPS", "Editor/Assembler"],
            ["<code>.c</code>, <code>.c0</code>", "Fonte Mini-C", "Editor/Compilador"],
            ["<code>.h</code>, <code>.h0</code>", "Cabeçalho ou declarações Mini-C", "Editor/Compilador"],
            ["<code>.txt</code>", "Texto auxiliar", "Editor, não montado"],
            ["<code>.p</code>", "Descritor de projeto importável", "Importação/compatibilidade"]
          ])}
          <p>A classificação pelo nome controla a disponibilidade de Compilar e Montar. Renomear uma extensão pode mudar o modo, mas não converte o conteúdo.</p>
        `
      },
      {
        id: "arvore",
        title: "Trabalhar na árvore de projetos",
        content: html`
          <p>O gestor suporta pesquisa, ordenação, colunas adaptáveis, seleção simples e múltipla, menu de contexto, teclado e arrastar/largar. Pastas podem conter fontes, cabeçalhos e texto auxiliar.</p>
          <ul>
            <li><strong>Clique</strong> abre/ativa uma entrada; modificadores permitem seleção múltipla.</li>
            <li><strong>Renomear</strong> preserva o conteúdo e atualiza caminhos internos conhecidos.</li>
            <li><strong>Eliminar</strong> remove entradas selecionadas depois de confirmação.</li>
            <li><strong>Arrastar dentro do projeto</strong> move; arrastar entre projetos copia, preservando o original.</li>
            <li>As bibliotecas globais incluídas são apresentadas como <strong>só de leitura</strong>; podem ser abertas para estudo, não alteradas no local.</li>
          </ul>
          ${callout("tip", "Projetos multificheiro", "<p>Mantenha fontes relacionadas na mesma pasta quando depender de “Montar todos”. Para Mini-C, <code>#use</code>/<code>#include</code> e a ligação do projeto resolvem dependências através da árvore.</p>")}
        `
      },
      {
        id: "importar",
        title: "Importar do disco",
        content: html`
          <p><strong>Abrir do disco</strong> usa o seletor do browser e aceita seleção múltipla. Os ficheiros são lidos para memória; o browser não concede acesso permanente e irrestrito à pasta original.</p>
          <p>Quando importa apenas fontes relacionadas, confira nomes e caminhos de <code>.include</code>, <code>#use</code> e <code>#include</code>. Um descritor <code>.p</code> pode reconstruir um projeto compatível; a interface atual não oferece necessariamente o fluxo inverso de exportação <code>.p</code>, por isso use downloads dos ficheiros/projeto conforme disponível.</p>
        `
      },
      {
        id: "guardar",
        title: "Guardar, descarregar e fechar",
        content: html`
          ${table(["Comando", "Efeito", "Destino"], [
            ["Guardar ficheiro ativo", "Persiste o conteúdo ativo no mecanismo local associado.", "Browser"],
            ["Guardar projeto", "Persiste árvore, ficheiros e metadados locais do projeto.", "Browser"],
            ["Descarregar", "Cria uma cópia do ficheiro através do browser.", "Pasta de downloads"],
            ["Descarregar como", "Permite escolher outro nome.", "Pasta de downloads"],
            ["Fechar ficheiro", "Retira a vista; confirma alterações quando necessário.", "Não elimina por si só"],
            ["Fechar projeto", "Encerra o contexto e as vistas pertencentes.", "Não elimina por si só"]
          ])}
          ${callout("note", "O botão Guardar não grava diretamente no seu disco", "<p>Browsers não permitem sobrescrever silenciosamente um ficheiro arbitrário do computador. Para uma cópia portátil e verificável, use <strong>Descarregar</strong>.</p>")}
        `
      },
      {
        id: "matriz-persistencia",
        title: "Comparar os mecanismos de persistência",
        content: table(["Mecanismo", "O que guarda", "Onde", "Garantia"], STORAGE_MATRIX)
      },
      {
        id: "slots",
        title: "Guardar e carregar estados do projeto",
        content: html`
          <p><strong>Definições → Guardar/carregar estado…</strong> oferece cinco slots. Um slot captura ficheiros do projeto, preferências, janelas/ferramentas, geometria de layout e modo de autoria. É adequado para preparar um cenário de aula ou regressar a uma organização de trabalho.</p>
          ${callout("warning", "Não é um snapshot da máquina MIPS", "<p>Os slots não prometem conservar PC, registos, memória de execução ou o ponto exato de um programa ativo. Para repetir uma experiência, carregue o slot, volte a montar e execute o procedimento.</p>")}
        `
      },
      {
        id: "vfs",
        title: "Sistema virtual de ficheiros",
        content: html`
          <p>Syscalls de ficheiros e bibliotecas Mini-C usam um VFS no browser. Descritores 0, 1 e 2 representam entrada, saída e erro padrão; outros descritores são atribuídos a ficheiros abertos, até ao limite implementado.</p>
          <p>O VFS não dá acesso geral ao sistema operativo e é separado da árvore editorial do projeto. Um programa pode criar <code>dados.txt</code> no VFS sem surgir como fonte do projeto. Backstep conserva cursores e alterações cobertas pelo delta.</p>
        `
      },
      {
        id: "quota-limpeza",
        title: "Quota, limpeza e recuperação",
        content: html`
          <p>O armazenamento está sujeito às quotas e políticas do browser. O webMARS limita certos payloads a cerca de 1 MiB e tenta estratégias menores quando uma gravação falha. Muitos projetos grandes, estados ou ficheiros VFS podem atingir o teto.</p>
          ${steps([
            "Descarregue cópias dos ficheiros e relatórios importantes.",
            "Feche ferramentas ou projetos que já não precisa de guardar em estado.",
            "Elimine entradas conscientemente na biblioteca ou no VFS.",
            "Use a limpeza global apenas depois de verificar backups e Cloud."
          ])}
        `
      }
    ]
  },
  {
    id: "editor",
    number: "5",
    part: "Ambiente",
    title: "Editor",
    summary: "Separadores, edição, procura, diagnósticos, ficheiros só de leitura e comportamento móvel.",
    intro: "O editor mantém um buffer por ficheiro aberto, associa diagnósticos ao caminho e sincroniza alterações com o projeto. A fonte continua distinta da imagem montada até uma montagem bem-sucedida.",
    level: "Iniciante",
    readingMinutes: 12,
    keywords: ["editor", "separadores", "procura", "diagnósticos", "sintaxe", "cursor", "undo"],
    sources: ["assets/js/app-modules/10-ui.js", "assets/js/app-modules/11-ui-file-manager.js", "assets/js/app-modules/20-app-runtime.js"],
    sections: [
      {
        id: "ficheiro-ativo",
        title: "Separadores e ficheiro ativo",
        content: html`
          <p>Cada separador identifica um ficheiro aberto. Selecioná-lo muda o buffer, o nome apresentado, o modo Assembly/Mini-C e os comandos disponíveis. Um marcador de alteração indica conteúdo ainda não persistido no projeto/mecanismo local.</p>
          <p>Fechar o separador não é o mesmo que eliminar a entrada. Um ficheiro de biblioteca global abre em modo só de leitura; copie-o para o projeto se quiser experimentar alterações.</p>
        `
      },
      {
        id: "edicao",
        title: "Editar e navegar",
        content: html`
          <p>O editor apresenta numeração de linhas, realce lexical, posição do cursor e scroll sincronizado com a fonte ativa. Use <kbd>Tab</kbd> conforme a política do editor e as combinações convencionais para selecionar, cortar, copiar e colar.</p>
          ${table(["Ação", "Atalho", "Âmbito"], [
            ["Desfazer", "<kbd>Ctrl</kbd> + <kbd>Z</kbd>", "Histórico do ficheiro ativo"],
            ["Refazer", "<kbd>Ctrl</kbd> + <kbd>Y</kbd>", "Histórico do ficheiro ativo"],
            ["Cortar/copiar/colar", "<kbd>Ctrl</kbd> + <kbd>X/C/V</kbd>", "Seleção e clipboard do browser"],
            ["Procurar", "<kbd>Ctrl</kbd> + <kbd>F</kbd>", "Pesquisa literal e sensível a maiúsculas; procura a próxima ocorrência e dá uma volta"],
            ["Selecionar tudo", "<kbd>Ctrl</kbd> + <kbd>A</kbd>", "Conteúdo do editor quando tem foco"]
          ])}
        `
      },
      {
        id: "diagnosticos",
        title: "Diagnósticos e linhas",
        content: html`
          <p>Erros do assembler e do Mini-C incluem ficheiro e linha quando a fase consegue associá-los. Selecionar um diagnóstico pode ativar o ficheiro e posicionar a linha. Mensagens originadas depois de expansão de macro, inclusão ou geração podem referir a fonte lógica e a instrução básica.</p>
          <p>Corrigir o texto não altera a imagem montada anterior. Volte a compilar/montar e confirme que as Mensagens MARS indicam sucesso antes de confiar na execução.</p>
          ${callout("tip", "Evite cascatas", "<p>Comece pelo primeiro erro do primeiro ficheiro. Um delimitador, diretiva ou declaração inválida pode produzir dezenas de sintomas posteriores.</p>")}
        `
      },
      {
        id: "apresentacao",
        title: "Tipo, espaçamento e realce",
        content: html`
          <p><strong>Definições → Interface…</strong> controla tamanho de letra, altura/espaçamento e opções de realce. Estes valores afetam apresentação, não a semântica do programa. O tema aplica-se à área de trabalho, ferramentas e ajuda incorporada.</p>
          <p>Para projeção, aumente o tipo e use o Screen Magnifier para uma região pequena. Para screenshots do manual, mantenha 100% de zoom e o perfil documentado em <code>SCREENSHOTS.md</code>.</p>
        `
      },
      {
        id: "fonte-vs-execucao",
        title: "Fonte, Assembly gerado e imagem executável",
        content: html`
          <p>Há três representações possíveis do “mesmo” programa: fonte Mini-C, texto Assembly gerado e imagem montada. Editar uma não atualiza automaticamente as seguintes.</p>
          ${workflow([
            { label: "Editar", title: "Fonte C/C0" },
            { label: "F4", title: "Output Mini-C" },
            { label: "Abrir como ficheiro", title: "Fonte Assembly" },
            { label: "F3", title: "Imagem MIPS" }
          ])}
          <p>Na depuração, a associação de fonte do assembler refere o Assembly. A janela Mini-C ajuda a relacioná-lo com o C através dos comentários de scaffolding opcionais.</p>
        `
      },
      {
        id: "mobile-editor",
        title: "Editor em ecrãs estreitos",
        content: html`
          <p>O editor ocupa o painel Principal e adapta a barra de separadores. O teclado virtual reduz a altura; feche-o antes de mudar para Execução ou Registos. Gestos de scroll devem começar dentro da área de código para não mudar acidentalmente outro painel.</p>
        `
      }
    ]
  }
];
