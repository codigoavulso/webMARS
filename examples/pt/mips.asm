# MARS-OS 0.2 - ambiente operativo TTY interativo
# Abra Ferramentas > TTY Device + ANSI Terminal, ligue a MIPS,
# monte este projeto e escreva "help".

.data
ansi_reset:     .byte 27, 99, 0
ansi_clear:     .byte 27, 91, 50, 74, 27, 91, 72, 0
ansi_normal:    .byte 27, 91, 48, 109, 0
ansi_dim:       .byte 27, 91, 50, 109, 0
ansi_bold_cyan: .byte 27, 91, 49, 59, 57, 54, 109, 0
ansi_green:     .byte 27, 91, 57, 50, 109, 0
ansi_cyan:      .byte 27, 91, 57, 54, 109, 0
ansi_yellow:    .byte 27, 91, 57, 51, 109, 0
ansi_white:     .byte 27, 91, 57, 55, 109, 0
ansi_red:       .byte 27, 91, 57, 49, 109, 0
banner: .asciiz "+----------------------------------------------------------+\r\n| MARS-OS 0.2 | Ambiente TTY interativo para MIPS32       |\r\n+----------------------------------------------------------+\r\n"
msg_boot: .asciiz "[ ok ] Consola MMIO, shell e servicos RAM inicializados."
msg_hint: .asciiz "Escreva help para ver os comandos. Introduza texto na janela TTY."
prompt_user: .asciiz "convidado"
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
help_text: .asciiz "Comandos do MARS-OS:\r\n  help                 mostra esta lista\r\n  about                descreve o exemplo e a arquitetura\r\n  clear                limpa o terminal ANSI\r\n  echo TEXTO           escreve texto\r\n  sysinfo              informacao do kernel, CPU e sessao\r\n  mem                  memoria de heap, stack e historico\r\n  uptime               milissegundos desde o arranque\r\n  clock                epoch, uptime e temporizador MMIO opcional\r\n  bench                mede instrucoes MIPS reais por segundo\r\n  calc A OP B          calculadora signed/hex (+-*/%&|^)\r\n  rand N               inteiro aleatorio em [0,N), N <= 1000000\r\n  sleep MS             pausa cooperativa, maximo 10000 ms\r\n  history              ultimos oito comandos\r\n  ls / cat FICHEIRO    inspeciona o disco RAM de leitura\r\n  color NOME           prompt: green, cyan, yellow, white, red\r\n  ps / pwd             tarefas e diretoria atual\r\n  reboot / shutdown    reinicia ou termina o MARS-OS\r\n"
about_text: .asciiz "O MARS-OS e um pequeno kernel educativo escrito integralmente em Assembly MIPS. Controla o TTY do webMARS por MMIO e implementa esperas cooperativas, edicao de linha, comandos, servicos numericos, ANSI, historico e um pequeno disco RAM de leitura.\r\n"
msg_unknown: .asciiz "comando nao encontrado: "
sysinfo_header: .asciiz "kernel: MARS-OS 0.2\r\ncpu: MIPS32 little-endian, runtime JavaScript\r\nconsola: TTY ANSI em MMIO 0xFFFF0000\r\nscheduler: esperas cooperativas de dispositivos\r\n"
sysinfo_commands: .asciiz "comandos executados: "
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
bytes_suffix: .asciiz " bytes"
result_prefix: .asciiz "resultado: "
result_hex: .asciiz " ("
result_close: .asciiz ")\r\n"
msg_div_zero: .asciiz "calc: divisao por zero\r\n"
msg_calc_usage: .asciiz "uso: calc A OP B   exemplo: calc 0x20 + 22\r\n"
msg_rand_usage: .asciiz "uso: rand N   N deve estar entre 1 e 1000000\r\n"
msg_sleep_usage: .asciiz "uso: sleep MS   MS deve estar entre 0 e 10000\r\n"
msg_awake: .asciiz "acordado\r\n"
history_separator: .asciiz "  "
msg_history_empty: .asciiz "o historico esta vazio\r\n"
ls_text: .asciiz "readme.txt\r\nmotd\r\ncommands.txt\r\n"
file_readme_name: .asciiz "readme.txt"
file_motd_name: .asciiz "motd"
file_commands_name: .asciiz "commands.txt"
file_readme_text: .asciiz "Este disco RAM esta compilado no segmento de dados do MARS-OS. Os ficheiros sao deterministas, apenas de leitura e nao precisam do sistema de ficheiros do host.\r\n"
file_motd_text: .asciiz "Aprenda a maquina construindo a maquina.\r\n"
msg_file_missing: .asciiz "cat: ficheiro nao encontrado\r\n"
color_green_name: .asciiz "green"
color_cyan_name: .asciiz "cyan"
color_yellow_name: .asciiz "yellow"
color_white_name: .asciiz "white"
color_red_name: .asciiz "red"
msg_color_usage: .asciiz "uso: color green|cyan|yellow|white|red\r\n"
msg_color_set: .asciiz "cor do prompt atualizada\r\n"
ps_text: .asciiz " PID  ESTADO  TAREFA\r\n   1  run     init/shell\r\n   2  wait    tty-rx\r\n   3  ready   tty-tx\r\n"
pwd_text: .asciiz "/\r\n"
msg_shutdown: .asciiz "Sistema terminado. Pode agora reiniciar o simulador.\r\n"
.align 2
boot_time_low: .word 0
command_count: .word 0
history_count: .word 0
prompt_color: .word 0
line_buf: .space 128
history_buf: .space 1024
digit_buf: .space 16
.include "mips_os_kernel.asm"
