import { html, callout, steps, table, screenshot } from "./shared.mjs";

export const TOOL_DATA = [
  {
    id: "bht-simulator",
    name: "BHT Simulator",
    group: "Arquitetura e desempenho",
    purpose: "Simular uma Branch History Table indexada pelo endereço e medir acertos de previsão em branches executados.",
    example: "Branch prediction in action (<code>branch_predictor_bht_demo.asm</code>)",
    connect: "Abra antes de executar, escolha 8/16/32 entradas, histórico de 1 ou 2 bits e estado inicial taken/not-taken; depois selecione Connect.",
    controls: "Tabela, tamanho, bits de história, estado inicial, Connect/Disconnect, Reset e log.",
    interpretation: "Cada branch seleciona uma entrada; o contador muda com o resultado real. Compare previsões, acertos, falhas e aliasing de branches no mesmo índice.",
    protocol: "Observa eventos de branch do runtime; não usa registos MMIO.",
    limits: "Modelo pedagógico local. Não representa BTB, RAS, história global nem o preditor de um CPU específico. Backstep reverte enquanto o histórico do runtime existe."
  },
  {
    id: "bitmap-display",
    name: "Bitmap Display",
    group: "Ecrãs e dispositivos",
    purpose: "Renderizar uma região de memória como framebuffer de píxeis coloridos.",
    example: "Bars on the bitmap display (<code>bitmap_display_bars.asm</code>) ou Rectangles on the bitmap display.",
    connect: "Defina endereço base, largura/altura do ecrã e largura/altura da unidade; ligue a ferramenta antes das stores do programa.",
    controls: "Endereço base, dimensões do display/unidade, Connect, Reset e Fit Window.",
    interpretation: "Cada unidade lê uma word de cor do framebuffer. A dimensão da unidade amplia um valor lógico em vários píxeis do canvas.",
    protocol: "Framebuffer configurável; o programa pode aplicar o bloco WBMP por MMIO e escolher destino 1.",
    limits: "Endereço e dimensões têm de caber no mapa e nos limites de imagem. Um ecrã vazio costuma indicar base diferente, ferramenta ligada tarde ou stores noutra região."
  },
  {
    id: "bitmap-terminal-tool",
    name: "Bitmap Terminal Tool",
    group: "Ecrãs e dispositivos",
    purpose: "Combinar um terminal de texto desenhado num framebuffer com uma fila de teclado acessível ao programa.",
    example: "Não há exemplo dedicado na 0.6.0; derive <code>bitmap_ascii.c</code> e use <code>bitmap_configure_terminal</code> em vez de <code>bitmap_configure_display</code>.",
    connect: "Configure geometria/base, ligue e dê foco à área de teclado antes de executar o fixture.",
    controls: "Configuração recolhível, endereço e dimensões, teclado, Connect, Reset e Fit Window.",
    interpretation: "O framebuffer mostra células/píxeis; teclas introduzidas entram na fila MMIO consumida pelo programa.",
    protocol: "Bloco WBMP com destino 2; registos da ferramenta junto à base MMIO ativa.",
    limits: "A ausência de exemplo oficial é uma lacuna conhecida. Documente qualquer fixture derivado no projeto do manual."
  },
  {
    id: "cache-simulator",
    name: "Data Cache Simulator",
    group: "Arquitetura e desempenho",
    purpose: "Observar referências de dados e simular hits/misses numa cache configurável.",
    example: "Cache: how stride changes the time (<code>cache_stride_benchmark.asm</code>) ou Lição 15.",
    connect: "Escolha mapeamento direto, totalmente associativo ou N-way; 1–64 blocos; bloco de 1/2/4/8/16 words; política LRU ou aleatória. Ative e ligue antes do run.",
    controls: "Placement, número de blocos, associatividade, words/bloco, replacement, enabled, Connect, Reset e log.",
    interpretation: "Compare hits, misses e hit rate. Alterar stride muda a localidade espacial e conflitos de índice.",
    protocol: "Observa loads/stores do runtime, não substitui a memória funcional.",
    limits: "Não modela latências do hardware, write buffers, coerência, níveis múltiplos ou TLB. Use o Pipeline Lab para latência estrutural separada."
  },
  {
    id: "digital-lab-sim",
    name: "Digital Lab Sim",
    group: "Ecrãs e dispositivos",
    purpose: "Simular dois displays de sete segmentos, um keypad e um contador/interrupção de laboratório digital.",
    example: "Seven segments and a keypad (<code>digital_lab_sim_demo.asm</code>)",
    connect: "Ligue a ferramenta, monte o exemplo e execute. Clique nas teclas virtuais quando o programa estiver a fazer polling ou à espera de interrupção.",
    controls: "Connect, Reset, teclas do keypad e visualização dos dois displays/estado do contador.",
    interpretation: "Bits escritos nos registos controlam os segmentos; o keypad expõe linha/coluna/código conforme o protocolo. O contador pode tornar uma interrupção pendente.",
    protocol: "Offsets MMIO dedicados relativamente à base do dispositivo; respeite máscaras, acknowledge e endianness.",
    limits: "É um dispositivo lógico, sem bounce elétrico ou temporização de hardware real. Cliques sem leitura do programa não produzem output por si."
  },
  {
    id: "float-representation",
    name: "Floating Point Representation",
    group: "Aprendizagem e utilitários",
    purpose: "Converter uma word entre hexadecimal, campos IEEE 754 e valor decimal, opcionalmente acompanhando um registo COP1.",
    example: "Floating point on the FPU (<code>floating_point_demo.asm</code>)",
    connect: "Pode ser usada isoladamente. Para dados live, ligue ao runtime e selecione <code>$f0</code>–<code>$f31</code>.",
    controls: "Valor hexadecimal, sinal, expoente, fração, decimal, seletor de registo, Connect e Reset.",
    interpretation: "Observe bias do expoente, bit implícito, subnormais, zeros assinados, infinito e NaN.",
    protocol: "Lê bits COP1; não usa MMIO.",
    limits: "A vista principal é de precisão simples (32 bits). Doubles exigem interpretar pares e a vista COP1 do runtime."
  },
  {
    id: "instruction-counter",
    name: "Instruction Counter",
    group: "Arquitetura e desempenho",
    purpose: "Contar instruções comprometidas e agrupá-las pelas formas R, I e J.",
    example: "Bubble sort on an array (<code>bubble_sort_array.asm</code>)",
    connect: "Reset, Connect e execute o programa completo ou um intervalo controlado.",
    controls: "Connect/Disconnect, Reset, total e contadores R/I/J.",
    interpretation: "O total permite comparar algoritmos sob a mesma entrada. R/I/J descrevem codificação, não custo em ciclos.",
    protocol: "Observa instruções executadas; não usa MMIO.",
    limits: "Pseudoinstruções contam pelas instruções básicas geradas. Syscalls e tempo do browser não se traduzem num custo de instruções anfitriãs."
  },
  {
    id: "instruction-statistics",
    name: "Instruction Statistics",
    group: "Arquitetura e desempenho",
    purpose: "Agrupar o fluxo executado em ALU, jump, branch, memory e other.",
    example: "Bubble sort, Fibonacci ou qualquer programa com mistura representativa.",
    connect: "Ligue antes do run e mantenha a mesma entrada ao comparar versões.",
    controls: "Connect/Disconnect, Reset, total e barras/contadores por categoria.",
    interpretation: "Uma percentagem alta de memory sugere pressão de dados; branch/jump caracteriza controlo; ALU caracteriza cálculo.",
    protocol: "Classifica opcodes básicos observados.",
    limits: "Categorias não medem latência, energia ou micro-ops. Compare com cache, BHT e Pipeline para uma leitura causal."
  },
  {
    id: "intro-to-tools",
    name: "Introduction to Tools",
    group: "Aprendizagem e utilitários",
    purpose: "Demonstrar a interface comum de uma ferramenta e o ciclo Connect/Reset sem modificar a simulação.",
    example: "Pode abrir sem programa.",
    connect: "Leia a janela e experimente Connect, executar alguns passos e Reset.",
    controls: "Texto introdutório, Connect/Disconnect e Reset.",
    interpretation: "Serve para perceber que abrir uma tool não é o mesmo que ligá-la ao MIPS.",
    protocol: "Observação básica do host de ferramentas.",
    limits: "O texto interno conserva referências históricas a classes Java/<code>mars.tools</code>. Para criar ferramentas web, a autoridade é <code>docs/tool-api.md</code>."
  },
  {
    id: "keyboard-display-mmio",
    name: "Keyboard and Display MMIO Simulator",
    group: "Ecrãs e dispositivos",
    purpose: "Simular os quatro registos clássicos de receiver/transmitter para teclado e display de caracteres.",
    example: "Keyboard and display through MMIO (<code>keyboard_display_mmio_echo.asm</code>)",
    connect: "Escolha atraso de transmissão fixo/uniforme/normal, ligue, execute e escreva na área de teclado.",
    controls: "Display, input de teclado, tipo/parâmetros de delay, DAD, Connect e Reset.",
    interpretation: "O programa verifica bits ready, lê receiver data e escreve transmitter data. Se interrupções estiverem ativas, os bits de controlo participam em Cause.",
    protocol: "No mapa Default: receiver control/data em <code>0xffff0000/+4</code> e transmitter control/data em <code>+8/+c</code>.",
    limits: "Escrever quando o transmissor não está pronto viola o protocolo do exercício. O atraso é simulado e não garante tempo físico."
  },
  {
    id: "mars-bot",
    name: "Mars Bot",
    group: "Ecrãs e dispositivos",
    purpose: "Controlar um robô 2D com posição, direção, movimento e caneta através de memória mapeada.",
    example: "Driving the Mars Bot (<code>mars_bot_game.asm</code>)",
    connect: "Ligue, execute e use as teclas previstas pelo exemplo; pare depois de existir um trilho para inspecionar posição/direção.",
    controls: "Canvas, estado/heading, Connect, Reset e interação de teclado conforme o exemplo.",
    interpretation: "Mudanças de heading e movimento alteram coordenadas; caneta ativa regista segmentos no canvas.",
    protocol: "Registos MMIO próprios para heading, move, leave-track e posição.",
    limits: "Não há física, colisões ou aceleração realistas; é um autómato gráfico determinístico orientado por comandos."
  },
  {
    id: "memory-reference-visualization",
    name: "Memory Reference Visualization",
    group: "Arquitetura e desempenho",
    purpose: "Criar um mapa de calor de loads/stores por região e revelar localidade espacial.",
    example: "Lição 15 — Why stride changes the speed ou cache stride benchmark.",
    connect: "Escolha base/região, dimensões e words por unidade; ligue antes de executar.",
    controls: "Base (.text/.extern/.data/heap/stack/.kdata/MMIO), linhas/colunas, words/unidade, Connect e Reset.",
    interpretation: "Células mais intensas receberam mais referências. Padrões lineares mostram varrimento; saltos mostram stride; manchas revelam working set.",
    protocol: "Observa eventos de memória; não altera conteúdo.",
    limits: "Agrega referências numa célula e perde ordem temporal detalhada. Use o log/cache para distinguir hits e sequência."
  },
  {
    id: "mips-xray",
    name: "MIPS X-Ray",
    group: "Arquitetura e desempenho",
    purpose: "Relacionar uma instrução com campos codificados, sinais de controlo e percurso no datapath.",
    example: "Lição 13 — An instruction is a number.",
    connect: "Ligue ao programa montado e dê 1–3 passos; selecione zoom adequado.",
    controls: "Connect, Reset, zoom, instrução/endereço, decode e vista do datapath.",
    interpretation: "Leia opcode/rs/rt/rd/immediate/funct e o next PC; siga os caminhos destacados entre banco de registos, ALU, memória e PC.",
    protocol: "Observa a instrução corrente do runtime; não usa MMIO.",
    limits: "Datapath educativo estático; não representa o timing do Pipeline Lab nem todas as unidades de uma implementação real."
  },
  {
    id: "example-register-watch",
    name: "Register Watch (example)",
    group: "Aprendizagem e utilitários",
    purpose: "Exemplo mínimo de ferramenta web que acompanha registos selecionados e mantém um log.",
    example: "Lição 01 — Registers and immediates.",
    connect: "Abra, selecione <code>$t0</code> ou outro registo, ligue e avance instruções.",
    controls: "Seletor de registo, valor live, Connect, Clear e log.",
    interpretation: "Cada alteração observada demonstra snapshots/eventos e o contrato do host.",
    protocol: "API web de ferramentas; não usa MMIO.",
    limits: "É exemplo para autores, não um monitor multirregisto completo. Consulte <code>docs/tool-api.md</code>."
  },
  {
    id: "pipeline-lab",
    name: "Pipeline Lab",
    group: "Arquitetura e desempenho",
    purpose: "Explorar execução num pipeline IF/ID/EX/MEM/WB, hazards, forwarding, predição e CPI.",
    example: "Lição 11, branch predictor demo e os sete laboratórios em <code>docs/labs</code>.",
    connect: "Abra depois de montar; escolha replay real ou fluxo estático, preset e configuração. Avance por ciclo ou siga o runtime.",
    controls: "Vistas Aprender/Registos/Arquitetura, presets, parâmetros, Prev/Next, Run to Drain, previsão, comparação e exportação JSON/CSV.",
    interpretation: "Leia instruções em voo, bubbles, stalls, flushes, dependências, valores por ciclo, métricas e CPI.",
    protocol: "Modelo temporal separado alimentado pela imagem/trace; não usa MMIO.",
    limits: "Não é um segundo executor nem um CPU real. O capítulo Pipeline Lab detalha o modelo e os limites."
  },
  {
    id: "scavenger-hunt",
    name: "ScavengerHunt",
    group: "Aprendizagem e utilitários",
    purpose: "Executar um desafio visual em que o programa descobre e manipula estado partilhado na memória.",
    example: "The scavenger hunt challenge (<code>scavenger_hunt_player.asm</code>)",
    connect: "Abra, ligue, monte o player e execute; observe o progresso antes de alterar o algoritmo.",
    controls: "Canvas/estado do desafio, Connect e Reset.",
    interpretation: "O programa lê pistas e escreve ações; o estado visual confirma se o protocolo foi seguido.",
    protocol: "Memória partilhada nos endereços definidos pela tool/exemplo.",
    limits: "O desafio depende da disposição e regras da tool; hardcoding não generaliza para outros exercícios."
  },
  {
    id: "screen-magnifier",
    name: "Screen Magnifier",
    group: "Aprendizagem e utilitários",
    purpose: "Ampliar uma região do desktop para demonstração, projeção e apoio visual.",
    example: "Qualquer programa; selecione Main, Registers ou Messages.",
    connect: "Escolha alvo, escala entre 1× e 4×, centro/auto-scale e Capture/atualização.",
    controls: "Target, escala, center, auto-scale e capture.",
    interpretation: "A ferramenta desenha uma captura ampliada do alvo; use para destacar um registo ou linha sem mudar o zoom global.",
    protocol: "Captura visual do DOM/canvas; não observa MMIO.",
    limits: "Não substitui zoom do browser ou tecnologias assistivas; alguns canvases/iframes podem ter limitações de captura."
  },
  {
    id: "stack-visualizer",
    name: "Stack Visualizer",
    group: "Arquitetura e desempenho",
    purpose: "Explicar frames, palavras, bytes/bits, alterações de <code>$sp</code>, chamadas e anomalias da stack.",
    example: "Lição 12 — Recursion and frames ou ABI stack/heap demo em Mini-C.",
    connect: "Ligue antes da primeira chamada. Ative follow <code>$sp</code> e avance até existirem dois frames.",
    controls: "Overview/blocks/words/bytes/bits, follow, filtros, frame/word inspector, call graph, Step, Back, Run/Pause e comandos run-until.",
    interpretation: "Frames são inferidos por chamadas/retornos e movimento de <code>$sp</code>. O registo narrativo assinala saves/restores, alinhamento e acessos suspeitos.",
    protocol: "Observa instruções, registos e memória; também controla o runtime dentro das ações autorizadas.",
    limits: "Assembly arbitrário pode usar convenções não reconhecidas e produzir frames heurísticos. Valide sempre com PC, <code>$sp</code> e fonte."
  },
  {
    id: "system-clock",
    name: "System Clock and Timer",
    group: "Ecrãs e dispositivos",
    purpose: "Expor relógio/temporizador MMIO que conta instruções ou milissegundos e pode gerar uma interrupção periódica.",
    example: "A timer that interrupts the program (<code>timer_interrupt_demo.asm</code>)",
    connect: "Escolha modo simulado (ticks de instruções) para experiências determinísticas ou wall-clock para tempo real; configure período/enable/IRQ e ligue.",
    controls: "Mode, ticks, period, enable, IRQ, Connect, Reset e log de registos.",
    interpretation: "O contador avança segundo o modo; ao atingir o período, o bit de interrupção fica pendente e o handler deve reconhecê-lo.",
    protocol: "Bloco MMIO do temporizador e linha de interrupção MARS.",
    limits: "Wall-clock depende do scheduler e não é reproduzível por backstep. Para aulas e testes, prefira contagem de instruções."
  },
  {
    id: "tty-ansi-terminal",
    name: "TTY Device + ANSI Terminal",
    group: "Ecrãs e dispositivos",
    purpose: "Fornecer um terminal 80×25 com teclado, ANSI/DEC ou CP437, cores, cursor e eventos de rato xterm.",
    example: "ANSI colours on the terminal, TTY calculator ou MARS-OS.",
    connect: "Compile/monte o exemplo, abra/maximize a tool, ligue e só depois execute. Dê foco ao terminal para teclado/rato.",
    controls: "Modo de caracteres, tamanho, CRLF, local echo, configuração recolhível, Connect, Reset e Fit Window.",
    interpretation: "O programa escreve bytes/escapes; o parser atualiza células, atributos e cursor. Teclas e eventos são codificados na entrada do dispositivo.",
    protocol: "Receiver/transmitter MMIO com extensão de terminal ANSI e eventos SGR quando ativados pelo programa.",
    limits: "Não é um terminal do sistema operativo anfitrião. Sequências não suportadas são ignoradas/tratadas conforme o parser; o programa deve ativar modos de rato."
  }
];

function toolSection(tool) {
  return {
    id: tool.id,
    title: tool.name,
    content: html`
      <p>${tool.purpose}</p>
      ${screenshot(
        `./assets/screenshots/tool-${tool.id}-light.png`,
        `${tool.name} aberta no webMARS, em tema claro, sobre a área de trabalho do simulador`,
        `Interface real de ${tool.name} no tema claro, capturada no webMARS 0.6.0. A janela é apresentada isoladamente para manter controlos e resultados legíveis.`
      )}
      <div class="tool-spec">
        <div>
          <h3>Procedimento recomendado</h3>
          ${steps([
            `<strong>Abra o exemplo:</strong> ${tool.example}`,
            `<strong>Prepare e ligue:</strong> ${tool.connect}`,
            "Execute por passos primeiro; confirme que os contadores, canvas ou log reagem.",
            "Use Reset da ferramenta para uma medição limpa. Reiniciar o programa e Reset da ferramenta são operações distintas.",
            "Registe a configuração ao comparar dois programas ou duas execuções."
          ])}
        </div>
        <div>
          <h3>Controlos</h3>
          <p>${tool.controls}</p>
          <h3>Fonte de dados</h3>
          <p>${tool.protocol}</p>
        </div>
      </div>
      <h3>Como interpretar</h3>
      <p>${tool.interpretation}</p>
      ${callout("warning", "Limite", `<p>${tool.limits}</p>`)}
    `
  };
}

export const toolChapters = [
  {
    id: "ferramentas",
    number: "11",
    part: "Explorar",
    title: "Ferramentas",
    summary: "As vinte ferramentas incluídas: ligação, controlos, exemplos, protocolos, interpretação e limites.",
    intro: "Uma ferramenta é uma janela independente carregada a pedido. Abrir torna-a visível; Connect liga-a ao runtime. Cada ferramenta isola falhas e mantém história apenas até onde o histórico do motor permite.",
    level: "Intermédio a avançado",
    readingMinutes: 65,
    keywords: ["tools", "ferramentas", "cache", "bht", "bitmap", "tty", "stack", "mmio", "mars bot"],
    sources: ["tools/tools.json", "assets/js/app-modules/12-ui-tool-manager.js", "docs/tool-api.md", "tools/*.js"],
    sections: [
      {
        id: "ciclo-comum",
        title: "Ciclo comum: abrir, ligar, medir, repor",
        content: html`
          ${steps([
            "Monte o programa e identifique o exemplo/dispositivo que a ferramenta espera.",
            "Abra a ferramenta em <strong>Ferramentas</strong>. A primeira abertura carrega o módulo; aberturas seguintes recuperam a mesma instância.",
            "Configure endereços, tamanhos ou modelo antes de executar.",
            "Selecione <strong>Connect</strong>. Uma ferramenta aberta mas desligada não recebe a execução.",
            "Use Passo para validar os primeiros eventos; depois aumente a velocidade.",
            "Use <strong>Reset</strong> na ferramenta para limpar os seus contadores/canvas. Use <strong>Reiniciar</strong> no webMARS para repor a máquina.",
            "Desligue antes de reutilizar a mesma janela com um programa incompatível."
          ])}
          ${callout("note", "Backstep", "<p>Ferramentas ligadas recebem eventos de backstep e podem reverter ou reconstruir a vista. Não podem recuperar eventos anteriores ao histórico ainda conservado pelo runtime.</p>")}
        `
      },
      {
        id: "indice-ferramentas",
        title: "Índice por finalidade",
        content: html`
          ${["Arquitetura e desempenho", "Ecrãs e dispositivos", "Aprendizagem e utilitários"].map((group) => `<h3>${group}</h3><div class="tool-index">${TOOL_DATA.filter((tool) => tool.group === group).map((tool) => `<a href="#/ferramentas/${tool.id}">${tool.name}</a>`).join("")}</div>`).join("")}
          <p>O Pipeline Lab aparece aqui como ferramenta e recebe também um capítulo próprio devido à quantidade de conceitos, vistas e formatos de exportação.</p>
        `
      },
      {
        id: "mmio-seguranca",
        title: "Segurança e sobreposição MMIO",
        content: html`
          <p>Dispositivos usam endereços próximos de <code>0xffff0000</code> no mapa Default ou <code>0x00007f00</code> nos mapas compactos. Duas ferramentas que reivindicam offsets sobrepostos podem observar/interferir no mesmo programa.</p>
          <ul>
            <li>Ligue apenas os dispositivos exigidos pelo exemplo.</li>
            <li>Confirme a base depois de mudar o mapa de memória.</li>
            <li>Respeite bits ready/enable/interrupt e a ordem de commit dos protocolos.</li>
            <li>Não escreva “para experimentar” num registo desconhecido durante uma execução com handler.</li>
          </ul>
        `
      },
      ...TOOL_DATA.map(toolSection)
    ]
  },
  {
    id: "pipeline-lab",
    number: "12",
    part: "Explorar",
    title: "Pipeline Lab",
    summary: "Modelo de cinco estágios, replay real, hazards, predição, registos por ciclo, métricas, comparação e laboratórios.",
    intro: "O Pipeline Lab não altera o resultado arquitetural. Constrói uma explicação temporal determinística sobre a imagem montada ou sobre a sequência que o webMARS realmente executou.",
    level: "Intermédio a avançado",
    readingMinutes: 48,
    keywords: ["pipeline", "hazard", "forwarding", "stall", "flush", "bht", "cpi", "if id ex mem wb"],
    sources: ["tools/pipeline-lab.js", "docs/pipeline-lab.md", "docs/labs/labs.json", "tests/pipeline-lab-microarchitecture.test.mjs", "tests/pipeline-execution-trace.test.mjs"],
    sections: [
      {
        id: "dois-modelos",
        title: "Runtime funcional e modelo de ciclos",
        content: html`
          ${table(["Pergunta", "Runtime webMARS", "Pipeline Lab"], [
            ["Qual é o resultado?", "Autoridade arquitetural", "Consome/reproduz o resultado"],
            ["O que é um passo?", "Uma instrução básica", "Um ciclo pode mover várias instruções"],
            ["Há instruções em voo?", "Não expostas", "Sim, em IF/ID/EX/MEM/WB"],
            ["Hazards afetam o estado?", "Não são timing funcional", "Geram stalls/forwarding/flushes no modelo"],
            ["Métrica", "Instruções/tempo local", "Ciclos e CPI pedagógico"]
          ])}
          ${callout("warning", "Não compare Step com Next Cycle", "<p>Um Step compromete uma instrução funcional. Um Next Cycle avança todas as instruções em voo uma fase quando permitido.</p>")}
        `
      },
      {
        id: "modos",
        title: "Fluxo estático e replay da execução real",
        content: html`
          <p>No modo estático, o laboratório percorre a sequência montada segundo as regras e previsões configuradas. No replay, usa até 20 000 eventos observados: resultado real de branches, valores escritos e sequência efetivamente percorrida.</p>
          <p>Replay permite ligar os transportes ao webMARS: avançar o runtime alimenta o trace e a vista segue. Se o utilizador recuar/mudar o programa, a ferramenta ressincroniza dentro do contrato disponível.</p>
        `
      },
      {
        id: "cinco-estagios",
        title: "Os cinco estágios",
        content: html`
          ${table(["Estágio", "Responsabilidade pedagógica", "Informação visível"], [
            ["IF", "Escolher PC e buscar instrução", "PC, previsão e fluxo seguinte"],
            ["ID", "Descodificar e ler operandos", "rs/rt, dependências e controlo"],
            ["EX", "ALU, endereço e decisão de branch conforme configuração", "resultado, forwarding e comparação"],
            ["MEM", "Load/store e latência de memória", "endereço, espera e dado"],
            ["WB", "Comprometer resultado no banco de registos", "registo e valor escrito"]
          ])}
        `
      },
      {
        id: "configuracao",
        title: "Configurar a microarquitetura",
        content: html`
          <p>Os oito presets dão pontos de partida comparáveis. A configuração permite forwarding; delayed branch; resolução de branch em ID ou EX; previsão always not-taken, always taken ou BHT; BHT de 8/16/32 entradas e 1/2 bits; latência de memória 1–8; repetição de loop 1–64.</p>
          ${callout("tip", "Uma variável de cada vez", "<p>Ao comparar, duplique um preset e altere apenas forwarding, política de branch ou latência. Caso contrário, uma diferença de CPI não tem causa isolável.</p>")}
        `
      },
      {
        id: "data-hazards",
        title: "RAW, forwarding e load-use",
        content: html`
          <p>Um hazard RAW ocorre quando uma instrução precisa de um valor ainda não comprometido. Sem forwarding, espera até WB. Com forwarding, resultados de EX/MEM ou MEM/WB podem alimentar consumidores.</p>
          <p>Um load-use imediato continua a exigir stall no modelo clássico porque o dado só fica disponível depois de MEM. A vista de dependências mostra produtor, consumidor, registo e resolução.</p>
        `
      },
      {
        id: "structural",
        title: "Hazards estruturais e memória",
        content: html`
          <p>Latência de memória acima de um ciclo mantém operações no estágio e bloqueia recursos conforme o modelo. O laboratório distingue stalls de dados, estruturais, de controlo e de exceção nas métricas.</p>
          <p>Este parâmetro não importa a configuração do Data Cache Simulator; são experiências separadas. Uma representa latência abstrata do pipeline, outra classifica referências numa cache.</p>
        `
      },
      {
        id: "control",
        title: "Branches, delay slot e previsão",
        content: html`
          <p>A resolução em ID deteta o resultado mais cedo que EX, mas pode exigir operandos disponíveis. Uma previsão errada descarta trabalho mais jovem e cria flushes/bubbles. Com delay slot, a instrução imediatamente posterior tem regra própria e não é simplesmente “wrong path”.</p>
          <p>A BHT simplificada indexa o PC, mantém contador de 1 ou 2 bits e sofre aliasing. Não existe BTB/RAS ou história global.</p>
        `
      },
      {
        id: "traps",
        title: "Traps e instruções sem timing",
        content: html`
          <p>Traps/exceções são serializados para preservar uma narrativa pedagógica precisa; instruções mais novas são impedidas/descartadas conforme o ponto. O laboratório não executa um handler COP0 completo como segundo runtime.</p>
          <p>Quando uma instrução funcional não tem modelo de timing especializado, o Lab usa a classe/fallback documentado e assinala a limitação em vez de inventar uma unidade detalhada.</p>
        `
      },
      {
        id: "vistas",
        title: "Aprender, Registos e Arquitetura",
        content: html`
          <ul>
            <li><strong>Aprender</strong> apresenta timeline vertical, eventos, dependências e explicações.</li>
            <li><strong>Registos</strong> mostra valores comprometidos e valores ainda em voo por ciclo.</li>
            <li><strong>Arquitetura</strong> relaciona os estágios, sinais e caminhos da configuração.</li>
          </ul>
          <p>Prev/Next navega no histórico de ciclos; Run to Drain continua até o pipeline esvaziar. A vista visual limita aproximadamente 160 instruções/80 ciclos para legibilidade, sem mudar o relatório exportado conforme os limites documentados.</p>
        `
      },
      {
        id: "previsao-aluno",
        title: "Prever antes de avançar",
        content: html`
          <p>A função de previsão pede ao aluno que antecipe o próximo estado/evento antes de revelar o ciclo. Use-a para hazards, forwarding e branches: a explicação ganha valor quando confronta um modelo mental explícito.</p>
          ${steps([
            "Pause no ciclo imediatamente antes do evento.",
            "Registe a previsão: que instruções avançam, quem fica parado, que valor é encaminhado e qual PC será escolhido.",
            "Avance um ciclo.",
            "Compare cada divergência com dependência, disponibilidade do valor e regra de controlo.",
            "Repita após alterar uma única configuração."
          ])}
        `
      },
      {
        id: "metricas",
        title: "Métricas e CPI",
        content: html`
          ${table(["Métrica", "Interpretação"], [
            ["Cycles", "Ciclos simulados até ao ponto/Drain."],
            ["Completed", "Instruções comprometidas/concluídas pelo modelo."],
            ["CPI", "Cycles ÷ Completed; cuidado com pipeline ainda não drenado."],
            ["Stalls", "Ciclos de espera, discriminados por causa."],
            ["Bubbles", "Slots vazios introduzidos no fluxo."],
            ["Flushes", "Trabalho descartado após controlo/trap."],
            ["Branches", "Contagem e precisão da política quando aplicável."]
          ])}
        `
      },
      {
        id: "exportar",
        title: "Exportar JSON e CSV",
        content: html`
          <p>JSON conserva configuração, sequência, ciclos, eventos, métricas e writes de registos num esquema determinístico. CSV oferece tabelas adequadas a folhas de cálculo/análise. Exporte antes de mudar programa/configuração se quiser preservar a experiência.</p>
          <p>Inclua versão webMARS, preset, parâmetros, exemplo e input ao submeter um relatório. Dois ficheiros só são comparáveis quando essas condições coincidem.</p>
        `
      },
      {
        id: "laboratorios",
        title: "Os sete laboratórios guiados",
        content: html`
          ${table(["Laboratório", "Pergunta central"], [
            ["1 — Five stages", "Como uma instrução atravessa IF/ID/EX/MEM/WB?"],
            ["2 — Data hazards", "Por que o consumidor espera pelo produtor?"],
            ["3 — Forwarding/load-use", "Que dependências desaparecem e qual permanece?"],
            ["4 — Branches", "Que trabalho é descartado quando a decisão chega?"],
            ["5 — Static prediction", "Como taken/not-taken muda o custo?"],
            ["6 — CPI/scheduling", "Como reordenar sem mudar a semântica?"],
            ["7 — Memory latency", "Como uma MEM longa bloqueia o fluxo?"]
          ])}
          <p>O repositório inclui fichas, soluções e guia do docente. Use previsões antes da simulação e exporte evidência depois.</p>
        `
      },
      {
        id: "limites",
        title: "Limites do modelo",
        content: html`
          <ul>
            <li>Não modela caches/TLB, superscalar, out-of-order ou especulação moderna completa.</li>
            <li>FPU e unidades complexas não têm timing de um processador específico.</li>
            <li>A BHT é local e simplificada; IF tem latência fixa.</li>
            <li>Não simula o fluxo COP0/EPC/handler como um segundo executor completo.</li>
            <li>O runtime funcional continua a ser a autoridade sobre valores e efeitos.</li>
          </ul>
        `
      }
    ]
  }
];
