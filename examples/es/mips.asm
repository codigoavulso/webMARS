# MARS-OS 0.2 - entorno operativo TTY interactivo
# Abre Herramientas > TTY Device + ANSI Terminal, conectala a
# MIPS, ensambla este proyecto y escribe "help".

.data
ansi_reset:     .byte 27, 99, 0   # las secuencias de escape son bytes normales enviados al terminal
ansi_clear:     .byte 27, 91, 50, 74, 27, 91, 72, 0   # 27 es ESC: lo que sigue es comando, no texto
ansi_normal:    .byte 27, 91, 48, 109, 0
ansi_dim:       .byte 27, 91, 50, 109, 0
ansi_bold_cyan: .byte 27, 91, 49, 59, 57, 54, 109, 0   # el color se elige por número dentro de la secuencia
ansi_green:     .byte 27, 91, 57, 50, 109, 0
ansi_cyan:      .byte 27, 91, 57, 54, 109, 0
ansi_yellow:    .byte 27, 91, 57, 51, 109, 0
ansi_white:     .byte 27, 91, 57, 55, 109, 0
ansi_red:       .byte 27, 91, 57, 49, 109, 0
banner: .asciiz "+----------------------------------------------------------+\r\n| MARS-OS 0.2 | Entorno TTY interactivo para MIPS32       |\r\n+----------------------------------------------------------+\r\n"
msg_boot: .asciiz "[ ok ] Consola MMIO, shell y servicios RAM inicializados."
msg_hint: .asciiz "Escribe help para ver los comandos. Introduce texto en la ventana TTY."
prompt_user: .asciiz "invitado"
prompt_host: .asciiz "@webmars"
prompt_path: .asciiz ":/$ "
cmd_help: .asciiz "help"
cmd_about: .asciiz "about"
cmd_clear: .asciiz "clear"
cmd_echo: .asciiz "echo"
cmd_sysinfo: .asciiz "sysinfo"
cmd_mem: .asciiz "mem"
cmd_uptime: .asciiz "uptime"
cmd_clock: .asciiz "clock"
cmd_bench: .asciiz "bench"
cmd_calc: .asciiz "calc"
cmd_rand: .asciiz "rand"
cmd_sleep: .asciiz "sleep"
cmd_history: .asciiz "history"
cmd_ls: .asciiz "ls"
cmd_cat: .asciiz "cat"
cmd_color: .asciiz "color"
cmd_ps: .asciiz "ps"
cmd_pwd: .asciiz "pwd"
cmd_reboot: .asciiz "reboot"
cmd_shutdown: .asciiz "shutdown"
help_text: .asciiz "Comandos de MARS-OS:\r\n  help                 muestra esta lista\r\n  about                describe el ejemplo y la arquitectura\r\n  clear                limpia el terminal ANSI\r\n  echo TEXTO           imprime texto\r\n  sysinfo              informacion del kernel, CPU y sesion\r\n  mem                  memoria de heap, stack e historial\r\n  uptime               milisegundos desde el arranque\r\n  clock                epoch, uptime y temporizador MMIO opcional\r\n  bench                mide instrucciones MIPS reales por segundo\r\n  calc A OP B          calculadora signed/hex (+-*/%&|^)\r\n  rand N               entero aleatorio en [0,N), N <= 1000000\r\n  sleep MS             pausa cooperativa, maximo 10000 ms\r\n  history              ultimos ocho comandos\r\n  ls / cat ARCHIVO     inspecciona el disco RAM de solo lectura\r\n  color NOMBRE         prompt: green, cyan, yellow, white, red\r\n  ps / pwd             tareas y directorio actual\r\n  reboot / shutdown    reinicia o detiene MARS-OS\r\n"
about_text: .asciiz "MARS-OS es un pequeno kernel educativo escrito integramente en Assembly MIPS. Controla el TTY de webMARS mediante MMIO e implementa esperas cooperativas, edicion de linea, comandos, servicios numericos, ANSI, historial y un pequeno disco RAM de solo lectura.\r\n"
msg_unknown: .asciiz "comando no encontrado: "
sysinfo_header: .asciiz "kernel: MARS-OS 0.2\r\ncpu: MIPS32 little-endian, runtime JavaScript\r\nconsola: TTY ANSI en MMIO 0xFFFF0000\r\nplanificador: esperas cooperativas de dispositivos\r\n"
sysinfo_commands: .asciiz "comandos ejecutados: "
uptime_prefix: .asciiz "tiempo activo: "
clock_time_prefix: .asciiz "epoch del reloj: "
clock_timer_prefix: .asciiz "contador / periodo: "
clock_separator: .asciiz " / "
clock_uptime_prefix: .asciiz "tiempo simulado del reloj: "
clock_device_offline: .asciiz "temporizador: inactivo (abra y conecte la tool System Clock para temporizacion MMIO)\r\n"
bench_result_prefix: .asciiz "benchmark: "
bench_ips_suffix: .asciiz " instrucciones/s"
bench_sample_prefix: .asciiz "muestra: "
bench_ms_middle: .asciiz " ms, "
bench_instructions_suffix: .asciiz " instrucciones"
ms_suffix: .asciiz " ms"
mem_heap: .asciiz "limite del heap: "
mem_stack: .asciiz "puntero del stack: "
mem_history: .asciiz "anillo de historial: "
bytes_suffix: .asciiz " bytes"
result_prefix: .asciiz "resultado: "
result_hex: .asciiz " ("
result_close: .asciiz ")\r\n"
msg_div_zero: .asciiz "calc: division por cero\r\n"
msg_calc_usage: .asciiz "uso: calc A OP B   ejemplo: calc 0x20 + 22\r\n"
msg_rand_usage: .asciiz "uso: rand N   N debe estar entre 1 y 1000000\r\n"
msg_sleep_usage: .asciiz "uso: sleep MS   MS debe estar entre 0 y 10000\r\n"
msg_awake: .asciiz "activo\r\n"
history_separator: .asciiz "  "
msg_history_empty: .asciiz "el historial esta vacio\r\n"
ls_text: .asciiz "readme.txt\r\nmotd\r\ncommands.txt\r\n"
file_readme_name: .asciiz "readme.txt"
file_motd_name: .asciiz "motd"
file_commands_name: .asciiz "commands.txt"
file_readme_text: .asciiz "Este disco RAM esta compilado en el segmento de datos de MARS-OS. Los archivos son deterministas, de solo lectura y no necesitan acceso al sistema de archivos del host.\r\n"
file_motd_text: .asciiz "Aprende la maquina construyendo la maquina.\r\n"
msg_file_missing: .asciiz "cat: archivo no encontrado\r\n"
color_green_name: .asciiz "green"
color_cyan_name: .asciiz "cyan"
color_yellow_name: .asciiz "yellow"
color_white_name: .asciiz "white"
color_red_name: .asciiz "red"
msg_color_usage: .asciiz "uso: color green|cyan|yellow|white|red\r\n"
msg_color_set: .asciiz "color del prompt actualizado\r\n"
ps_text: .asciiz " PID  ESTADO  TAREA\r\n   1  run     init/shell\r\n   2  wait    tty-rx\r\n   3  ready   tty-tx\r\n"
pwd_text: .asciiz "/\r\n"
msg_shutdown: .asciiz "Sistema detenido. Ya puedes reiniciar el simulador.\r\n"
.align 2
boot_time_low: .word 0
command_count: .word 0
history_count: .word 0
prompt_color: .word 0
line_buf: .space 128
history_buf: .space 1024
digit_buf: .space 16
.include "mips_os_kernel.asm"
