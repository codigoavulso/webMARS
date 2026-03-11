import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(__dirname, "../examples");

const translations = {
  pt: new Map(Object.entries({
    "Bitmap Display demo": "Demo do Bitmap Display",
    "Open Tools > Bitmap Display": "Abra Ferramentas > Bitmap Display",
    "Suggested setup: Unit 1x1, Display 64x64, Base 0x10010000 (.data)": "Configuracao sugerida: Unidade 1x1, Ecra 64x64, Base 0x10010000 (.data)",
    "Draws a moving horizontal bar with changing colors.": "Desenha uma barra horizontal em movimento com cores variaveis.",
    "frame buffer base = 0x10010000": "base do frame buffer = 0x10010000",
    "width": "largura",
    "height": "altura",
    "frame index": "indice do frame",
    "addr = base + ((y*64 + x) * 4)": "endereco = base + ((y*64 + x) * 4)",
    "Build color 0x00RRGGBB": "construir cor 0x00RRGGBB",
    "sleep 30 ms": "esperar 30 ms",
    "Branch-heavy loop for BHT Simulator demo": "Loop com muitos branches para demo do BHT Simulator",
    "Open Tools > BHT Simulator and connect.": "Abra Ferramentas > BHT Simulator e ligue a MIPS.",
    "branch A: taken 3 out of 4 times": "branch A: tomada 3 em cada 4 vezes",
    "branch B: alternating taken/not-taken": "branch B: alterna tomada/nao tomada",
    "Bubble sort demo": "Demo de bubble sort",
    "Sorts a fixed array and prints sorted values.": "Ordena um array fixo e imprime os valores ordenados.",
    "Cache behavior demo (sequential vs strided access)": "Demo de comportamento da cache (acesso sequencial vs estridado)",
    "Open Tools > Data Cache Simulation Tool and connect.": "Abra Ferramentas > Data Cache Simulation Tool e ligue a MIPS.",
    "This program first does sequential loads, then strided loads.": "Este programa faz primeiro leituras sequenciais e depois leituras estridadas.",
    "1024 words": "1024 palavras",
    "Initialize arr[i] = i": "Inicializar arr[i] = i",
    "Phase 1: sequential": "Fase 1: sequencial",
    "Phase 2: stride 16 words (64 bytes)": "Fase 2: stride de 16 palavras (64 bytes)",
    "C-compiled style function call demo": "Demo de chamada de funcao ao estilo de codigo compilado em C",
    "Simulates common prologue/epilogue and local variables on stack.": "Simula prologo/epilogo comuns e variaveis locais na stack.",
    "Digital Lab Sim test": "Teste do Digital Lab Sim",
    "Tool mapping (with default MMIO base 0xFFFF0000):": "Mapeamento da tool (com a base MMIO predefinida 0xFFFF0000):",
    "display right digit: 0xFFFF0010": "digito direito do display: 0xFFFF0010",
    "display left digit : 0xFFFF0011": "digito esquerdo do display : 0xFFFF0011",
    "keyboard ctrl      : 0xFFFF0012": "controlo do teclado : 0xFFFF0012",
    "keyboard out code  : 0xFFFF0014": "codigo de saida do teclado : 0xFFFF0014",
    "Click keys in the Digital Lab Sim keypad.": "Clique nas teclas do keypad do Digital Lab Sim.",
    "Program decodes scan code and displays the pressed key value (0..f).": "O programa descodifica o scan code e mostra o valor da tecla premida (0..f).",
    "scan all rows": "varrer todas as linhas",
    "left digit blank": "digito esquerdo em branco",
    "keyboard scan code (col<<4 | row)": "codigo de scan do teclado (col<<4 | row)",
    "row bit (low nibble) and column bit (high nibble)": "bit da linha (nibble baixo) e bit da coluna (nibble alto)",
    "rowBit: 1,2,4,8": "bitLinha: 1,2,4,8",
    "colBit: 1,2,4,8": "bitColuna: 1,2,4,8",
    "row index = log2(rowBit)": "indice da linha = log2(rowBit)",
    "col index = log2(colBit)": "indice da coluna = log2(colBit)",
    "key nibble = row*4 + col  (values 0..15)": "nibble da tecla = row*4 + col  (valores 0..15)",
    "show pressed key on right digit": "mostrar tecla premida no digito direito",
    "v0: seven-segment pattern": "v0: padrao de sete segmentos",
    "Recursive factorial (faculty classic)": "Fatorial recursivo (classico da faculdade)",
    "Reads n and prints n! (for small n).": "Le n e imprime n! (para n pequeno).",
    "Iterative Fibonacci sequence": "Sequencia de Fibonacci iterativa",
    "Prints first N numbers.": "Imprime os primeiros N numeros.",
    "Floating point test for the Floating Point Representation tool": "Teste de virgula flutuante para a tool Floating Point Representation",
    "Writes IEEE-754 bit patterns into $f12 and prints them as float values.": "Escreve padroes IEEE-754 em $f12 e imprime-os como valores float.",
    "Guess the Number (1..100)": "Adivinha o Numero (1..100)",
    "Uses syscall 42 for random number generation and syscall 5 for integer input.": "Usa a syscall 42 para gerar aleatorios e a syscall 5 para ler inteiros.",
    "Seed random stream id=1 with an arbitrary seed.": "Inicializar a stream aleatoria id=1 com uma seed arbitraria.",
    "Random integer in range [0,100), then shift to [1,100].": "Inteiro aleatorio no intervalo [0,100), depois deslocado para [1,100].",
    "secret number": "numero secreto",
    "attempts": "tentativas",
    "guess": "palpite",
    "if guess < secret => too low": "se palpite < segredo => demasiado baixo",
    "if secret < guess => too high": "se segredo < palpite => demasiado alto",
    "equal => win": "igual => venceu",
    "Hello World for Run I/O": "Hello World para Run I/O",
    "Prints a simple message and exits.": "Imprime uma mensagem simples e termina.",
    "Keyboard and Display MMIO Simulator demo": "Demo do Keyboard and Display MMIO Simulator",
    "Open Tools > Keyboard and Display MMIO Simulator": "Abra Ferramentas > Keyboard and Display MMIO Simulator",
    "Type in the lower keyboard area; characters are echoed to upper display area.": "Escreva na area inferior do teclado; os caracteres sao ecoados na area superior do display.",
    "MMIO base 0xFFFF0000": "base MMIO 0xFFFF0000",
    "wait keyboard receiver ready (bit0 @ 0x0000)": "esperar recetor do teclado pronto (bit0 @ 0x0000)",
    "read char @ 0x0004": "ler char @ 0x0004",
    "wait display transmitter ready (bit0 @ 0x0008)": "esperar transmissor do display pronto (bit0 @ 0x0008)",
    "write char @ 0x000C": "escrever char @ 0x000C",
    "Mars Bot interactive demo": "Demo interativa do Mars Bot",
    "Open Tools > Mars Bot before running.": "Abra Ferramentas > Mars Bot antes de executar.",
    "Controls in Run I/O input:": "Controlos no input de Run I/O:",
    "w = up, d = right, s = down, a = left": "w = cima, d = direita, s = baixo, a = esquerda",
    "t = toggle trail, x = stop, q = quit": "t = alternar trilho, x = parar, q = sair",
    "Base for Mars Bot MMIO addresses: 0xFFFF8000": "Base dos enderecos MMIO do Mars Bot: 0xFFFF8000",
    "trail state": "estado do trilho",
    "leave track on": "deixar trilho ligado",
    "move off initially": "movimento desligado inicialmente",
    "t (toggle trail)": "t (alternar trilho)",
    "x (stop)": "x (parar)",
    "w (heading 0)": "w (direcao 0)",
    "d (heading 90)": "d (direcao 90)",
    "s (heading 180)": "s (direcao 180)",
    "a (heading 270)": "a (direcao 270)",
    "3x3 matrix multiplication (C = A * B)": "Multiplicacao de matrizes 3x3 (C = A * B)",
    "sum": "soma",
    "String utilities demo: strlen + strcpy (manual)": "Demo de utilitarios de strings: strlen + strcpy (manual)",
    "a0 = char* s ; v0 = length": "a0 = char* s ; v0 = comprimento",
    "Manual parity test:": "Teste manual de paridade:",
    "With delayed branching enabled, the overflow happens in the delay slot.": "Com delayed branching ativo, o overflow acontece no delay slot.",
    "Expected behavior:": "Comportamento esperado:",
    "- exception message: arithmetic overflow": "- mensagem de excecao: overflow aritmetico",
    "- Cause.BD set": "- Cause.BD ativo",
    "- EPC points to the beq instruction": "- o EPC aponta para a instrucao beq",
    "Manual parity test for jalr rd, rs.": "Teste manual de paridade para jalr rd, rs.",
    "Expected behavior after run:": "Comportamento esperado apos a execucao:",
    "- $s0 contains the link address 0x0040000c": "- $s0 contem o endereco de retorno 0x0040000c",
    "- $t0 becomes 7 inside target": "- $t0 passa a 7 dentro do target",
    "- $t3 becomes 9 after returning through $s0": "- $t3 passa a 9 depois de regressar via $s0",
    "Manual parity test for pseudo-op lowering.": "Teste manual de paridade para lowering de pseudo-ops.",
    "After run, inspect data segment at results:": "Apos executar, inspecione o segmento de dados em results:",
    "Manual parity test for Settings > Initialize Program Counter to global 'main' if defined.": "Teste manual de paridade para Definicoes > Initialize Program Counter to global 'main' if defined.",
    "- with startAtMain disabled: prints PRELUDE": "- com startAtMain desativado: imprime PRELUDE",
    "- with startAtMain enabled: prints MAIN": "- com startAtMain ativado: imprime MAIN",
    "Manual parity test for address error on load.": "Teste manual de paridade para erro de endereco em leitura.",
    "- load exception raised on 0x10010001": "- excecao de leitura levantada em 0x10010001",
    "- bad address / vaddr shows 0x10010001": "- bad address / vaddr mostra 0x10010001",
    "MARS-OS v0.1 — Bootstrap + Consola gráfica no Bitmap Display": "MARS-OS v0.1 - Bootstrap + consola grafica no Bitmap Display",
    "Unit Width/Height: 1": "Largura/Altura da unidade: 1",
    "Display: 512 x 256": "Ecra: 512 x 256",
    "Base address: 0x10010000": "Endereco base: 0x10010000",
    "célula 8x8 px => 64 cols x 32 rows": "celula 8x8 px => 64 colunas x 32 linhas",
    "scroll por cópia de linhas (copy-up)": "scroll por copia de linhas (copy-up)",
    "512*8*4 = 8 linhas de píxeis": "512*8*4 = 8 linhas de pixeis",
    "--- Framebuffer TEM de ser o primeiro item do .data": "--- O framebuffer TEM de ser o primeiro item de .data",
    "base = 0x10010000 (se for mesmo o 1º no .data)": "base = 0x10010000 (se for mesmo o primeiro em .data)",
    "Glyphs 8x8 (sparse table): cada registo tem 9 bytes:": "Glyphs 8x8 (tabela esparsa): cada registo tem 9 bytes:",
    "row bits: bit7 = pixel mais à esquerda.": "bits da linha: bit7 = pixel mais a esquerda.",
    "end marker": "marcador de fim",
    "stack “safe-ish”": "stack relativamente segura",
    "console_init: limpa e reset cursor": "console_init: limpa e repoe o cursor",
    "fb_clear: fill framebuffer com bg_color": "fb_clear: preenche o framebuffer com bg_color",
    "versão otimizada: limpa blocos 8x8 (64 pixels)": "versao otimizada: limpa blocos 8x8 (64 pixeis)",
    "/64 (64 pixels por loop)": "/64 (64 pixeis por ciclo)",
    "console_backspace: recua cursor e apaga célula (desenha ' ')": "console_backspace: recua o cursor e apaga a celula (desenha ' ')",
    "load row/col": "carregar linha/coluna",
    "row": "linha",
    "col": "coluna",
    "se estamos em (0,0) não faz nada": "se estamos em (0,0) nao faz nada",
    "store cursor": "guardar cursor",
    "desenhar espaço na célula atual": "desenhar espaco na celula atual",
    "converte 'a'..'z' em 'A'..'Z' (por agora)": "converte 'a'..'z' em 'A'..'Z' (por agora)",
    "tab => 4 espaços": "tab => 4 espacos",
    "console_newline: col=0; row++; scroll se necessário": "console_newline: col=0; row++; scroll se necessario",
    "console_scroll: copia framebuffer 8 linhas para cima + limpa última banda": "console_scroll: copia o framebuffer 8 linhas para cima + limpa a ultima banda",
    "kernel_main: lê teclado por MMIO e faz echo": "kernel_main: le teclado por MMIO e faz eco"
  })),
  es: new Map(Object.entries({
    "Bitmap Display demo": "Demo del Bitmap Display",
    "Open Tools > Bitmap Display": "Abra Herramientas > Bitmap Display",
    "Suggested setup: Unit 1x1, Display 64x64, Base 0x10010000 (.data)": "Configuracion sugerida: Unidad 1x1, Pantalla 64x64, Base 0x10010000 (.data)",
    "Draws a moving horizontal bar with changing colors.": "Dibuja una barra horizontal en movimiento con colores cambiantes.",
    "frame buffer base = 0x10010000": "base del frame buffer = 0x10010000",
    "width": "ancho",
    "height": "alto",
    "frame index": "indice del frame",
    "addr = base + ((y*64 + x) * 4)": "direccion = base + ((y*64 + x) * 4)",
    "Build color 0x00RRGGBB": "construir color 0x00RRGGBB",
    "sleep 30 ms": "esperar 30 ms",
    "Branch-heavy loop for BHT Simulator demo": "Bucle con muchos branches para demo del BHT Simulator",
    "Open Tools > BHT Simulator and connect.": "Abra Herramientas > BHT Simulator y conecte a MIPS.",
    "branch A: taken 3 out of 4 times": "branch A: tomada 3 de cada 4 veces",
    "branch B: alternating taken/not-taken": "branch B: alterna tomada/no tomada",
    "Bubble sort demo": "Demo de bubble sort",
    "Sorts a fixed array and prints sorted values.": "Ordena un array fijo e imprime los valores ordenados.",
    "Cache behavior demo (sequential vs strided access)": "Demo de comportamiento de la cache (acceso secuencial vs con salto)",
    "Open Tools > Data Cache Simulation Tool and connect.": "Abra Herramientas > Data Cache Simulation Tool y conecte a MIPS.",
    "This program first does sequential loads, then strided loads.": "Este programa hace primero lecturas secuenciales y luego lecturas con salto.",
    "1024 words": "1024 palabras",
    "Initialize arr[i] = i": "Inicializar arr[i] = i",
    "Phase 1: sequential": "Fase 1: secuencial",
    "Phase 2: stride 16 words (64 bytes)": "Fase 2: stride de 16 palabras (64 bytes)",
    "C-compiled style function call demo": "Demo de llamada de funcion al estilo de codigo compilado en C",
    "Simulates common prologue/epilogue and local variables on stack.": "Simula prologo/epilogo comunes y variables locales en la stack.",
    "Digital Lab Sim test": "Prueba del Digital Lab Sim",
    "Tool mapping (with default MMIO base 0xFFFF0000):": "Mapeo de la herramienta (con la base MMIO predeterminada 0xFFFF0000):",
    "display right digit: 0xFFFF0010": "digito derecho del display: 0xFFFF0010",
    "display left digit : 0xFFFF0011": "digito izquierdo del display : 0xFFFF0011",
    "keyboard ctrl      : 0xFFFF0012": "control del teclado : 0xFFFF0012",
    "keyboard out code  : 0xFFFF0014": "codigo de salida del teclado : 0xFFFF0014",
    "Click keys in the Digital Lab Sim keypad.": "Pulse teclas en el keypad del Digital Lab Sim.",
    "Program decodes scan code and displays the pressed key value (0..f).": "El programa decodifica el scan code y muestra el valor de la tecla pulsada (0..f).",
    "scan all rows": "recorrer todas las filas",
    "left digit blank": "digito izquierdo en blanco",
    "keyboard scan code (col<<4 | row)": "codigo de escaneo del teclado (col<<4 | row)",
    "row bit (low nibble) and column bit (high nibble)": "bit de la fila (nibble bajo) y bit de la columna (nibble alto)",
    "rowBit: 1,2,4,8": "bitFila: 1,2,4,8",
    "colBit: 1,2,4,8": "bitColumna: 1,2,4,8",
    "row index = log2(rowBit)": "indice de la fila = log2(rowBit)",
    "col index = log2(colBit)": "indice de la columna = log2(colBit)",
    "key nibble = row*4 + col  (values 0..15)": "nibble de la tecla = row*4 + col  (valores 0..15)",
    "show pressed key on right digit": "mostrar la tecla pulsada en el digito derecho",
    "v0: seven-segment pattern": "v0: patron de siete segmentos",
    "Recursive factorial (faculty classic)": "Factorial recursivo (clasico de facultad)",
    "Reads n and prints n! (for small n).": "Lee n e imprime n! (para n pequenos).",
    "Iterative Fibonacci sequence": "Secuencia de Fibonacci iterativa",
    "Prints first N numbers.": "Imprime los primeros N numeros.",
    "Floating point test for the Floating Point Representation tool": "Prueba de coma flotante para la herramienta Floating Point Representation",
    "Writes IEEE-754 bit patterns into $f12 and prints them as float values.": "Escribe patrones IEEE-754 en $f12 y los imprime como valores float.",
    "Guess the Number (1..100)": "Adivina el Numero (1..100)",
    "Uses syscall 42 for random number generation and syscall 5 for integer input.": "Usa la syscall 42 para generar aleatorios y la syscall 5 para leer enteros.",
    "Seed random stream id=1 with an arbitrary seed.": "Inicializar la secuencia aleatoria id=1 con una semilla arbitraria.",
    "Random integer in range [0,100), then shift to [1,100].": "Entero aleatorio en el rango [0,100), y luego desplazado a [1,100].",
    "secret number": "numero secreto",
    "attempts": "intentos",
    "guess": "intento",
    "if guess < secret => too low": "si intento < secreto => demasiado bajo",
    "if secret < guess => too high": "si secreto < intento => demasiado alto",
    "equal => win": "igual => gana",
    "Hello World for Run I/O": "Hello World para Run I/O",
    "Prints a simple message and exits.": "Imprime un mensaje simple y termina.",
    "Keyboard and Display MMIO Simulator demo": "Demo del Keyboard and Display MMIO Simulator",
    "Open Tools > Keyboard and Display MMIO Simulator": "Abra Herramientas > Keyboard and Display MMIO Simulator",
    "Type in the lower keyboard area; characters are echoed to upper display area.": "Escriba en el area inferior del teclado; los caracteres se reflejan en el area superior de la pantalla.",
    "MMIO base 0xFFFF0000": "base MMIO 0xFFFF0000",
    "wait keyboard receiver ready (bit0 @ 0x0000)": "esperar receptor del teclado listo (bit0 @ 0x0000)",
    "read char @ 0x0004": "leer char @ 0x0004",
    "wait display transmitter ready (bit0 @ 0x0008)": "esperar transmisor de la pantalla listo (bit0 @ 0x0008)",
    "write char @ 0x000C": "escribir char @ 0x000C",
    "Mars Bot interactive demo": "Demo interactiva del Mars Bot",
    "Open Tools > Mars Bot before running.": "Abra Herramientas > Mars Bot antes de ejecutar.",
    "Controls in Run I/O input:": "Controles en la entrada de Run I/O:",
    "w = up, d = right, s = down, a = left": "w = arriba, d = derecha, s = abajo, a = izquierda",
    "t = toggle trail, x = stop, q = quit": "t = alternar rastro, x = detener, q = salir",
    "Base for Mars Bot MMIO addresses: 0xFFFF8000": "Base de las direcciones MMIO del Mars Bot: 0xFFFF8000",
    "trail state": "estado del rastro",
    "leave track on": "dejar rastro activado",
    "move off initially": "movimiento desactivado al inicio",
    "t (toggle trail)": "t (alternar rastro)",
    "x (stop)": "x (detener)",
    "w (heading 0)": "w (direccion 0)",
    "d (heading 90)": "d (direccion 90)",
    "s (heading 180)": "s (direccion 180)",
    "a (heading 270)": "a (direccion 270)",
    "3x3 matrix multiplication (C = A * B)": "Multiplicacion de matrices 3x3 (C = A * B)",
    "sum": "suma",
    "String utilities demo: strlen + strcpy (manual)": "Demo de utilidades de cadenas: strlen + strcpy (manual)",
    "a0 = char* s ; v0 = length": "a0 = char* s ; v0 = longitud",
    "Manual parity test:": "Prueba manual de paridad:",
    "With delayed branching enabled, the overflow happens in the delay slot.": "Con delayed branching activado, el overflow ocurre en el delay slot.",
    "Expected behavior:": "Comportamiento esperado:",
    "- exception message: arithmetic overflow": "- mensaje de excepcion: overflow aritmetico",
    "- Cause.BD set": "- Cause.BD activo",
    "- EPC points to the beq instruction": "- el EPC apunta a la instruccion beq",
    "Manual parity test for jalr rd, rs.": "Prueba manual de paridad para jalr rd, rs.",
    "Expected behavior after run:": "Comportamiento esperado tras la ejecucion:",
    "- $s0 contains the link address 0x0040000c": "- $s0 contiene la direccion de retorno 0x0040000c",
    "- $t0 becomes 7 inside target": "- $t0 pasa a 7 dentro del target",
    "- $t3 becomes 9 after returning through $s0": "- $t3 pasa a 9 despues de volver por $s0",
    "Manual parity test for pseudo-op lowering.": "Prueba manual de paridad para el lowering de pseudo-ops.",
    "After run, inspect data segment at results:": "Tras ejecutar, inspeccione el segmento de datos en results:",
    "Manual parity test for Settings > Initialize Program Counter to global 'main' if defined.": "Prueba manual de paridad para Settings > Initialize Program Counter to global 'main' if defined.",
    "- with startAtMain disabled: prints PRELUDE": "- con startAtMain desactivado: imprime PRELUDE",
    "- with startAtMain enabled: prints MAIN": "- con startAtMain activado: imprime MAIN",
    "Manual parity test for address error on load.": "Prueba manual de paridad para error de direccion en lectura.",
    "- load exception raised on 0x10010001": "- excepcion de lectura lanzada en 0x10010001",
    "- bad address / vaddr shows 0x10010001": "- bad address / vaddr muestra 0x10010001",
    "MARS-OS v0.1 — Bootstrap + Consola gráfica no Bitmap Display": "MARS-OS v0.1 - Bootstrap + consola grafica en el Bitmap Display",
    "Unit Width/Height: 1": "Ancho/Alto de la unidad: 1",
    "Display: 512 x 256": "Pantalla: 512 x 256",
    "Base address: 0x10010000": "Direccion base: 0x10010000",
    "célula 8x8 px => 64 cols x 32 rows": "celda 8x8 px => 64 columnas x 32 filas",
    "scroll por cópia de linhas (copy-up)": "scroll por copia de lineas (copy-up)",
    "512*8*4 = 8 linhas de píxeis": "512*8*4 = 8 lineas de pixeles",
    "--- Framebuffer TEM de ser o primeiro item do .data": "--- El framebuffer TIENE que ser el primer elemento de .data",
    "base = 0x10010000 (se for mesmo o 1º no .data)": "base = 0x10010000 (si de verdad es el primero en .data)",
    "--- Estado da consola (fica depois do framebuffer)": "--- Estado de la consola (queda despues del framebuffer)",
    "branco": "blanco",
    "preto": "negro",
    "Glyphs 8x8 (sparse table): cada registo tem 9 bytes:": "Glyphs 8x8 (tabla dispersa): cada registro tiene 9 bytes:",
    "row bits: bit7 = pixel mais à esquerda.": "bits de la fila: bit7 = pixel mas a la izquierda.",
    "end marker": "marcador final",
    "stack “safe-ish”": "stack relativamente segura",
    "console_init: limpa e reset cursor": "console_init: limpia y reinicia el cursor",
    "fb_clear: fill framebuffer com bg_color": "fb_clear: rellena el framebuffer con bg_color",
    "versão otimizada: limpa blocos 8x8 (64 pixels)": "version optimizada: limpia bloques 8x8 (64 pixeles)",
    "/64 (64 pixels por loop)": "/64 (64 pixeles por bucle)",
    "console_backspace: recua cursor e apaga célula (desenha ' ')": "console_backspace: retrocede el cursor y borra la celda (dibuja ' ')",
    "load row/col": "cargar fila/columna",
    "row": "fila",
    "col": "columna",
    "se estamos em (0,0) não faz nada": "si estamos en (0,0) no hace nada",
    "store cursor": "guardar cursor",
    "desenhar espaço na célula atual": "dibujar espacio en la celda actual",
    "converte 'a'..'z' em 'A'..'Z' (por agora)": "convierte 'a'..'z' en 'A'..'Z' (por ahora)",
    "backspace (0x08) ou DEL (0x7F)": "backspace (0x08) o DEL (0x7F)",
    "tab => 4 espaços": "tab => 4 espacios",
    "console_newline: col=0; row++; scroll se necessário": "console_newline: col=0; row++; scroll si es necesario",
    "console_scroll: copia framebuffer 8 linhas para cima + limpa última banda": "console_scroll: copia el framebuffer 8 lineas hacia arriba + limpia la ultima banda",
    "kernel_main: lê teclado por MMIO e faz echo": "kernel_main: lee el teclado por MMIO y hace eco",
    "suporta: '\\n' (LF), '\\r' (CR), '\\t' (tab=4), backspace": "soporta: '\\n' (LF), '\\r' (CR), '\\t' (tab=4), backspace",
    "'a'..'z' => uppercase": "'a'..'z' => mayusculas"
  }))
};

const allowedUnchanged = new Set([
  "Bitmap Display:",
  "Consola:",
  "MMIO (MARS)",
  "--- Estado da consola (fica depois do framebuffer)",
  "branco",
  "preto",
  "[char_code][row0]..[row7]",
  "suporta: '\\n' (LF), '\\r' (CR), '\\t' (tab=4), backspace",
  "converte 'a'..'z' em 'A'..'Z' (por agora)",
  "backspace (0x08) ou DEL (0x7F)",
  "console_puts($a0=asciiz)",
  "console_putc($a0=char)",
  "draw_char_cell($a0=char, $a1=col, $a2=row)",
  "glyph_lookup($a0=char) -> $v0 = ptr para 8 bytes (row0..row7)",
  "draw_glyph8x8($a0=char, $a1=x, $a2=y)",
  "int fact(int n)",
  "int sumSquares(int x, int y) {",
  "int sx = x*x;",
  "int sy = y*y;",
  "return sx + sy;",
  "}",
  "A[i][k]",
  "B[k][j]",
  "R = (x + frame) & 255",
  "G = (y*4) & 255",
  "B = (x ^ y ^ frame) & 255",
  "a0: nibble 0..15",
  "a0 = dst, a1 = src",
  "x local",
  "y local",
  "sx local",
  "sy local",
  "results[0] = 1            seq 5,5",
  "results[1] = 1            sge 5,5",
  "results[2] = 5            abs -5",
  "results[3] = 0xfffffffa   not 5",
  "y = 0",
  "x = 0",
  "y*64",
  "y*64 + x",
  "*4",
  "'a'..'z' => uppercase",
  "i",
  "j",
  "k",
  "N",
  "a",
  "b",
  "q"
]);

function isAllowedUnchanged(body) {
  return (
    allowedUnchanged.has(body)
    || /^[-=]{10,}$/.test(body)
    || /^'.*'$/.test(body)
    || /^[0-9xXa-fA-F*()+\-\/ =<>.]+$/.test(body)
  );
}

function translateLine(line, map, unresolved, ref) {
  const commentIndex = line.indexOf("#");
  if (commentIndex < 0) return line;
  const prefix = line.slice(0, commentIndex + 1);
  const rest = line.slice(commentIndex + 1);
  const match = /^(\s*)(.*)$/.exec(rest);
  const leading = match?.[1] || "";
  const body = match?.[2] || "";
  if (!body) return line;
  const translated = map.get(body) ?? body;
  if (translated === body && !isAllowedUnchanged(body) && /[A-Za-zÀ-ÿ]/.test(body)) {
    unresolved.push({ ref, body });
  }
  return `${prefix}${leading}${translated}`;
}

function stripCommentBody(line) {
  const idx = line.indexOf("#");
  return idx < 0 ? line : line.slice(0, idx);
}

const sourceFiles = fs.readdirSync(examplesDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".asm"))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

for (const language of Object.keys(translations)) {
  const targetDir = path.join(examplesDir, language);
  fs.mkdirSync(targetDir, { recursive: true });
  const unresolved = [];

  for (const fileName of sourceFiles) {
    const sourcePath = path.join(examplesDir, fileName);
    const targetPath = path.join(targetDir, fileName);
    const sourceText = fs.readFileSync(sourcePath, "utf8");
    const hasTrailingNewline = /\r?\n$/.test(sourceText);
    const newline = sourceText.includes("\r\n") ? "\r\n" : "\n";
    const sourceLines = sourceText.split(/\r?\n/);
    if (hasTrailingNewline && sourceLines[sourceLines.length - 1] === "") {
      sourceLines.pop();
    }
    const translatedLines = sourceLines.map((line, index) => translateLine(
      line,
      translations[language],
      unresolved,
      `${fileName}:${index + 1}`
    ));

    for (let index = 0; index < sourceLines.length; index += 1) {
      if (stripCommentBody(sourceLines[index]) !== stripCommentBody(translatedLines[index])) {
        throw new Error(`${language}:${fileName}:${index + 1} changed code outside comments`);
      }
    }

    const outputText = translatedLines.join(newline);
    fs.writeFileSync(targetPath, hasTrailingNewline ? `${outputText}${newline}` : outputText, "utf8");
  }

  if (unresolved.length) {
    console.error(`Unresolved comment bodies for ${language}:`);
    unresolved.forEach((entry) => {
      console.error(`- ${entry.ref}: ${entry.body}`);
    });
    process.exitCode = 1;
  } else {
    console.log(`Generated example translations for ${language}.`);
  }
}
