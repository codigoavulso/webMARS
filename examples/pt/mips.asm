# MARS-OS 1.0 - ambiente operativo TTY interativo e completo
# Abra Ferramentas > TTY Device + ANSI Terminal, ligue a MIPS,
# monte este projeto e escreva "desktop" para a interface de rato ou "help".
#
# Este ficheiro contem apenas o texto localizado. O kernel vive nos
# modulos neutros incluidos no fim:
#   mips_os_lib.asm    driver TTY, controlo ANSI, strings, inteiros
#   mips_os_fs.asm     sistema de ficheiros RAM e os seus comandos
#   mips_os_apps.asm   calculadora, banner, calendario, jogos
#   mips_os_edit.asm   editor de texto de ecra inteiro
#   mips_os_sheet.asm  folha de calculo de ecra inteiro
#   mips_os_basic.asm  interpretador BASIC de inteiros por numero de linha
#   mips_os_desktop.asm Gestor de Programas, rato e janelas
#   mips_os_kernel.asm arranque, shell e comandos de sistema
#
# Nota: as strings usam apenas ASCII porque o terminal escreve bytes
# em bruto e um acento em UTF-8 ocuparia dois bytes ilegiveis.

.data

# ---- arranque ----
banner: .asciiz "+----------------------------------------------------------+\r\n| MARS-OS 1.0 | Ambiente TTY interativo para MIPS32        |\r\n+----------------------------------------------------------+\r\n"
msg_boot: .asciiz "[ ok ] Consola MMIO, shell, disco RAM e servicos ativos."
msg_disk_ready: .asciiz "[ ok ] Disco RAM montado: "
msg_disk_files: .asciiz " ficheiros, "
msg_hint: .asciiz "A iniciar o ambiente de trabalho. Abra o Terminal para usar comandos."
prompt_user: .asciiz "convidado"
prompt_host: .asciiz "@webmars"
prompt_path: .asciiz ":/$ "

# ---- nomes dos comandos ----
cmd_help: .asciiz "help"
cmd_about: .asciiz "about"
cmd_clear: .asciiz "clear"
cmd_echo: .asciiz "echo"
cmd_sysinfo: .asciiz "sysinfo"
cmd_mem: .asciiz "mem"
cmd_uptime: .asciiz "uptime"
cmd_clock: .asciiz "clock"
cmd_date: .asciiz "date"
cmd_bench: .asciiz "bench"
cmd_history: .asciiz "history"
cmd_color: .asciiz "color"
cmd_ps: .asciiz "ps"
cmd_pwd: .asciiz "pwd"
cmd_ls: .asciiz "ls"
cmd_cat: .asciiz "cat"
cmd_touch: .asciiz "touch"
cmd_rm: .asciiz "rm"
cmd_cp: .asciiz "cp"
cmd_mv: .asciiz "mv"
cmd_write: .asciiz "write"
cmd_append: .asciiz "append"
cmd_wc: .asciiz "wc"
cmd_head: .asciiz "head"
cmd_tail: .asciiz "tail"
cmd_grep: .asciiz "grep"
cmd_sort: .asciiz "sort"
cmd_hexdump: .asciiz "hexdump"
cmd_df: .asciiz "df"
cmd_edit: .asciiz "edit"
cmd_sheet: .asciiz "sheet"
cmd_calc: .asciiz "calc"
cmd_base: .asciiz "base"
cmd_ascii: .asciiz "ascii"
cmd_banner: .asciiz "banner"
cmd_fib: .asciiz "fib"
cmd_primes: .asciiz "primes"
cmd_rand: .asciiz "rand"
cmd_sleep: .asciiz "sleep"
cmd_life: .asciiz "life"
cmd_guess: .asciiz "guess"
cmd_reboot: .asciiz "reboot"
cmd_basic: .asciiz "basic"
cmd_shutdown: .asciiz "shutdown"
cmd_desktop: .asciiz "desktop"
cmd_exit: .asciiz "exit"

# ---- ajuda e descricao ----
help_text: .asciiz "Conjunto de comandos do MARS-OS\r\n\r\nsistema  help about clear echo sysinfo mem uptime clock date bench\r\n         history color ps pwd reboot shutdown\r\ndisco    ls cat touch rm cp mv write append wc head tail grep sort\r\n         hexdump df\r\napps     basic edit sheet calc base ascii banner fib primes rand sleep\r\n         life guess\r\n\r\nutilizacao\r\n  echo TEXTO             escreve TEXTO no terminal\r\n  color NOME             cor do prompt: green cyan yellow white red\r\n  cat|wc|head|tail FICH  le um ficheiro do disco RAM\r\n  touch|rm FICHEIRO      cria ou apaga um ficheiro\r\n  cp|mv ORIGEM DESTINO   copia ou muda o nome de um ficheiro\r\n  write|append FICH TXT  substitui ou estende o ficheiro com uma linha\r\n  grep TEXTO FICHEIRO    mostra as linhas correspondentes\r\n  sort|hexdump FICHEIRO  linhas ordenadas, ou despejo de bytes\r\n  basic [FICHEIRO]       interpretador BASIC de inteiros por numero de linha\r\n  edit FICHEIRO          editor de texto de ecra inteiro\r\n  sheet FICHEIRO         folha de calculo de ecra inteiro\r\n  calc A OP B            inteiros, OP e + - * / % & | ^ < >\r\n  base N                 o mesmo numero em quatro notacoes\r\n  banner TEXTO           letras em bitmap 5x5\r\n  fib N | primes N       geradores de sequencias\r\n  rand N | sleep MS      inteiro aleatorio, espera cooperativa\r\n  life [N] | guess       Jogo da Vida, jogo de adivinha\r\n"
about_text: .asciiz "O MARS-OS e um pequeno kernel educativo escrito integralmente em Assembly MIPS. Controla o TTY do webMARS por MMIO e implementa esperas cooperativas de dispositivo, edicao de linha com historico, uma shell orientada a tabela, um sistema de ficheiros RAM com escrita, um editor de texto de ecra inteiro, uma folha de calculo com avaliador de formulas inteiras e um interpretador BASIC com numeros de linha.\r\n"
msg_unknown: .asciiz "comando nao encontrado: "

# ---- relatorios de sistema ----
sysinfo_header: .asciiz "kernel: MARS-OS 1.0\r\ncpu: MIPS32 little-endian, runtime JavaScript\r\nconsola: TTY ANSI em MMIO 0xFFFF0000\r\nscheduler: esperas cooperativas de dispositivos\r\n"
sysinfo_commands: .asciiz "comandos executados: "
sysinfo_installed: .asciiz "comandos instalados: "
uptime_prefix: .asciiz "tempo ativo: "
clock_time_prefix: .asciiz "epoch do relogio: "
clock_timer_prefix: .asciiz "contador / periodo: "
clock_separator: .asciiz " / "
clock_uptime_prefix: .asciiz "tempo simulado do relogio: "
clock_device_offline: .asciiz "temporizador: inativo (abra e ligue a tool System Clock para temporizacao MMIO)\r\n"
bench_result_prefix: .asciiz "benchmark: "
bench_ips_suffix: .asciiz " instrucoes/s"
bench_sample_prefix: .asciiz "amostra: "
bench_ms_middle: .asciiz " ms, "
bench_instructions_suffix: .asciiz " instrucoes"
ms_suffix: .asciiz " ms"
mem_heap: .asciiz "limite do heap: "
mem_stack: .asciiz "stack pointer: "
mem_history: .asciiz "anel de historico: "
mem_disk: .asciiz "disco ram: "
bytes_suffix: .asciiz " bytes"

# ---- calculadora e conversoes ----
result_prefix: .asciiz "resultado: "
result_hex: .asciiz " ("
result_close: .asciiz ")\r\n"
msg_div_zero: .asciiz "calc: divisao por zero\r\n"
msg_calc_usage: .asciiz "uso: calc A OP B   exemplo: calc 0x20 + 22\r\n"
base_decimal: .asciiz "decimal:    "
base_hex: .asciiz "hexadecimal:"
base_binary: .asciiz "binario:    "
base_unsigned: .asciiz "sem sinal:  "
msg_base_usage: .asciiz "uso: base N   exemplo: base 0b1011\r\n"

# ---- geradores e jogos ----
msg_rand_usage: .asciiz "uso: rand N   N deve estar entre 1 e 1000000\r\n"
msg_sleep_usage: .asciiz "uso: sleep MS   MS deve estar entre 0 e 10000\r\n"
msg_awake: .asciiz "acordado\r\n"
msg_fib_usage: .asciiz "uso: fib N   N deve estar entre 1 e 47\r\n"
msg_primes_usage: .asciiz "uso: primes N   N deve estar entre 2 e 5000\r\n"
msg_banner_usage: .asciiz "uso: banner TEXTO   letras, digitos e espacos\r\n"
msg_life_usage: .asciiz "uso: life [N]   N geracoes, entre 1 e 200\r\n"
life_header: .asciiz "Jogo da Vida - geracao "
life_of: .asciiz " de "
life_done: .asciiz "simulacao terminada\r\n"
guess_intro: .asciiz "Escolhi um numero entre 1 e 100. Tem sete tentativas.\r\n"
guess_prompt: .asciiz "palpite> "
guess_higher: .asciiz "mais alto\r\n"
guess_lower: .asciiz "mais baixo\r\n"
guess_won: .asciiz "certo, em "
guess_tries: .asciiz " tentativas\r\n"
guess_lost: .asciiz "tentativas esgotadas. O numero era "

# ---- historico ----
history_separator: .asciiz "  "
msg_history_empty: .asciiz "o historico esta vazio\r\n"

# ---- sistema de ficheiros ----
ls_header: .asciiz "NOME                 TAM.  LINHAS\r\n"
ls_empty: .asciiz "o disco esta vazio\r\n"
msg_file_missing: .asciiz "ficheiro nao encontrado\r\n"
msg_need_name: .asciiz "e necessario indicar um nome de ficheiro\r\n"
msg_disk_full: .asciiz "o disco esta cheio\r\n"
msg_exists: .asciiz "o destino ja existe\r\n"
msg_ok: .asciiz "ok\r\n"
msg_copy_usage: .asciiz "uso: cp ORIGEM DESTINO\r\n"
msg_move_usage: .asciiz "uso: mv ORIGEM DESTINO\r\n"
msg_write_usage: .asciiz "uso: write FICHEIRO TEXTO   ou   append FICHEIRO TEXTO\r\n"
msg_grep_usage: .asciiz "uso: grep TEXTO FICHEIRO\r\n"
grep_separator: .asciiz ": "
wc_lines: .asciiz "linhas: "
wc_words: .asciiz "  palavras: "
wc_bytes: .asciiz "  bytes: "
df_files: .asciiz "ficheiros: "
df_of: .asciiz " de "
df_bytes: .asciiz "bytes: "
df_per_file: .asciiz "capacidade por ficheiro: "

# ---- cores do prompt ----
color_green_name: .asciiz "green"
color_cyan_name: .asciiz "cyan"
color_yellow_name: .asciiz "yellow"
color_white_name: .asciiz "white"
color_red_name: .asciiz "red"
msg_color_usage: .asciiz "uso: color green|cyan|yellow|white|red\r\n"
msg_color_set: .asciiz "cor do prompt atualizada\r\n"

# ---- processos e encerramento ----
ps_text: .asciiz " PID  ESTADO  TAREFA\r\n   1  run     init/shell\r\n   2  wait    tty-rx\r\n   3  ready   tty-tx\r\n   4  idle    discoram\r\n"
pwd_text: .asciiz "/\r\n"
msg_shutdown: .asciiz "Sistema terminado. Pode agora reiniciar o simulador.\r\n"

# ---- calendario ----
date_prefix: .asciiz "data: "
date_dash: .asciiz "-"
date_colon: .asciiz ":"
date_utc: .asciiz " UTC"
date_days_prefix: .asciiz "dias desde a epoch: "

# ---- interpretador BASIC ----
basic_banner: .asciiz "MARS-OS BASIC - 64 linhas de programa, 26 variaveis inteiras A..Z\r\nInstrucoes PRINT LET INPUT IF/THEN GOTO GOSUB RETURN FOR/NEXT REM END CLS\r\nComandos   RUN LIST NEW SAVE nome LOAD nome BYE     Ctrl-C para o programa\r\n"
basic_ready: .asciiz "PRONTO.\r\n"
basic_prompt: .asciiz "] "
basic_bye: .asciiz "basic: de volta a shell\r\n"
basic_input_prompt: .asciiz "? "
basic_input_again: .asciiz "?REPETE\r\n"
basic_break: .asciiz "INTERROMPIDO\r\n"
basic_saved: .asciiz "gravado em "
basic_loaded: .asciiz "carregadas "
basic_loaded_tail: .asciiz " linhas"
basic_err_prefix: .asciiz "?ERRO DE "
basic_err_suffix: .asciiz ""
basic_err_in: .asciiz " NA LINHA "
basic_err_syntax: .asciiz "SINTAXE"
basic_err_line: .asciiz "LINHA INEXISTENTE"
basic_err_divzero: .asciiz "DIVISAO POR ZERO"
basic_err_stack: .asciiz "ANINHAMENTO EXCESSIVO"
basic_err_next: .asciiz "NEXT SEM FOR"
basic_err_return: .asciiz "RETURN SEM GOSUB"
basic_err_full: .asciiz "PROGRAMA DEMASIADO LONGO"
msg_basic_usage: .asciiz "uso: basic [FICHEIRO]   abre o interpretador, carregando FICHEIRO se indicado\r\n"

# ---- editor de texto ----
edit_title: .asciiz " MARS-OS edit   "
edit_modified: .asciiz "   [modificado]"
edit_line_label: .asciiz "linha "
edit_col_label: .asciiz "   coluna "
edit_bytes_label: .asciiz "   bytes "
edit_slash: .asciiz "/"
edit_keys: .asciiz "ESC menu | ^S gravar  ^X gravar+sair  ^Q sair  ^K corta linha  ^A inicio  ^E fim"
edit_menu: .asciiz " ESC   s gravar   q sair   x gravar e sair   d apagar linha   t topo   b fim "
edit_closed: .asciiz "edit: fechado "
edit_closed_tail: .asciiz ", "
msg_edit_usage: .asciiz "uso: edit FICHEIRO   o ficheiro e criado se nao existir\r\n"

# ---- folha de calculo ----
sheet_title: .asciiz " MARS-OS sheet   "
sheet_cell_label: .asciiz "celula "
sheet_content_label: .asciiz "   conteudo: "
sheet_input_label: .asciiz "valor> "
sheet_keys: .asciiz "setas movem | escreva ou Enter para editar | Bksp limpa | ESC menu | ^S gravar"
sheet_menu: .asciiz " ESC   s gravar   q sair   x gravar e sair   c limpar celula   r recalcular "
sheet_closed: .asciiz "sheet: fechada "
msg_sheet_usage: .asciiz "uso: sheet FICHEIRO   a folha e criada se nao existir\r\n"

# ---- ambiente grafico por rato ----
desktop_start: .asciiz "[ Iniciar ]"
desktop_task: .asciiz "Gestor de Programas MARS-OS"
desktop_icon_terminal: .asciiz "[>_]"
desktop_icon_editor: .asciiz "[A]"
desktop_icon_sheet: .asciiz "[#]"
desktop_icon_basic: .asciiz "[B]"
desktop_icon_about: .asciiz "[?]"
desktop_label_terminal: .asciiz "Terminal"
desktop_label_editor: .asciiz "Editor"
desktop_label_sheet: .asciiz "Folha"
desktop_label_basic: .asciiz "BASIC"
desktop_label_about: .asciiz "Acerca"
desktop_hint: .asciiz "Clique num icone ou Iniciar. Teclas: T terminal, E editor, W folha, B BASIC, Q sair."
desktop_menu_header: .asciiz "| MARS-OS 95             |"
desktop_menu_terminal: .asciiz "| Terminal               |"
desktop_menu_editor: .asciiz "| Editor de texto        |"
desktop_menu_sheet: .asciiz "| Folha de calculo       |"
desktop_menu_basic: .asciiz "| BASIC                  |"
desktop_menu_about: .asciiz "| Acerca                 |"
desktop_menu_exit: .asciiz "| Reiniciar ambiente     |"
desktop_welcome: .asciiz "Bem-vindo ao ambiente MARS-OS controlado por rato."
desktop_welcome_detail: .asciiz "O gestor de janelas e as apps correm integralmente em Assembly MIPS."
desktop_help_text: .asciiz "\r\nambiente grafico\r\n  O MARS-OS arranca no Gestor de Programas; abra Terminal para comandos\r\n  exit | desktop          fecha o Terminal e regressa ao ambiente de trabalho\r\n                         clique em Iniciar, icones, janelas e celulas da folha\r\n"

# ---- imagem do disco no arranque ----
# Cada bloco usa mudancas de linha simples: o disco RAM guarda texto puro
# e e o driver da consola que converte a mudanca de linha em CR mais LF.
rom_readme_name: .asciiz "leiame.txt"
rom_readme_text: .asciiz "O MARS-OS mantem este disco no segmento de dados.\nOs ficheiros aceitam escrita mas sao volateis: ao\nreiniciar a maquina volta a imagem original.\nExperimente: edit notas.txt, depois ls e wc notas.txt.\n"
rom_motd_name: .asciiz "motd"
rom_motd_text: .asciiz "Aprenda a maquina construindo a maquina.\n"
rom_notes_name: .asciiz "notas.txt"
rom_notes_text: .asciiz "ficheiro de rascunho\nabra com: edit notas.txt\nas setas movem, ESC abre o menu\n"
rom_sheet_name: .asciiz "orcamento.sht"
rom_sheet_text: .asciiz "A1:item\nB1:qtd\nC1:preco\nD1:total\nA2:cabo\nB2:3\nC2:12\nD2:=B2*C2\nA3:placa\nB3:2\nC3:45\nD3:=B3*C3\nA5:TOTAL\nD5:=SUM(D2:D3)\n"

rom_basic_name: .asciiz "demo.bas"
rom_basic_text: .asciiz "10 REM QUADRADOS E TOTAL ACUMULADO\n20 PRINT \"N\",\"N*N\",\"TOTAL\"\n30 LET T = 0\n40 FOR I = 1 TO 8\n50 LET T = T + I * I\n60 PRINT I, I * I, T\n70 NEXT I\n80 IF T > 100 THEN PRINT \"TOTAL ELEVADO\"\n90 PRINT \"FIM\"\n100 END\n"

.align 2
rom_table:
  .word rom_readme_name, rom_readme_text
  .word rom_motd_name,   rom_motd_text
  .word rom_notes_name,  rom_notes_text
  .word rom_sheet_name,  rom_sheet_text
  .word rom_basic_name,  rom_basic_text
  .word 0, 0

.include "mips_os_lib.asm"
.include "mips_os_fs.asm"
.include "mips_os_apps.asm"
.include "mips_os_edit.asm"
.include "mips_os_sheet.asm"
.include "mips_os_basic.asm"
.include "mips_os_desktop.asm"
.include "mips_os_kernel.asm"
