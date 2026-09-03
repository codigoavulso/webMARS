import {
  html,
  callout,
  codeBlock,
  steps,
  table,
  workflow,
  screenshot,
  MEMORY_MAP
} from "./shared.mjs";

const macroExample = `.macro print_int (%reg)
    move $a0, %reg
    li   $v0, 1
    syscall
.end_macro

.text
main:
    li $t0, 42
    print_int ($t0)`;

const exceptionExample = `.ktext 0x80000180
handler:
    mfc0  $k0, $13       # Cause
    mfc0  $k1, $14       # EPC
    addiu $k1, $k1, 4    # ignorar instrução que falhou
    mtc0  $k1, $14
    eret`;

const contractExample = `//@requires 0 <= n && n <= \\length(a);
//@ensures \\result >= 0;
int soma(int a[], int n) {
    int i = 0;
    int total = 0;
    //@loop_invariant 0 <= i && i <= n;
    while (i < n) {
        total += a[i];
        i++;
    }
    return total;
}`;

export const languageChapters = [
  {
    id: "assembler",
    number: "6",
    part: "Programar",
    title: "Montar programas Assembly",
    summary: "Do texto fonte à imagem executável: âmbito, diretivas, símbolos, macros, pseudoinstruções e modos de compatibilidade.",
    intro: "O assembler lê fontes, resolve inclusões e símbolos, expande macros e pseudoinstruções, constrói segmentos e produz uma imagem que o runtime pode reiniciar e executar.",
    level: "Iniciante a avançado",
    readingMinutes: 32,
    keywords: ["assembler", "assembly", "montar", "diretiva", "macro", "pseudoinstrução", "label", "include", "eqv"],
    sources: ["assets/js/app-modules/00-core.js", "assets/js/reference/instructions.generated.js", "assets/js/reference/pseudo-ops.generated.js", "help/pt/MacrosHelp.html"],
    sections: [
      {
        id: "pipeline-montagem",
        title: "O que acontece ao montar",
        content: html`
          ${workflow([
            { label: "1", title: "Ler fontes" },
            { label: "2", title: "Includes, eqv e macros" },
            { label: "3", title: "Símbolos e tamanhos" },
            { label: "4", title: "Codificar instruções" },
            { label: "5", title: "Criar segmentos" }
          ])}
          <p>A primeira passagem determina endereços e recolhe etiquetas. A segunda resolve operandos, expande instruções e escreve código/dados. A montagem só substitui a imagem executável quando a fase termina de forma válida; mensagens identificam avisos, erros, ficheiro e linha sempre que possível.</p>
          ${callout("note", "Fonte não é estado", "<p>Uma montagem nova repõe o ponto de partida da máquina quando for aplicada. Editar depois de montar não altera o programa em memória: volte a premir <kbd>F3</kbd>.</p>")}
        `
      },
      {
        id: "ambito",
        title: "Escolher o âmbito de montagem",
        content: html`
          <p>Por omissão, o ficheiro Assembly ativo é a raiz. Com <strong>Montar todos os ficheiros na diretoria</strong>, o assembler inclui fontes Assembly que pertencem à <em>mesma pasta da árvore</em> do ficheiro ativo — não percorre automaticamente toda a árvore.</p>
          <p><code>.include</code> resolve um ficheiro explicitamente e é preferível para dependências intencionais. Evite definir a mesma etiqueta em fontes montadas em conjunto.</p>
          ${table(["Opção", "Quando usar", "Risco"], [
            ["Ficheiro ativo", "Programa autocontido ou raiz com includes", "Dependências esquecidas causam símbolos indefinidos."],
            ["Todos na diretoria", "Conjunto pequeno de módulos Assembly irmãos", "Pode incluir testes/alternativas com símbolos duplicados."],
            ["Montar ao abrir", "Demonstrações rápidas de fontes válidas", "Um ficheiro parcialmente editado gera diagnóstico imediatamente."]
          ])}
        `
      },
      {
        id: "estrutura",
        title: "Estrutura mínima e segmentos",
        content: html`
          ${codeBlock(`.data
valor: .word 41

.text
.globl main
main:
    lw    $t0, valor
    addiu $t0, $t0, 1
    li    $v0, 10
    syscall`)}
          <ul>
            <li><code>.text</code> seleciona texto de utilizador; <code>.data</code> seleciona dados de utilizador.</li>
            <li><code>.ktext</code> e <code>.kdata</code> destinam-se ao handler/kernel no mapa configurado.</li>
            <li><code>.globl main</code> torna <code>main</code> global; com “Começar em main”, o PC inicial usa essa etiqueta.</li>
            <li>Uma etiqueta marca o endereço corrente; pode anteceder instrução ou dado na mesma linha ou numa linha própria.</li>
          </ul>
        `
      },
      {
        id: "diretivas",
        title: "Diretivas de dados e controlo",
        content: html`
          ${table(["Família", "Diretivas comuns", "Função"], [
            ["Segmentos", "<code>.text .data .ktext .kdata</code>", "Selecionam a região e podem aceitar endereço inicial."],
            ["Inteiros", "<code>.byte .half .word</code>", "Emitem valores com 1, 2 ou 4 bytes."],
            ["Ponto flutuante", "<code>.float .double</code>", "Emitem IEEE 754 simples/duplo."],
            ["Texto", "<code>.ascii .asciiz</code>", "Emitem bytes; <code>.asciiz</code> acrescenta zero."],
            ["Reserva", "<code>.space</code>", "Avança/reserva o número de bytes."],
            ["Alinhamento", "<code>.align</code>", "Alinha o endereço seguinte à potência suportada."],
            ["Símbolos", "<code>.globl .extern .eqv</code>", "Visibilidade, externos e substituição constante."],
            ["Composição", "<code>.include</code>", "Insere uma fonte disponível no projeto."]
          ])}
          <p>A referência incorporada lista as 20 diretivas com a descrição exata desta versão.</p>
        `
      },
      {
        id: "expressoes-simbolos",
        title: "Etiquetas, constantes e expressões",
        content: html`
          <p>Operandos podem usar etiquetas, literais decimais/hexadecimais e expressões simples suportadas. <code>.eqv TAMANHO 32</code> substitui tokens posteriores; não é uma variável e não ocupa memória.</p>
          <p>Endereços relativos de branch têm alcance limitado pela codificação. Pseudoinstruções de branch e load-address podem escolher expansões adequadas, mas o modo básico/estrito restringe formatos.</p>
          ${callout("warning", "Endereço depende do mapa", "<p>Uma constante absoluta que funciona no mapa Default pode apontar para outra região nos presets compactos. Prefira etiquetas e volte a montar depois de mudar o mapa.</p>")}
        `
      },
      {
        id: "macros",
        title: "Definir e invocar macros",
        content: html`
          ${codeBlock(macroExample)}
          <ul>
            <li>A definição deve aparecer antes da utilização e termina numa linha <code>.end_macro</code>.</li>
            <li>Nome e número de parâmetros identificam a macro; a mesma designação pode ter aridades diferentes.</li>
            <li>Parênteses nos parâmetros/argumentos são opcionais; a substituição opera sobre tokens, não dentro de strings.</li>
            <li>Etiquetas internas tornam-se únicas em cada expansão.</li>
            <li>Definições aninhadas não são permitidas; recursão inválida é diagnosticada.</li>
          </ul>
          ${callout("compat", "Extensão do assembler", "<p>Macros, <code>.eqv</code>, <code>.include</code> e várias pseudoinstruções exigem o assembler estendido. Desligá-lo é útil para exercícios de máquina básica.</p>")}
        `
      },
      {
        id: "pseudo",
        title: "Instruções básicas e pseudoinstruções",
        content: html`
          <p>Uma instrução básica corresponde diretamente a uma codificação de 32 bits. Uma pseudoinstrução é uma forma conveniente escolhida por padrão de operandos e expandida numa ou mais básicas.</p>
          ${table(["Fonte", "Expansão típica", "Consequência na depuração"], [
            ["<code>move $t0,$t1</code>", "<code>addu $t0,$t1,$zero</code>", "Um passo básico."],
            ["<code>li $t0,5</code>", "Imediato curto numa instrução", "Um passo."],
            ["<code>li $t0,0x12345678</code>", "Parte alta + parte baixa", "Dois passos associados à mesma linha."],
            ["<code>la $a0,rotulo</code>", "Construção do endereço", "Pode gerar múltiplas linhas no segmento de texto."],
            ["<code>mul $t0,$t1,$t2</code>", "Forma suportada/expandida conforme catálogo", "Consulte a coluna Basic."]
          ])}
          <p>A tabela <strong>Source</strong> conserva a associação à linha original; <strong>Basic</strong> mostra o que o motor executa.</p>
        `
      },
      {
        id: "delayed-branching",
        title: "Delayed branching",
        content: html`
          <p>Com a opção desligada, um branch tomado altera o próximo PC segundo o modelo funcional sem delay slot. Com a opção ligada, a instrução imediatamente seguinte executa antes da transferência e instruções de link guardam <code>PC + 8</code>.</p>
          ${codeBlock(`beq  $t0, $t1, igual
addiu $s0, $s0, 1   # delay slot quando a opção está ativa
...
igual:`)}
          <p>Uma exceção no slot ativa o bit BD em Cause e coloca no EPC o endereço do branch. Mudar a opção exige nova montagem para manter associações e expectativas coerentes.</p>
        `
      },
      {
        id: "compatibilidade",
        title: "Assembler estendido, modo estrito e código automodificável",
        content: html`
          ${table(["Opção", "Efeito", "Recomendação"], [
            ["Assembler estendido", "Permite pseudoinstruções e formatos convenientes.", "Ativo para aprendizagem; desligue em exercícios de codificação básica."],
            ["Compatibilidade estrita MARS 4.5", "Aplica verificações adicionais, incluindo acessos parciais em segmentos permitidos.", "Ative ao validar materiais destinados ao MARS Java."],
            ["Código automodificável", "Permite stores em memória executável.", "Mantenha desligado salvo num exercício explícito."],
            ["Avisos como erros", "Impede imagem executável quando existe aviso.", "Útil em avaliação e CI pedagógico."]
          ])}
        `
      },
      {
        id: "diagnosticos",
        title: "Diagnosticar falhas de montagem",
        content: html`
          ${steps([
            "Leia a primeira mensagem de erro e identifique ficheiro, linha e token.",
            "Confirme a extensão e o ficheiro ativo; Compilar e Montar não são equivalentes.",
            "Verifique diretivas de segmento, vírgulas, número de operandos e nomes de registos.",
            "Para símbolo indefinido, confirme grafia, visibilidade e âmbito de montagem/include.",
            "Para imediato fora do intervalo, use uma pseudoinstrução apropriada ou construa o valor explicitamente.",
            "Para endereço/alinhamento, reveja diretivas de dados, mapa de memória e operação de load/store.",
            "Monte novamente e confirme uma mensagem de sucesso; não execute a imagem antiga por engano."
          ])}
        `
      }
    ]
  },
  {
    id: "executar-depurar",
    number: "7",
    part: "Programar",
    title: "Executar e depurar",
    summary: "Estados, controlos, breakpoints, backstep, input, segmentos, registos, exceções e desempenho.",
    intro: "Um único motor MIPS alimenta todas as vistas e ferramentas. Controlar o runtime é controlar registos, memória, PC, dispositivos, E/S e histórico como um conjunto coerente.",
    level: "Iniciante a avançado",
    readingMinutes: 36,
    keywords: ["run", "executar", "depurar", "breakpoint", "backstep", "step", "reset", "registos", "memória", "exceção"],
    sources: ["assets/js/app-modules/00-core.js", "assets/js/app-modules/20-app-runtime.js", "tests/runtime-regression.test.mjs", "tests/runtime-interrupt-regression.test.mjs"],
    sections: [
      {
        id: "estados",
        title: "Estados do runtime",
        content: html`
          ${table(["Estado", "Significado", "Próxima ação típica"], [
            ["Não montado", "Não existe imagem executável válida.", "Montar."],
            ["Pronto/parado no início", "Imagem carregada no estado inicial.", "Executar ou Passo."],
            ["Em execução", "O scheduler está a processar instruções.", "Pausar ou Parar."],
            ["Pausado", "Máquina preservada e retomável.", "Executar, Passo ou Parar."],
            ["Breakpoint", "PC chegou a uma linha marcada.", "Inspecionar; Passo ou Executar atravessa-o uma vez."],
            ["Aguardar input", "Um syscall precisa de dados.", "Introduzir e enviar; <code>/eof</code> quando aplicável."],
            ["Terminado", "Exit, fim ou término normal.", "Reiniciar."],
            ["Parado", "Paragem explícita cancelou trabalho pendente.", "Reiniciar; não retoma."],
            ["Exceção", "Falha sem handler seguro ou runtime abortado.", "Corrigir/reiniciar ou implementar handler."]
          ])}
        `
      },
      {
        id: "controlos",
        title: "Executar, pausar, parar, passo e reiniciar",
        content: html`
          <ul>
            <li><strong>Executar (<kbd>F5</kbd>)</strong> continua até exit, breakpoint, input, exceção, limite, pausa ou paragem.</li>
            <li><strong>Pausar</strong> suspende o scheduler e preserva a continuação.</li>
            <li><strong>Parar</strong> termina e cancela trabalho assíncrono pendente, como Sleep; não pode continuar.</li>
            <li><strong>Passo (<kbd>F7</kbd>)</strong> executa uma instrução básica e atualiza as vistas.</li>
            <li><strong>Passo atrás (<kbd>F8</kbd>)</strong> aplica o delta inverso mais recente.</li>
            <li><strong>Reiniciar</strong> repõe a imagem montada no estado inicial, mantendo a fonte e configuração.</li>
          </ul>
          ${callout("warning", "Pausa não é Parar", "<p>Use Pausa para observar e retomar. Use Parar para abandonar a execução. Depois de Parar, apenas Reiniciar estabelece um estado executável coerente.</p>")}
        `
      },
      {
        id: "breakpoints",
        title: "Criar e atravessar breakpoints",
        content: html`
          ${steps([
            "Monte o programa e abra <strong>Principal → Executar</strong>.",
            "Na tabela <strong>Segmento de texto</strong>, marque a caixa <strong>BP</strong> junto a uma instrução básica.",
            "Prima <kbd>F5</kbd>. O motor para antes de executar a instrução cujo endereço corresponde ao breakpoint.",
            "Inspecione PC, registos, dados e ferramentas.",
            "Prima <kbd>F7</kbd> ou <kbd>F5</kbd> para atravessar esse breakpoint uma vez; o motor evita parar imediatamente no mesmo ponto sem progresso.",
            "Desmarque a caixa para remover a paragem."
          ])}
          ${callout("note", "Local correto", "<p>Na versão 0.6.1, breakpoints são caixas da tabela do segmento de texto. Não existe um gutter de breakpoints na margem do editor.</p>")}
          ${screenshot("./assets/screenshots/workspace-run-light.png", "Programa Mini-C executado no webMARS, com linha corrente, registos alterados e o separador Run I/O no tema claro", "Após a execução, os registos alterados ficam realçados; neste exemplo, $t1 contém 120, o resultado de fact(5).")}
        `
      },
      {
        id: "backstep",
        title: "Como funciona o passo atrás",
        content: html`
          <p>O runtime guarda <strong>deltas inversos</strong>, não cópias integrais da máquina a cada passo. Cada registo/memória/dispositivo alterado contribui com informação suficiente para desfazer a instrução.</p>
          <p>O âmbito inclui registos gerais e de coprocessadores, memória, PC, breakpoints, streams pseudoaleatórios, stdin, argumentos, VFS e cursores, handles de imagem e estado de dispositivos que participam no contrato. Ferramentas derivadas podem reconstruir a visualização a partir do runtime.</p>
          ${table(["Preferência", "Intervalo", "Efeito"], [
            ["Histórico máximo", "0–1 000 000", "Número máximo de deltas a conservar."],
            ["0", "Desativado", "Backstep fica indisponível e reduz memória."],
            ["Predefinição", "100", "Equilíbrio para depuração curta."],
            ["Valores elevados", "Dependem da carga", "Aumentam memória e custo; use apenas quando necessário."]
          ])}
          ${callout("warning", "Limite do histórico", "<p>Depois de o delta mais antigo ser descartado, não há forma de recuar além dele. Reiniciar volta ao início, mas perde a trajetória específica de input/aleatoriedade que não esteja novamente reproduzida.</p>")}
        `
      },
      {
        id: "input-output",
        title: "Input e output do programa",
        content: html`
          <p>Quando um syscall de leitura bloqueia, o estado muda para aguardar input. Introduza texto no campo do painel E/S e prima Enter/Enviar. O input é consumido conforme o serviço: inteiro, float, double, string, caractere ou linha.</p>
          <p>Com “Popup para syscalls de input”, os serviços 5, 6, 7, 8 e 12 usam formulários. O painel continua a ser a transcrição. O marcador <code>/eof</code> sinaliza fim de input nos fluxos que o reconhecem.</p>
          ${callout("tip", "Programa aparentemente bloqueado", "<p>Verifique primeiro o estado e o painel E/S. Se “aguarda input”, enviar mais vezes <kbd>F5</kbd> não resolve: forneça dados ou EOF.</p>")}
        `
      },
      {
        id: "argumentos",
        title: "Argumentos do programa",
        content: html`
          <p>Ative <strong>Argumentos fornecidos ao programa MIPS</strong>. Antes da execução, o webMARS interpreta a linha, coloca <code>argc</code> em <code>$a0</code>, o endereço do vetor <code>argv</code> em <code>$a1</code> e escreve strings terminadas em zero na memória.</p>
          <p>Em <code>C1-NATIVE</code>, <code>int main(int argc, char **argv)</code> recebe os mesmos dados. O webMARS não acrescenta automaticamente o nome do executável: <code>argv[0]</code> é o primeiro token que introduziu.</p>
        `
      },
      {
        id: "texto",
        title: "Inspecionar o segmento de texto",
        content: html`
          ${table(["Coluna", "Leitura"], [
            ["BP", "Breakpoint associado a esse endereço básico."],
            ["Address", "Endereço virtual da instrução."],
            ["Code", "Word de 32 bits codificada."],
            ["Basic", "Instrução básica efetivamente executada."],
            ["Source", "Linha fonte/pseudoinstrução que originou a codificação."]
          ])}
          <p>A linha atual acompanha o PC quando este aponta para texto conhecido. Etiquetas aparecem numa tabela adjacente se a preferência estiver ativa.</p>
        `
      },
      {
        id: "dados",
        title: "Navegar no segmento de dados",
        content: html`
          <p>A vista organiza words por endereço base de linha e offsets. O seletor navega entre regiões como <code>.data</code>, <code>.extern</code>, heap, endereço de <code>$gp</code>, endereço de <code>$sp</code>, texto, <code>.kdata</code> e MMIO, conforme o mapa.</p>
          <ul>
            <li><strong>Endereços hexadecimais</strong> e <strong>valores hexadecimais</strong> são preferências independentes.</li>
            <li>A coluna ASCII interpreta bytes imprimíveis; caracteres não imprimíveis usam o marcador configurado.</li>
            <li>Stores recentes podem ser realçadas; desative o realce em Interface para reduzir movimento.</li>
            <li>Editar a representação não muda endianness nem o conteúdo.</li>
          </ul>
        `
      },
      {
        id: "registos-cop",
        title: "Registos, COP1 e COP0",
        content: html`
          <p>Os 32 registos inteiros mantêm valores de 32 bits; <code>$zero</code> permanece zero. HI/LO recebem resultados de operações históricas de multiplicação/divisão; PC seleciona instruções.</p>
          <p>COP1 oferece 32 registos e interpretações simples/duplas, mais oito flags de condição. Valores <code>double</code> usam pares apropriados; operações inválidas ou registos ímpares onde é exigido par geram exceção reservada.</p>
          <p>COP0 expõe BadVAddr, Status, Cause e EPC, entre outros. São essenciais para handlers e interrupções.</p>
        `
      },
      {
        id: "excecoes",
        title: "Exceções e handlers",
        content: html`
          ${table(["ExcCode", "Nome", "Causas típicas"], [
            ["4", "Address error load/fetch", "Fetch/load desalinhado ou endereço inválido."],
            ["5", "Address error store", "Destino desalinhado/inválido."],
            ["8", "Syscall/runtime", "Serviço, input, heap ou biblioteca inválidos."],
            ["9", "Breakpoint", "Instrução MIPS <code>break</code>."],
            ["10", "Reserved instruction", "Codificação desconhecida/não suportada."],
            ["12", "Overflow", "Aritmética assinada verificada."],
            ["13", "Trap", "Condição de trap verdadeira."],
            ["15", "Divisão por zero", "Divisor zero nas operações aplicáveis."]
          ])}
          ${codeBlock(exceptionExample)}
          <p>O motor escreve Cause/EPC/BadVAddr, entra em nível de exceção e transfere para o handler configurado se existir código executável. <code>eret</code> restaura o fluxo. Um handler deve distinguir interrupção, exceção recuperável e falha que não pode ignorar com segurança.</p>
        `
      },
      {
        id: "interrupcoes",
        title: "Interrupções de dispositivos e temporizador",
        content: html`
          <p>Dispositivos MMIO podem colocar bits pendentes em Cause. Status controla máscaras e habilitação global. O System Clock and Timer pode contar instruções ou tempo real e emitir a interrupção de temporizador MARS.</p>
          <p>O handler deve reconhecer a fonte, confirmar/limpar o dispositivo quando o protocolo o exige, preservar registos e regressar. Uma interrupção não é polling: pode ocorrer entre instruções conforme o modelo implementado.</p>
        `
      },
      {
        id: "velocidade",
        title: "Execução máxima e medições",
        content: html`
          <p>Na velocidade máxima, o motor trabalha em lotes cooperativos para não bloquear permanentemente a interface. Pausa, Stop, input e ferramentas continuam a ter pontos de cooperação.</p>
          <p>Bench mede tempo de parede do browser; o Pipeline Lab mede ciclos do modelo pedagógico; Instruction Counter mede instruções observadas. Escolha a métrica que corresponde à pergunta.</p>
          ${callout("warning", "Três números diferentes", "<p>Tempo em milissegundos, contagem de instruções e ciclos/CPI do pipeline não são intercambiáveis. Uma otimização pode reduzir um e aumentar outro.</p>")}
        `
      }
    ]
  },
  {
    id: "minic",
    number: "8",
    part: "Programar",
    title: "Programar em Mini-C",
    summary: "Perfis C0 e C1-NATIVE, linguagem, bibliotecas, ABI, compilação, projetos e diagnósticos.",
    intro: "Mini-C é um compilador educativo integrado que traduz subconjuntos C definidos para Assembly MIPS32 segundo a convenção o32. Não é um compilador ISO C geral nem usa a libc do computador anfitrião.",
    level: "Intermédio",
    readingMinutes: 42,
    keywords: ["minic", "c0", "c1-native", "compiler", "compilar", "stdio", "ponteiros", "contratos", "bibliotecas"],
    sources: ["assets/js/app-modules/17-mini-c-compiler.js", "docs/mini-c-manual.txt", "docs/c0-reference.txt", "libs/manifest.json", "tests/c-compiler-regression.test.mjs"],
    sections: [
      {
        id: "o-que-e",
        title: "Mini-C, C0, C1-NATIVE e ISO C",
        content: html`
          <p>“Mini-C” designa o compilador e o universo pedagógico do webMARS. Os perfis <code>C0-S0</code> a <code>C0-S4</code> ativam uma progressão cumulativa. <code>C1-NATIVE</code> acrescenta representação nativa de bytes, strings, argumentos e ponteiros mais próximos do C.</p>
          ${callout("compat", "Não é ISO C", "<p>Aceitar uma construção não implica a semântica completa de um compilador C de produção. Não há pré-processador geral, libc do host, linker nativo ou comportamento indefinido deliberadamente explorável.</p>")}
        `
      },
      {
        id: "perfis",
        title: "Escolher um perfil",
        content: html`
          ${table(["Perfil", "Progressão principal", "Exemplo"], [
            ["<code>C0-S0</code>", "Expressões, controlo base, funções e modelos centrais de arrays/ponteiros/estruturas.", "ABI stack/heap."],
            ["<code>C0-S1</code>", "Resolução <code>#use</code> e bibliotecas.", "Bitmap ASCII/retângulos."],
            ["<code>C0-S2</code>", "<code>for</code>, <code>break</code>, <code>continue</code>, incrementos.", "Ciclos e projeto de estatística."],
            ["<code>C0-S3</code>", "Perfil pedagógico para arrays e multidimensionalidade.", "Matrizes."],
            ["<code>C0-S4</code>", "<code>bool</code>, <code>char</code>, <code>string</code>, curto-circuito e uso textual.", "stdio e parsing."],
            ["<code>C1-NATIVE</code>", "<code>char*</code> por bytes, strings nativas, argc/argv, função pointer e <code>void*</code>.", "Integração mais próxima de C."]
          ])}
          <p>As fronteiras são perfis do projeto, não uma reprodução exata de todas as camadas académicas C0/C1. Algumas construções historicamente associadas a S3 podem já ser aceites abaixo desse perfil.</p>
        `
      },
      {
        id: "configurar",
        title: "Configurar o compilador",
        content: html`
          <p>Abra <strong>Definições → Compilador Mini-C (C0)…</strong>. Selecione perfil, opções de saída e comentários/scaffolding. A preferência “Abrir janela de output depois de compilar” controla apenas a visibilidade dessa janela.</p>
          ${table(["Escolha", "Efeito"], [
            ["Perfil", "Define o conjunto permitido e as bibliotecas/representações esperadas."],
            ["Comentários de scaffolding", "Incluem pistas sobre funções, frames e mapeamento na saída Assembly."],
            ["Abrir output", "Mostra automaticamente a janela após <kbd>F4</kbd>."],
            ["Assembly como ficheiro", "É uma ação explícita na janela de output; não acontece só por compilar."]
          ])}
        `
      },
      {
        id: "compilar",
        title: "Compilar um projeto",
        content: html`
          ${steps([
            "Ative o ficheiro C/C0 que contém a raiz/entrada relevante.",
            "Confirme o perfil e as diretivas <code>#use</code>/<code>#include</code>.",
            "Prima <kbd>F4</kbd> e leia o Log antes da saída MIPS.",
            "Corrija o primeiro diagnóstico e repita até sucesso.",
            "Selecione <strong>Abrir ASM como novo ficheiro</strong> se quiser montar/executar.",
            "Ative o ficheiro Assembly criado, prima <kbd>F3</kbd> e <kbd>F5</kbd>."
          ])}
          ${callout("warning", "Âmbito multificheiro", "<p>A compilação parte do ficheiro C ativo e das dependências alcançadas por <code>#use</code>/<code>#include</code>. Não liga automaticamente todos os ficheiros <code>.c</code> que por acaso existem na árvore. Use cabeçalhos e inclusões do exemplo multificheiro.</p>")}
        `
      },
      {
        id: "janela-output",
        title: "Log e Assembly gerado",
        content: html`
          <p>A janela Mini-C separa log/diagnósticos e texto MIPS. Pode copiar, limpar e abrir a saída como novo ficheiro. Limpar a janela não elimina a fonte nem a imagem já montada.</p>
          <p>O Assembly gerado é fonte normal: pode estudá-lo e até editá-lo, mas uma nova compilação gera outra saída a partir do C. Trate alterações manuais como um ramo independente.</p>
        `
      },
      {
        id: "linguagem-base",
        title: "Tipos, expressões e controlo",
        content: html`
          ${codeBlock(`int absoluto(int x) {
    if (x < 0) return -x;
    return x;
}

int main(void) {
    int total = 0;
    for (int i = 0; i < 10; i++) {
        if (i == 3) continue;
        total += absoluto(i - 5);
    }
    return total;
}`, "Mini-C")}
          <p>As famílias incluem aritmética, comparação, bitwise, lógica de curto-circuito e ternário; declarações e atribuições; <code>if/else</code>, <code>while</code>, <code>for</code>, <code>break</code>, <code>continue</code>; funções e return. A disponibilidade exata depende do perfil.</p>
        `
      },
      {
        id: "arrays-ponteiros",
        title: "Arrays, ponteiros e alocação",
        content: html`
          ${codeBlock(`int* xs = alloc_array(int, 8);
xs[0] = 42;

struct point { int x; int y; };
typedef struct point* point_t;
point_t p = alloc(struct point);
p->x = xs[0];`, "Mini-C")}
          <p>Arrays locais podem ter inicializadores e múltiplas dimensões. <code>alloc</code>/<code>alloc_array</code> usam o heap MIPS e inserem verificações do modelo C0. <code>NULL</code> representa ausência; dereferências inválidas e índices fora dos metadados rastreados terminam com erro.</p>
          <p><code>.</code> acede a uma estrutura direta; <code>-></code> acede através de ponteiro. <code>typedef</code> permite nomear representações mais legíveis.</p>
        `
      },
      {
        id: "contratos",
        title: "Contratos, assert e error",
        content: html`
          ${codeBlock(contractExample, "Mini-C com contratos")}
          <p>O compilador reconhece <code>requires</code>, <code>ensures</code> e <code>loop_invariant</code> no modelo atual, além de <code>\\length</code> e <code>\\result</code>. <code>assert(e)</code> exige uma condição em execução; <code>error("mensagem")</code> termina imediatamente.</p>
          <p>Contratos são instrumentos pedagógicos e verificações geradas, não uma prova formal completa do programa.</p>
        `
      },
      {
        id: "native",
        title: "Char, strings, argc/argv e ponteiros para funções",
        content: html`
          <p>Em C0, tipos textuais podem usar representações educativas. C1-NATIVE introduz <code>char</code> endereçado por byte, <code>char*</code> terminado em zero, helpers de string, <code>void*</code> e typedefs de ponteiros para funções/chamadas indiretas.</p>
          ${codeBlock(`typedef int (*op_t)(int, int);

int soma(int a, int b) { return a + b; }

int main(int argc, char **argv) {
    op_t op = soma;
    if (argc < 2) return 1;
    return op(argc, argv[0][0]);
}`, "C1-NATIVE")}
          <p>Ative argumentos do programa antes de montar. O primeiro token introduzido é <code>argv[0]</code>.</p>
        `
      },
      {
        id: "abi",
        title: "ABI MIPS o32 gerada",
        content: html`
          <ul>
            <li>Os quatro primeiros argumentos usam <code>$a0</code>–<code>$a3</code>; adicionais transitam pela stack.</li>
            <li>Resultados usam <code>$v0</code> e, quando necessário, <code>$v1</code>.</li>
            <li>Registos <code>$s</code> são preservados pelo callee; temporários seguem o contrato gerado.</li>
            <li>Prólogos ajustam <code>$sp</code>, guardam <code>$ra</code>/<code>$fp</code> e estabelecem frame conforme a função.</li>
            <li>A stack respeita alinhamentos necessários aos valores gerados.</li>
          </ul>
          <p>Use o Stack Visualizer e o exemplo <strong>Stack, heap and calling convention</strong> para observar frames e argumentos além do quarto.</p>
        `
      },
      {
        id: "bibliotecas",
        title: "Bibliotecas incluídas",
        content: html`
          ${table(["Grupo", "Bibliotecas", "Uso"], [
            ["Consola", "<code>stdio</code>, <code>conio</code>", "Print, leitura e formatação."],
            ["Ficheiros/argumentos", "<code>file</code>, <code>args</code>", "VFS e linha de argumentos."],
            ["Strings", "<code>string</code>, <code>string_native</code>", "Representações C0 e nativa."],
            ["Conversão", "<code>parse</code>, <code>ctype</code>, <code>stdlib</code>", "Parsing, classes de caracteres, utilitários."],
            ["Tipos", "<code>stdbool</code>, <code>stddef</code>", "Constantes e tipos auxiliares."],
            ["Aleatoriedade/utilidade", "<code>rand</code>, <code>util</code>", "Streams aleatórios e helpers."],
            ["Imagem", "<code>img</code>, <code>bitmap_rect</code>, <code>bitmap_ascii</code>", "Framebuffer e configuração Bitmap."],
            ["Terminal", "<code>tty</code>", "TTY ANSI e eventos."]
          ])}
          <p><code>#use &lt;nome&gt;</code> resolve bibliotecas C0; <code>#include &lt;nome.h&gt;</code> resolve headers suportados. Aspas resolvem ficheiros do projeto.</p>
        `
      },
      {
        id: "servicos",
        title: "Serviços 60–103",
        content: html`
          <p>As bibliotecas usam syscalls adicionais para flush/EOF/readline/printf, strings, parsing, imagens, utilitários e integração. Prefira a API dos headers: ela aplica tipos, buffers e protocolo de registos corretamente.</p>
          ${callout("compat", "Extensão webMARS", "<p>Os serviços 60–103 não são syscalls padrão do MARS 4.5. Um programa que os invoca diretamente só é portátil quando fornece uma camada equivalente no destino.</p>")}
        `
      },
      {
        id: "diagnosticos",
        title: "Diagnósticos e incompatibilidade de perfil",
        content: html`
          <p>Um erro inclui código/fase, ficheiro, linha e descrição quando conhecidos. Se a fonte exige um perfil superior, o compilador procura emitir um único <code>MC_SUBSET_MISMATCH</code> para evitar uma cascata de erros secundários.</p>
          ${steps([
            "Confirme que o ficheiro ativo é a raiz pretendida.",
            "Leia o primeiro diagnóstico e a versão do perfil selecionado.",
            "Verifique <code>#use</code>/<code>#include</code>, caminhos e nomes de headers.",
            "Corrija tipos antes de erros de geração; chamadas e returns devem concordar.",
            "Para falta de temporários, simplifique expressão ou função e relate um caso mínimo se for válido.",
            "Volte a compilar e só então abra/montar o Assembly novo."
          ])}
        `
      },
      {
        id: "limites",
        title: "Limites conhecidos",
        content: html`
          <ul>
            <li>Não existe a totalidade da sintaxe, semântica, pré-processador ou biblioteca ISO C.</li>
            <li>Os perfis são limites do webMARS e podem não coincidir com materiais C0 externos.</li>
            <li>O VFS não é o sistema de ficheiros do host.</li>
            <li>Representações C0 e C1-NATIVE não devem ser misturadas sem uma API explícita.</li>
            <li>Temporização, MIDI e dispositivos continuam a ser os do runtime no browser.</li>
            <li>O manual detalhado antigo do Mini-C pode mencionar uma revisão anterior; esta página foi auditada contra 0.6.1.</li>
          </ul>
        `
      }
    ]
  },
  {
    id: "modelo-mips",
    number: "9",
    part: "Referência",
    title: "Modelo MIPS do webMARS",
    summary: "Registos, representação, memória, ABI, pilha, heap, COP0, COP1, exceções e LL/SC.",
    intro: "O runtime implementa um modelo funcional MIPS32 little-endian orientado ao ensino. Esta página fornece o vocabulário necessário para interpretar as restantes vistas e ferramentas.",
    level: "Intermédio",
    readingMinutes: 34,
    keywords: ["mips32", "registos", "endianness", "stack", "heap", "cop0", "cop1", "ll sc", "abi"],
    sources: ["assets/js/app-modules/00-core.js", "docs/comparison-matrix.md", "tests/runtime-memory-invariants.test.mjs", "tests/differential-mars.test.mjs"],
    sections: [
      {
        id: "registos",
        title: "Os 32 registos inteiros",
        content: html`
          ${table(["Grupo", "Nomes", "Convenção"], [
            ["Constante/assembler", "<code>$zero</code>, <code>$at</code>", "$zero lê 0; $at pode ser usado por expansões."],
            ["Resultados", "<code>$v0–$v1</code>", "Valores de retorno e número de syscall em $v0."],
            ["Argumentos", "<code>$a0–$a3</code>", "Primeiros quatro argumentos."],
            ["Temporários", "<code>$t0–$t9</code>", "Caller-saved pela convenção."],
            ["Preservados", "<code>$s0–$s7</code>", "Callee-saved."],
            ["Kernel", "<code>$k0–$k1</code>", "Reservados para handler/kernel."],
            ["Globais/stack/frame", "<code>$gp</code>, <code>$sp</code>, <code>$fp</code>", "Bases de dados, stack e frame."],
            ["Retorno", "<code>$ra</code>", "Endereço de retorno de chamadas."]
          ])}
          <p>PC, HI e LO não pertencem aos 32 registos gerais, mas aparecem nas vistas do estado.</p>
        `
      },
      {
        id: "bits",
        title: "Bits, sinal e complemento para dois",
        content: html`
          <p>Um registo contém 32 bits. “Com sinal” e “sem sinal” são interpretações da operação, não etiquetas persistentes. O mesmo padrão <code>0xffffffff</code> representa 4 294 967 295 sem sinal ou −1 em complemento para dois.</p>
          <p>Operações <code>add</code>/<code>addi</code> detetam overflow assinado; <code>addu</code>/<code>addiu</code> não geram essa exceção, apesar do “u” não alterar a soma binária. Comparações e extensões dependem da variante.</p>
        `
      },
      {
        id: "endianness",
        title: "Little-endian e alinhamento",
        content: html`
          <p>O byte menos significativo de uma word fica no menor endereço. A word <code>0x12345678</code> ocupa bytes <code>78 56 34 12</code> em endereços crescentes.</p>
          <p>Words exigem alinhamento múltiplo de 4 e halfwords múltiplo de 2 nas operações alinhadas. Fetch deve estar alinhado a word. Loads/stores desalinhados geram as exceções de endereço apropriadas, salvo instruções parciais explicitamente destinadas a compor valores.</p>
        `
      },
      {
        id: "mapa",
        title: "Mapa de memória Default",
        content: table(["Região", "Base predefinida", "Papel"], MEMORY_MAP)
      },
      {
        id: "presets",
        title: "Presets compactos",
        content: html`
          ${table(["Preset", "Texto", "Dados", "Stack", "MMIO"], [
            ["Default", "<code>0x00400000</code>", "<code>0x10010000</code>", "<code>0x7fffeffc</code>", "<code>0xffff0000</code>"],
            ["Compact Data at 0", "<code>0x00003000</code>", "<code>0x00000000</code>", "<code>0x00002ffc</code>", "<code>0x00007f00</code>"],
            ["Compact Text at 0", "<code>0x00000000</code>", "<code>0x00002000</code>", "<code>0x00003ffc</code>", "<code>0x00007f00</code>"]
          ])}
          ${callout("warning", "Volte a montar", "<p>O mapa afeta endereços de símbolos, stack, heap, kernel e dispositivos. Alterá-lo invalida pressupostos da imagem corrente.</p>")}
        `
      },
      {
        id: "stack-heap",
        title: "Stack, frames e heap",
        content: html`
          <p>A stack inicia perto do topo de utilizador e cresce para endereços menores. Um frame reserva espaço para registos guardados, locais e argumentos adicionais. A convenção o32 define responsabilidades caller/callee; Assembly manual deve respeitá-las ao chamar código gerado ou bibliotecas.</p>
          <p>O heap começa em <code>0x10040000</code> no mapa Default e cresce para endereços maiores. <code>sbrk</code> valida a reserva inteira antes de mover o break; não deixa uma alocação parcial quando o limite falha.</p>
        `
      },
      {
        id: "cop1",
        title: "COP1 e IEEE 754",
        content: html`
          <p>COP1 possui 32 registos de 32 bits. Valores simples ocupam um; doubles ocupam pares segundo as restrições implementadas. Instruções aritméticas, conversões, comparações e branches FP atualizam registos e flags.</p>
          <p>NaN, infinito, zeros assinados e arredondamento seguem o modelo disponível/FCSR. A ferramenta Floating Point Representation ajuda a decompor sinal, expoente e fração de uma word simples.</p>
        `
      },
      {
        id: "cop0",
        title: "COP0, exceções e interrupções",
        content: html`
          ${table(["Registo", "Número", "Papel"], [
            ["BadVAddr", "8", "Endereço que causou uma falha."],
            ["Status", "12", "Nível de exceção e habilitação/máscara de interrupções."],
            ["Cause", "13", "ExcCode, interrupções pendentes e bit BD."],
            ["EPC", "14", "Endereço de regresso/branch associado."]
          ])}
          <p><code>mfc0</code>/<code>mtc0</code> transferem valores; <code>eret</code> regressa do nível de exceção. Um handler deve preservar o contexto que modifica.</p>
        `
      },
      {
        id: "ll-sc",
        title: "LL/SC e reserva",
        content: html`
          <p><code>ll</code> carrega uma word e estabelece uma reserva. <code>sc</code> só escreve se essa reserva permanecer válida e devolve sucesso/falha no registo fonte. Uma store em conflito invalida a reserva.</p>
          ${codeBlock(`tentar:
    ll    $t0, 0($a0)
    addiu $t1, $t0, 1
    move  $t2, $t1
    sc    $t2, 0($a0)
    beqz  $t2, tentar`)}
          <p>O modelo serve para estudar atualização atómica; o runtime no browser não cria por si só múltiplos cores concorrentes.</p>
        `
      },
      {
        id: "funcional-pipeline",
        title: "Runtime funcional versus pipeline",
        content: html`
          <p>O motor funcional aplica uma instrução de cada vez e produz o estado arquitetural. O Pipeline Lab acrescenta um modelo temporal com IF/ID/EX/MEM/WB, hazards e CPI. Registos “em voo” do pipeline não substituem os registos comprometidos do runtime.</p>
          ${callout("note", "Regra de leitura", "<p>Use o runtime para responder “qual é o resultado arquitetural?”. Use o Pipeline Lab para responder “em que ciclo e por que houve stall/forwarding/flush?”.</p>")}
        `
      }
    ]
  },
  {
    id: "referencia-mips",
    number: "10",
    part: "Referência",
    title: "Referência MIPS pesquisável",
    summary: "Instruções básicas, pseudoinstruções, diretivas e syscalls incorporados nesta edição.",
    intro: "A referência é gerada a partir dos catálogos da release documentada e incluída na distribuição do manual. Filtre por opcode, exemplo, descrição, número de serviço ou capacidade.",
    level: "Referência",
    readingMinutes: 5,
    keywords: ["referência", "opcode", "instrução", "pseudo", "diretiva", "syscall", "operandos"],
    sources: ["help/pt/help-reference.json", "assets/js/reference/syscalls.generated.js", "help/pt/SyscallHelp.html"],
    reference: true,
    sections: [
      {
        id: "como-ler",
        title: "Como ler os exemplos",
        content: html`
          ${table(["Símbolo", "Significado"], [
            ["<code>$t1, $t2, $t3</code>", "Registos inteiros; o nome indica apenas um exemplo de classe."],
            ["<code>$f0, $f1</code>", "Registos COP1; doubles podem exigir par/even."],
            ["<code>label</code>", "Símbolo resolvido para endereço/alvo."],
            ["<code>-100</code>", "Imediato assinado no intervalo do formato."],
            ["<code>100($t2)</code>", "Deslocamento somado ao registo base."],
            ["<code>label+offset($t2)</code>", "Combinação resolvida pelo formato/pseudoinstrução suportado."]
          ])}
          <p>Uma descrição diz o efeito arquitetural, não o número de ciclos. Para timing, abra a instrução num programa no Pipeline Lab.</p>
        `
      },
      {
        id: "catalogo",
        title: "Catálogo",
        content: html`
          <div id="reference-app" aria-live="polite">
            <p>A carregar a cópia versionada da referência…</p>
          </div>
          <noscript><p>Ative JavaScript para filtrar a referência. Os restantes capítulos continuam legíveis.</p></noscript>
        `
      },
      {
        id: "syscalls",
        title: "Convenção de syscalls",
        content: html`
          <p>Coloque o número do serviço em <code>$v0</code>, argumentos nos registos indicados e execute <code>syscall</code>. Resultados usam os registos documentados; os restantes são preservados salvo indicação explícita.</p>
          ${codeBlock(`li   $a0, 123
li   $v0, 1      # PrintInt
syscall

li   $v0, 10     # Exit
syscall`)}
          <p>Serviços de ficheiros operam sobre o VFS. Tempo, Sleep e MIDI dependem do scheduler/áudio do browser. Streams pseudoaleatórios são identificados por ID e fazem parte do histórico reversível.</p>
        `
      },
      {
        id: "portabilidade",
        title: "Portabilidade da referência",
        content: html`
          <p>Entradas “básicas” e “pseudo” refletem a implementação webMARS 0.6.1 e a sua linhagem MARS 4.5. Extensões de protocolo, Mini-C e serviços 60–103 podem não existir noutro simulador.</p>
          ${callout("compat", "Confirme no destino", "<p>Para material que precisa de correr no MARS Java, ative o modo estrito, evite extensões identificadas e execute testes diferenciais com as mesmas entradas.</p>")}
        `
      }
    ]
  }
];
