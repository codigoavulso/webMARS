import { html, table, callout } from "./shared.mjs";

export const architectureReference = {
  "modelo-mips": [
    {
      id: "arquitetura-e-convencoes",
      title: "Arquitetura, microarquitetura e ambiente de execução",
      content: html`
        <p>Uma <strong>arquitetura do conjunto de instruções</strong> (ISA, <em>instruction set architecture</em>) define operações e estado observáveis por um programa. Uma <strong>microarquitetura</strong> realiza esse contrato: organização do caminho de dados, estágios, unidades funcionais e hierarquia de memória. Duas CPUs podem executar o mesmo código e ter desempenhos diferentes.</p>
        ${table(["Camada", "O que define", "No webMARS"], [
          ["ISA", "Registos, codificações e efeitos das instruções.", "Conjunto implementado no motor e descrito no catálogo incorporado."],
          ["ABI e convenção de chamada", "Argumentos, resultados e registos a preservar entre funções.", "Convenções usadas pelos exemplos e pelo código gerado por Mini-C."],
          ["Assembler", "Sintaxe, diretivas, símbolos e expansões.", "Linguagem de montagem da linhagem MARS e extensões documentadas."],
          ["Ambiente de execução", "Serviços, mapa de memória e dispositivos.", "Syscalls MARS/webMARS, memória simulada e dispositivos das ferramentas."],
          ["Microarquitetura", "Quando e com que recursos as operações decorrem.", "Pipeline Lab e simuladores de cache/predição, com configurações próprias."]
        ])}
        <p>Por exemplo, <code>$zero</code> ler sempre zero é uma propriedade arquitetural; usar <code>$a0</code> para o primeiro argumento é uma convenção; imprimir um inteiro com o serviço 1 é uma função do ambiente MARS. A CPU não reconhece nomes de variáveis, ficheiros fonte ou a intenção de uma chamada de função.</p>
        ${callout("compat", "Âmbito MIPS32", "<p>MIPS32 designa uma família com revisões e extensões. Uma instrução existente numa revisão não está automaticamente disponível noutra. O webMARS segue o ambiente educativo MARS 4.5; o seu catálogo não é uma declaração de implementação integral de uma release da ISA, de microMIPS ou de uma CPU comercial.</p>")}
      `
    },
    {
      id: "representacao-numerica",
      title: "Representação inteira, extensão e deslocamentos",
      content: html`
        <p>Para um padrão de <em>n</em> bits, a interpretação sem sinal vai de 0 a 2<sup>n</sup>−1. Em complemento para dois, vai de −2<sup>n−1</sup> a 2<sup>n−1</sup>−1. Nos registos de 32 bits, os intervalos são 0…4 294 967 295 e −2 147 483 648…2 147 483 647. Mudar a apresentação hexadecimal/decimal não altera os bits.</p>
        <p>A extensão de sinal replica o bit mais significativo; a extensão por zeros acrescenta zeros à esquerda. Um byte <code>0x80</code> carregado por <code>lb</code> produz <code>0xffffff80</code> (−128); por <code>lbu</code>, produz <code>0x00000080</code> (128).</p>
        ${table(["Operação", "Regra", "Consequência"], [
          ["add, addi, sub", "Verificam transbordo (overflow) com sinal.", "O resultado matemático fora do intervalo provoca exceção."],
          ["addu, addiu, subu", "Conservam os 32 bits inferiores sem exceção de overflow.", "A soma é modular; o sufixo u não transforma todos os operandos em imediatos sem sinal."],
          ["addi, addiu, slti, sltiu", "O campo imediato de 16 bits sofre extensão de sinal.", "sltiu compara depois os padrões como valores sem sinal."],
          ["andi, ori, xori", "O imediato sofre extensão por zeros.", "Uma máscara 0xffff cobre os 16 bits inferiores."],
          ["srl / sra", "Deslocamento à direita lógico / aritmético.", "srl introduz zeros; sra replica o sinal."],
          ["slt / sltu", "Comparação com sinal / sem sinal.", "0xffffffff é menor que 1 com sinal e maior sem sinal."]
        ])}
        <p>Não há um bit de transporte genérico a consultar depois de cada soma. Por exemplo, para somar valores sem sinal, pode obter o resultado com <code>addu</code> e detetar o transporte comparando-o com um dos operandos por <code>sltu</code>. Um deslocamento aritmético de −3 por um bit produz −2; não deve ser confundido com divisão inteira truncada para zero, cujo quociente é −1.</p>
        <p>No webMARS, estas operações atuam sobre padrões de 32 bits. O tamanho do número usado internamente pelo browser não aumenta a largura dos registos simulados.</p>
      `
    },
    {
      id: "codificacao-instrucoes",
      title: "Formatos R, I e J e leitura do código máquina",
      content: html`
        <p>No conjunto clássico aqui usado, cada instrução básica ocupa uma palavra de 32 bits, ou quatro bytes. Os nomes R, I e J descrevem formatos de codificação; não são classificações de custo temporal. Nem todas as instruções usam todos os campos com a mesma função.</p>
        ${table(["Formato", "Campos, do bit 31 para o bit 0", "Larguras"], [
          ["R", "opcode · rs · rt · rd · shamt · funct", "6 · 5 · 5 · 5 · 5 · 6"],
          ["I", "opcode · rs · rt · imediato", "6 · 5 · 5 · 16"],
          ["J", "opcode · índice do destino", "6 · 26"]
        ])}
        <p><code>add $t2, $t0, $t1</code> tem opcode 0, rs=8, rt=9, rd=10, shamt=0 e funct=<code>0x20</code>; a palavra é <code>0x01095020</code>. Em memória little-endian, os bytes são <code>20 50 09 01</code>. A ordem dos campos na palavra e a ordem dos bytes na memória são questões diferentes.</p>
        <p>No segmento de texto do webMARS, compare <strong>Código</strong>, <strong>Básico</strong> e <strong>Fonte</strong>. Uma pseudoinstrução pode originar várias linhas básicas. Contar linhas de fonte não determina nem o tamanho binário nem o número de instruções executadas.</p>
      `
    },
    {
      id: "enderecamento-e-controlo",
      title: "Endereçamento, saltos e endereço de retorno",
      content: html`
        <p>Os endereços identificam bytes. Para <code>lw $t0, 12($s0)</code>, o endereço efetivo é o conteúdo de <code>$s0</code> somado ao deslocamento de 16 bits com extensão de sinal; não é o conteúdo da memória em <code>$s0</code> somado a 12. O deslocamento está em bytes. Num vetor de palavras, o elemento de índice <em>i</em> fica a <code>base + 4*i</code>.</p>
        <p>Nos desvios condicionais clássicos como <code>beq</code>, o destino codificado é <code>(PC + 4) + (sign_extend(imm16) &lt;&lt; 2)</code>. O deslocamento é contado em palavras a partir da instrução seguinte. De <code>0x00400020</code> para <code>0x00400010</code>, o imediato é −5, codificado como <code>0xfffb</code>.</p>
        <p>Nos saltos clássicos <code>j</code>/<code>jal</code>, o destino combina os quatro bits superiores de <code>PC+4</code>, o índice de 26 bits e dois zeros inferiores. Não é um endereço arbitrário de 32 bits. <code>jr</code>/<code>jalr</code> usam um endereço num registo.</p>
        ${callout("compat", "Opção de desvios retardados", "<p>No webMARS, confirme <strong>Delayed branching</strong> antes de interpretar a execução. Com a opção ativa, a instrução no delay slot é executada antes da transferência e o link de uma chamada aponta para PC+8; sem ela, a transferência é imediata e o link aponta para PC+4. Esta opção pedagógica não seleciona uma release completa da ISA. Um nop explícito depois de um salto é útil para comparar ambos os modos, mas não resolve todos os casos de portabilidade.</p>")}
      `
    },
    {
      id: "memoria-e-sistema",
      title: "Espaço de endereços, memória disponível e dispositivos",
      content: html`
        <p>Um endereço de 32 bits permite distinguir 2<sup>32</sup> posições de byte: um espaço de 4 GiB. Isso não significa que existam 4 GiB de RAM disponível, nem que todos os endereços sejam válidos. Num sistema físico, tradução de endereços, proteção, memória instalada e periféricos dependem da implementação e do sistema operativo.</p>
        <p>O webMARS usa mapas educativos e memória esparsa, sujeita às regiões válidas e ao teto configurado. Os nomes texto, dados, pilha e heap identificam a organização do ambiente; as suas bases predefinidas não são constantes universais de MIPS32. O modelo não oferece uma MMU/TLB completa nem um sistema operativo com processos isolados.</p>
        <p><strong>E/S mapeada em memória</strong> (MMIO) permite controlar um dispositivo através de endereços de registos. Uma leitura pode consumir entrada ou alterar um estado; uma escrita pode produzir saída. Por isso, um registo de dispositivo não deve ser tratado como RAM comum. Consulte o protocolo, o endereço base do mapa ativo e a ligação da ferramenta ao MIPS.</p>
        <p><strong>Consulta ativa</strong> (<em>polling</em>) verifica repetidamente o estado; uma <strong>interrupção</strong> sinaliza um pedido ao processador quando as condições de habilitação o permitem. No webMARS, a integração dos dispositivos e das interrupções é simulada. O temporizador e o áudio não constituem garantias de tempo real do computador anfitrião.</p>
      `
    },
    {
      id: "chamadas-e-pilha",
      title: "Responsabilidades numa chamada e duração dos dados",
      content: html`
        <p><code>jal</code> guarda um endereço de retorno, mas não cria automaticamente um frame, não empilha argumentos e não preserva registos. O código da função reserva e liberta a sua área de pilha. Uma função folha não chama outras; uma função não folha deve proteger o endereço de retorno se o vai substituir com outra chamada.</p>
        <p>Na convenção usada pelos exemplos, o chamador preserva temporários de que ainda precisa e o chamado repõe os registos preservados que modifica. Cada chamada recursiva precisa de espaço próprio para valores que sobrevivem à chamada seguinte. Guardar um único retorno numa variável global não substitui uma pilha de chamadas.</p>
        <p>Um ponteiro para uma variável local deixa de designar um objeto válido quando termina a sua duração, mesmo que os bytes ainda se vejam na memória. O heap tem outra disciplina de reserva e libertação; <code>sbrk</code> aumenta a área reservada, mas não é por si só um gestor geral equivalente a <code>malloc</code>/<code>free</code>.</p>
        ${callout("compat", "Convenção educativa e ABI externa", "<p>Os nomes dos registos e o uso de quatro argumentos em registos não bastam para garantir compatibilidade binária o32. Alinhamento da pilha, área de argumentos, tipos, estruturas e ligação de objetos também contam. Os exemplos curtos e o mapa inicial do simulador não substituem a especificação de uma ABI. Ao chamar código Mini-C, siga o Assembly efetivamente gerado e as bibliotecas do mesmo perfil.</p>")}
      `
    },
    {
      id: "ponto-flutuante-representacao",
      title: "Vírgula flutuante: representação e interpretação",
      content: html`
        <p>Em precisão simples, um padrão de 32 bits contém sinal (1 bit), expoente (8) e fração (23). Para números normais, o significando inclui um 1 implícito; valores subnormais e expoentes reservados têm interpretação própria. Precisão dupla usa 64 bits, repartidos em 1, 11 e 52 bits. Mais bits aumentam a precisão e o alcance, sem tornar exatas todas as frações decimais.</p>
        <p>Precisão é a quantidade de informação significativa; alcance é o intervalo de magnitudes. O arredondamento introduz erro de representação. A ordem das operações pode alterar o resultado: a adição de vírgula flutuante não tem, em geral, a associatividade da adição de números reais.</p>
        <p><code>mtc1</code> copia bits de um registo inteiro para COP1; não converte o número inteiro para vírgula flutuante. As instruções <code>cvt.*</code> fazem conversões numéricas. Assim, copiar os bits do inteiro 1 não produz automaticamente o padrão de <code>1.0</code>.</p>
        <p>No webMARS, consulte os formatos e restrições de pares no catálogo COP1 e examine os bits na ferramenta Floating Point Representation. A existência de FCSR e de operações FP não implica certificação de todos os modos, exceções e pormenores de uma FPU física.</p>
      `
    },
    {
      id: "multiplicacao-divisao",
      title: "Multiplicação, divisão e casos-limite",
      content: html`
        <p>Nas formas clássicas com dois operandos, <code>mult</code>/<code>multu</code> produzem 64 bits: HI recebe a metade superior e LO a inferior. <code>mfhi</code>/<code>mflo</code> copiam essas metades para registos gerais. Os sufixos distinguem a interpretação com sinal e sem sinal dos operandos.</p>
        <p><code>div</code>/<code>divu</code> com dois operandos colocam o quociente em LO e o resto em HI. Na divisão com sinal válida, o quociente é truncado para zero: −7 / 3 produz quociente −2 e resto −1, satisfazendo dividendo = divisor × quociente + resto.</p>
        <p>No webMARS, a forma básica com divisor zero conserva HI/LO. Formas estendidas podem acrescentar verificações: examine a expansão. Não deduza uma exceção automática da existência de uma constante interna de divisão por zero. O resultado observado num caso inválido não estabelece uma regra portátil para processadores físicos; valide o divisor e os limites antes da operação.</p>
      `
    },
    {
      id: "referencias-arquiteturais",
      title: "Leituras de referência e âmbito de aplicação",
      content: html`
        <p>Para definições arquiteturais, consulte <a href="https://riteme.site/nscscc/doc/mips/Volume%20I%3A%20Introduction%20to%20MIPS32%20Architecture.pdf" target="_blank" rel="noopener noreferrer">MIPS Technologies, <em>MIPS32 Architecture for Programmers, Volume I-A</em>, revisão 3.02 (2011), cópia de consulta</a>. Identifique sempre a revisão da documentação: não combine regras de revisões diferentes sem verificar a instrução em causa.</p>
        <p>Para os serviços do ambiente educativo, consulte a <a href="https://dpetersanderson.github.io/Help/SyscallHelp.html" target="_blank" rel="noopener noreferrer">referência de syscalls do MARS 4.5</a>. Para executar no webMARS, prevalecem o catálogo incorporado, os perfis, os protocolos e as opções descritos neste manual. Uma instrução arquitetural, um serviço MARS e uma extensão webMARS têm âmbitos distintos.</p>
      `
    }
  ],
  "referencia-mips": [
    {
      id: "leitura-critica",
      title: "Interpretar uma entrada de referência",
      content: html`
        <p>Comece pelo formato e pela classe de operandos. Identifique quais são lidos, escritos e preservados; verifique o intervalo do imediato, o alinhamento, o tratamento de sinal e as condições de exceção. Depois examine a interação com o fluxo de controlo e os efeitos em memória ou dispositivos.</p>
        <p>O assembler pode aceitar uma forma estendida que não cabe numa única codificação. Uma etiqueta como operando de memória ou uma constante de 32 bits pode exigir expansão e registos auxiliares. Confirme a sequência em <strong>Executar → Segmento de texto</strong>, sobretudo se usa <code>$at</code>, breakpoints ou contagem de instruções.</p>
        <p><code>syscall</code> é uma instrução da arquitetura; selecionar PrintInt por <code>$v0 = 1</code> é uma convenção do ambiente. Essa numeração não constitui a interface de chamadas de sistema de Linux/MIPS. Diretivas como <code>.data</code> e <code>.word</code> orientam a montagem e não são instruções executadas pela CPU.</p>
      `
    }
  ],
  "pipeline-lab": [
    {
      id: "desempenho-e-interpretacao",
      title: "CPI, dependências e comparação de desempenho",
      content: html`
        <p>Uma dependência de dados pertence ao programa: uma instrução precisa de um valor produzido por outra. Um conflito de pipeline (<em>hazard</em>) surge quando a organização temporal impede usar esse valor a tempo. O encaminhamento (<em>forwarding</em>) disponibiliza resultados antes da escrita no banco de registos; não elimina a dependência.</p>
        <p>Para uma execução, CPI médio = ciclos / instruções concluídas. Num processador com frequência constante, tempo de CPU = instruções × CPI / frequência. Comparar apenas CPI ignora a contagem de instruções e a frequência. Arranque, esvaziamento e penalizações têm maior peso em sequências curtas.</p>
        <p>Uma taxa de acertos de cache mede acessos satisfeitos nesse nível; não mede diretamente tempo de execução. Para relacionar acertos e latência é necessário conhecer tempos de acesso, penalização de falha e hipóteses de sobreposição. Da mesma forma, uma previsão correta de desvio não equivale a eliminar todos os custos de controlo.</p>
        <p>No webMARS, as contagens de cache e predição pertencem às ferramentas respetivas. O Pipeline Lab usa a latência e o perfil que selecionar; abrir o Data Cache Simulator não acopla automaticamente a sua taxa de falhas ao pipeline. Não converta milissegundos do browser em ciclos de uma CPU MIPS física.</p>
      `
    }
  ],
  "apendices": [
    {
      id: "vocabulario-arquitetura",
      title: "Vocabulário de arquitetura e unidades",
      content: table(["Termo", "Uso neste manual"], [
        ["Palavra (word) / meia palavra (halfword)", "32 / 16 bits no modelo aqui descrito; byte = 8 bits."],
        ["Registo / endereço / valor", "Local de estado da CPU / identificador de posição / padrão de dados. Não são sinónimos."],
        ["Com sinal / sem sinal", "Interpretações numéricas; o padrão de bits não transporta uma etiqueta de tipo."],
        ["Transbordo (overflow)", "Resultado fora do intervalo da representação considerada; distinguir overflow com sinal de transporte sem sinal."],
        ["Desvio / salto", "Transferência de controlo; branch e jump identificam as famílias de instruções quando essa distinção é relevante."],
        ["Pilha / frame", "Stack de chamadas / área de uma chamada. O frame não é uma estrutura criada automaticamente por jal."],
        ["Instrução / pseudoinstrução / diretiva", "Operação codificada / forma expandida pelo assembler / comando de montagem."],
        ["Latência / débito", "Tempo até obter um resultado / quantidade de trabalho concluída por unidade de tempo."],
        ["Ciclo / passo", "Unidade temporal do modelo de pipeline / execução de uma instrução pelo motor funcional."],
        ["KiB, MiB, GiB", "2^10, 2^20 e 2^30 bytes. kB, MB e GB designam potências de 10."],
        ["Exceção / interrupção", "Evento síncrono associado à execução / pedido assíncrono de dispositivo; ambos podem transferir controlo para um handler."],
        ["Definido pela implementação", "Exige consultar o alvo; não autoriza generalizar um resultado observado a todas as CPUs MIPS32."],
        ["UNPREDICTABLE / UNDEFINED", "Categorias da documentação arquitetural. Não são garantias de um resultado determinístico, mesmo que um simulador produza sempre o mesmo valor."]
      ])
    }
  ]
};
