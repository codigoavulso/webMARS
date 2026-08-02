# MARS-OS 1.0 - entorno operativo TTY interactivo y completo
# Abre Herramientas > TTY Device + ANSI Terminal, conectala a
# MIPS, ensambla este proyecto y escribe "desktop" para el raton o "help".
#
# Este fichero contiene solo el texto localizado. El kernel vive en
# los modulos neutros incluidos al final:
#   mips_os_lib.asm    driver TTY, control ANSI, cadenas, enteros
#   mips_os_fs.asm     sistema de ficheros RAM y sus comandos
#   mips_os_apps.asm   calculadora, banner, calendario, juegos
#   mips_os_edit.asm   editor de texto a pantalla completa
#   mips_os_sheet.asm  hoja de calculo a pantalla completa
#   mips_os_basic.asm  interprete BASIC de enteros por numero de linea
#   mips_os_desktop.asm Program Manager, raton y ventanas
#   mips_os_kernel.asm arranque, shell y comandos de sistema
#
# Nota: las cadenas usan solo ASCII porque el terminal escribe bytes
# en bruto y un acento en UTF-8 ocuparia dos bytes ilegibles.

.data

# ---- arranque ----
banner: .asciiz "+----------------------------------------------------------+\r\n| MARS-OS 1.0 | Entorno TTY interactivo para MIPS32        |\r\n+----------------------------------------------------------+\r\n"
msg_boot: .asciiz "[ ok ] Consola MMIO, shell, disco RAM y servicios activos."
msg_disk_ready: .asciiz "[ ok ] Disco RAM montado: "
msg_disk_files: .asciiz " ficheros, "
msg_hint: .asciiz "Iniciando el escritorio. Abre Terminal para usar comandos."
prompt_user: .asciiz "invitado"
prompt_host: .asciiz "@webmars"
prompt_path: .asciiz ":/$ "

# ---- nombres de los comandos ----
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

# ---- ayuda y descripcion ----
help_text: .asciiz "Conjunto de comandos de MARS-OS\r\n\r\nsistema  help about clear echo sysinfo mem uptime clock date bench\r\n         history color ps pwd reboot shutdown\r\ndisco    ls cat touch rm cp mv write append wc head tail grep sort\r\n         hexdump df\r\napps     basic edit sheet calc base ascii banner fib primes rand sleep\r\n         life guess\r\n\r\nuso\r\n  echo TEXTO             escribe TEXTO en el terminal\r\n  color NOMBRE           color del prompt: green cyan yellow white red\r\n  cat|wc|head|tail FICH  lee un fichero del disco RAM\r\n  touch|rm FICHERO       crea o borra un fichero\r\n  cp|mv ORIGEN DESTINO   copia o renombra un fichero\r\n  write|append FICH TXT  reemplaza o amplia el fichero con una linea\r\n  grep TEXTO FICHERO     muestra las lineas coincidentes\r\n  sort|hexdump FICHERO   lineas ordenadas, o volcado de bytes\r\n  basic [FICHERO]        interprete BASIC de enteros por numero de linea\r\n  edit FICHERO           editor de texto a pantalla completa\r\n  sheet FICHERO          hoja de calculo a pantalla completa\r\n  calc A OP B            enteros, OP es + - * / % & | ^ < >\r\n  base N                 el mismo numero en cuatro notaciones\r\n  banner TEXTO           letras en bitmap 5x5\r\n  fib N | primes N       generadores de secuencias\r\n  rand N | sleep MS      entero aleatorio, espera cooperativa\r\n  life [N] | guess       Juego de la Vida, juego de adivinanza\r\n"
about_text: .asciiz "MARS-OS es un pequeno kernel educativo escrito integramente en ensamblador MIPS. Controla el TTY de webMARS por MMIO e implementa esperas cooperativas de dispositivo, edicion de linea con historial, una shell dirigida por tabla, un sistema de ficheros RAM con escritura, un editor de texto a pantalla completa, una hoja de calculo con evaluador de formulas enteras y un interprete BASIC con numeros de linea.\r\n"
msg_unknown: .asciiz "comando no encontrado: "

# ---- informes del sistema ----
sysinfo_header: .asciiz "kernel: MARS-OS 1.0\r\ncpu: MIPS32 little-endian, runtime JavaScript\r\nconsola: TTY ANSI en MMIO 0xFFFF0000\r\nscheduler: esperas cooperativas de dispositivos\r\n"
sysinfo_commands: .asciiz "comandos ejecutados: "
sysinfo_installed: .asciiz "comandos instalados: "
uptime_prefix: .asciiz "tiempo activo: "
clock_time_prefix: .asciiz "epoch del reloj: "
clock_timer_prefix: .asciiz "contador / periodo: "
clock_separator: .asciiz " / "
clock_uptime_prefix: .asciiz "tiempo simulado del reloj: "
clock_device_offline: .asciiz "temporizador: inactivo (abre y conecta la tool System Clock para temporizacion MMIO)\r\n"
bench_result_prefix: .asciiz "benchmark: "
bench_ips_suffix: .asciiz " instrucciones/s"
bench_sample_prefix: .asciiz "muestra: "
bench_ms_middle: .asciiz " ms, "
bench_instructions_suffix: .asciiz " instrucciones"
ms_suffix: .asciiz " ms"
mem_heap: .asciiz "limite del heap: "
mem_stack: .asciiz "stack pointer: "
mem_history: .asciiz "anillo de historial: "
mem_disk: .asciiz "disco ram: "
bytes_suffix: .asciiz " bytes"

# ---- calculadora y conversiones ----
result_prefix: .asciiz "resultado: "
result_hex: .asciiz " ("
result_close: .asciiz ")\r\n"
msg_div_zero: .asciiz "calc: division por cero\r\n"
msg_calc_usage: .asciiz "uso: calc A OP B   ejemplo: calc 0x20 + 22\r\n"
base_decimal: .asciiz "decimal:     "
base_hex: .asciiz "hexadecimal: "
base_binary: .asciiz "binario:     "
base_unsigned: .asciiz "sin signo:   "
msg_base_usage: .asciiz "uso: base N   ejemplo: base 0b1011\r\n"

# ---- generadores y juegos ----
msg_rand_usage: .asciiz "uso: rand N   N debe estar entre 1 y 1000000\r\n"
msg_sleep_usage: .asciiz "uso: sleep MS   MS debe estar entre 0 y 10000\r\n"
msg_awake: .asciiz "despierto\r\n"
msg_fib_usage: .asciiz "uso: fib N   N debe estar entre 1 y 47\r\n"
msg_primes_usage: .asciiz "uso: primes N   N debe estar entre 2 y 5000\r\n"
msg_banner_usage: .asciiz "uso: banner TEXTO   letras, digitos y espacios\r\n"
msg_life_usage: .asciiz "uso: life [N]   N generaciones, entre 1 y 200\r\n"
life_header: .asciiz "Juego de la Vida - generacion "
life_of: .asciiz " de "
life_done: .asciiz "simulacion terminada\r\n"
guess_intro: .asciiz "He elegido un numero entre 1 y 100. Tienes siete intentos.\r\n"
guess_prompt: .asciiz "intento> "
guess_higher: .asciiz "mas alto\r\n"
guess_lower: .asciiz "mas bajo\r\n"
guess_won: .asciiz "correcto, en "
guess_tries: .asciiz " intentos\r\n"
guess_lost: .asciiz "sin intentos. El numero era "

# ---- historial ----
history_separator: .asciiz "  "
msg_history_empty: .asciiz "el historial esta vacio\r\n"

# ---- sistema de ficheros ----
ls_header: .asciiz "NOMBRE               TAM.  LINEAS\r\n"
ls_empty: .asciiz "el disco esta vacio\r\n"
msg_file_missing: .asciiz "fichero no encontrado\r\n"
msg_need_name: .asciiz "hace falta un nombre de fichero\r\n"
msg_disk_full: .asciiz "el disco esta lleno\r\n"
msg_exists: .asciiz "el destino ya existe\r\n"
msg_ok: .asciiz "ok\r\n"
msg_copy_usage: .asciiz "uso: cp ORIGEN DESTINO\r\n"
msg_move_usage: .asciiz "uso: mv ORIGEN DESTINO\r\n"
msg_write_usage: .asciiz "uso: write FICHERO TEXTO   o   append FICHERO TEXTO\r\n"
msg_grep_usage: .asciiz "uso: grep TEXTO FICHERO\r\n"
grep_separator: .asciiz ": "
wc_lines: .asciiz "lineas: "
wc_words: .asciiz "  palabras: "
wc_bytes: .asciiz "  bytes: "
df_files: .asciiz "ficheros: "
df_of: .asciiz " de "
df_bytes: .asciiz "bytes: "
df_per_file: .asciiz "capacidad por fichero: "

# ---- colores del prompt ----
color_green_name: .asciiz "green"
color_cyan_name: .asciiz "cyan"
color_yellow_name: .asciiz "yellow"
color_white_name: .asciiz "white"
color_red_name: .asciiz "red"
msg_color_usage: .asciiz "uso: color green|cyan|yellow|white|red\r\n"
msg_color_set: .asciiz "color del prompt actualizado\r\n"

# ---- procesos y apagado ----
ps_text: .asciiz " PID  ESTADO  TAREA\r\n   1  run     init/shell\r\n   2  wait    tty-rx\r\n   3  ready   tty-tx\r\n   4  idle    discoram\r\n"
pwd_text: .asciiz "/\r\n"
msg_shutdown: .asciiz "Sistema detenido. Ya puedes reiniciar el simulador.\r\n"

# ---- calendario ----
date_prefix: .asciiz "fecha: "
date_dash: .asciiz "-"
date_colon: .asciiz ":"
date_utc: .asciiz " UTC"
date_days_prefix: .asciiz "dias desde la epoch: "

# ---- interprete BASIC ----
basic_banner: .asciiz "MARS-OS BASIC - 64 lineas de programa, 26 variables enteras A..Z\r\nSentencias PRINT LET INPUT IF/THEN GOTO GOSUB RETURN FOR/NEXT REM END CLS\r\nComandos   RUN LIST NEW SAVE nombre LOAD nombre BYE   Ctrl-C detiene el programa\r\n"
basic_ready: .asciiz "LISTO.\r\n"
basic_prompt: .asciiz "] "
basic_bye: .asciiz "basic: de vuelta al shell\r\n"
basic_input_prompt: .asciiz "? "
basic_input_again: .asciiz "?REPITE\r\n"
basic_break: .asciiz "INTERRUMPIDO\r\n"
basic_saved: .asciiz "guardado en "
basic_loaded: .asciiz "cargadas "
basic_loaded_tail: .asciiz " lineas"
basic_err_prefix: .asciiz "?ERROR DE "
basic_err_suffix: .asciiz ""
basic_err_in: .asciiz " EN LA LINEA "
basic_err_syntax: .asciiz "SINTAXIS"
basic_err_line: .asciiz "LINEA INEXISTENTE"
basic_err_divzero: .asciiz "DIVISION POR CERO"
basic_err_stack: .asciiz "ANIDAMIENTO EXCESIVO"
basic_err_next: .asciiz "NEXT SIN FOR"
basic_err_return: .asciiz "RETURN SIN GOSUB"
basic_err_full: .asciiz "PROGRAMA DEMASIADO LARGO"
msg_basic_usage: .asciiz "uso: basic [FICHERO]   abre el interprete, cargando FICHERO si se indica\r\n"

# ---- editor de texto ----
edit_title: .asciiz " MARS-OS edit   "
edit_modified: .asciiz "   [modificado]"
edit_line_label: .asciiz "linea "
edit_col_label: .asciiz "   columna "
edit_bytes_label: .asciiz "   bytes "
edit_slash: .asciiz "/"
edit_keys: .asciiz "ESC menu | ^S guardar  ^X guardar+salir  ^Q salir  ^K corta linea  ^A inicio"
edit_menu: .asciiz " ESC   s guardar   q salir   x guardar y salir   d borrar linea   t inicio   b fin "
edit_closed: .asciiz "edit: cerrado "
edit_closed_tail: .asciiz ", "
msg_edit_usage: .asciiz "uso: edit FICHERO   el fichero se crea si no existe\r\n"

# ---- hoja de calculo ----
sheet_title: .asciiz " MARS-OS sheet   "
sheet_cell_label: .asciiz "celda "
sheet_content_label: .asciiz "   contenido: "
sheet_input_label: .asciiz "valor> "
sheet_keys: .asciiz "flechas mueven | escribe o Enter para editar | Bksp limpia | ESC menu | ^S guarda"
sheet_menu: .asciiz " ESC   s guardar   q salir   x guardar y salir   c limpiar celda   r recalcular "
sheet_closed: .asciiz "sheet: cerrada "
msg_sheet_usage: .asciiz "uso: sheet FICHERO   la hoja se crea si no existe\r\n"

# ---- escritorio controlado por raton ----
desktop_start: .asciiz "[ Inicio ]"
desktop_task: .asciiz "Administrador de programas MARS-OS"
desktop_icon_terminal: .asciiz "[>_]"
desktop_icon_editor: .asciiz "[A]"
desktop_icon_sheet: .asciiz "[#]"
desktop_icon_basic: .asciiz "[B]"
desktop_icon_about: .asciiz "[?]"
desktop_label_terminal: .asciiz "Terminal"
desktop_label_editor: .asciiz "Editor"
desktop_label_sheet: .asciiz "Hoja"
desktop_label_basic: .asciiz "BASIC"
desktop_label_about: .asciiz "Acerca"
desktop_hint: .asciiz "Pulse un icono o Inicio. Teclas: T terminal, E editor, W hoja, B BASIC, Q salir."
desktop_menu_header: .asciiz "| MARS-OS 95             |"
desktop_menu_terminal: .asciiz "| Terminal               |"
desktop_menu_editor: .asciiz "| Editor de texto        |"
desktop_menu_sheet: .asciiz "| Hoja de calculo        |"
desktop_menu_basic: .asciiz "| BASIC                  |"
desktop_menu_about: .asciiz "| Acerca                 |"
desktop_menu_exit: .asciiz "| Reiniciar escritorio   |"
desktop_welcome: .asciiz "Bienvenido al escritorio MARS-OS controlado por raton."
desktop_welcome_detail: .asciiz "El gestor de ventanas y las apps se ejecutan enteramente en Assembly MIPS."
desktop_help_text: .asciiz "\r\nescritorio grafico\r\n  MARS-OS arranca en Program Manager; abre Terminal para usar comandos\r\n  exit | desktop          cierra Terminal y vuelve al escritorio\r\n                         pulse Inicio, iconos, ventanas y celdas de la hoja\r\n"

# ---- imagen del disco en el arranque ----
# Cada bloque usa saltos de linea simples: el disco RAM guarda texto plano
# y es el driver de la consola quien convierte el salto en CR mas LF.
rom_readme_name: .asciiz "leeme.txt"
rom_readme_text: .asciiz "MARS-OS mantiene este disco en el segmento de datos.\nLos ficheros admiten escritura pero son volatiles: al\nreiniciar la maquina vuelve la imagen original.\nPrueba: edit notas.txt, luego ls y wc notas.txt.\n"
rom_motd_name: .asciiz "motd"
rom_motd_text: .asciiz "Aprende la maquina construyendo la maquina.\n"
rom_notes_name: .asciiz "notas.txt"
rom_notes_text: .asciiz "fichero de borrador\nabrelo con: edit notas.txt\nlas flechas mueven, ESC abre el menu\n"
rom_sheet_name: .asciiz "presupuesto.sht"
rom_sheet_text: .asciiz "A1:item\nB1:cant\nC1:precio\nD1:total\nA2:cable\nB2:3\nC2:12\nD2:=B2*C2\nA3:placa\nB3:2\nC3:45\nD3:=B3*C3\nA5:TOTAL\nD5:=SUM(D2:D3)\n"

rom_basic_name: .asciiz "demo.bas"
rom_basic_text: .asciiz "10 REM CUADRADOS Y TOTAL ACUMULADO\n20 PRINT \"N\",\"N*N\",\"TOTAL\"\n30 LET T = 0\n40 FOR I = 1 TO 8\n50 LET T = T + I * I\n60 PRINT I, I * I, T\n70 NEXT I\n80 IF T > 100 THEN PRINT \"TOTAL ALTO\"\n90 PRINT \"FIN\"\n100 END\n"

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
