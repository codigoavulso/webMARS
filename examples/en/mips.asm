# MARS-OS 0.2 - interactive TTY operating environment
# Open Tools > TTY Device + ANSI Terminal, connect to MIPS,
# assemble this project and type "help".

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
banner: .asciiz "+----------------------------------------------------------+\r\n| MARS-OS 0.2 | MIPS32 interactive TTY environment       |\r\n+----------------------------------------------------------+\r\n"
msg_boot: .asciiz "[ ok ] MMIO console, shell and RAM services initialized."
msg_hint: .asciiz "Type help for commands. Input is edited inside the TTY window."
prompt_user: .asciiz "guest"
prompt_host: .asciiz "@webmars"
prompt_path: .asciiz ":/$ "
cmd_help: .asciiz "help"
cmd_about: .asciiz "about"
cmd_clear: .asciiz "clear"
cmd_echo: .asciiz "echo"
cmd_sysinfo: .asciiz "sysinfo"
cmd_mem: .asciiz "mem"
cmd_uptime: .asciiz "uptime"
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
help_text: .asciiz "MARS-OS commands:\r\n  help                 show this command list\r\n  about                describe the example and architecture\r\n  clear                clear the ANSI terminal\r\n  echo TEXT            print text\r\n  sysinfo              kernel, CPU and session information\r\n  mem                  heap, stack and history memory\r\n  uptime               milliseconds since boot\r\n  calc A OP B          signed/hex calculator (+-*/%&|^)\r\n  rand N               random integer in [0,N), N <= 1000000\r\n  sleep MS             cooperative delay, up to 10000 ms\r\n  history              last eight commands\r\n  ls / cat FILE        inspect the built-in read-only RAM disk\r\n  color NAME           prompt: green, cyan, yellow, white, red\r\n  ps / pwd             tasks and current directory\r\n  reboot / shutdown    restart or halt MARS-OS\r\n"
about_text: .asciiz "MARS-OS is a small educational kernel written entirely in MIPS Assembly. It drives the webMARS TTY through MMIO, implements cooperative waits, line editing, command parsing, numeric services, ANSI output, history and a tiny read-only RAM disk.\r\n"
msg_unknown: .asciiz "command not found: "
sysinfo_header: .asciiz "kernel: MARS-OS 0.2\r\ncpu: MIPS32 little-endian, JavaScript runtime\r\nconsole: TTY ANSI at MMIO 0xFFFF0000\r\nscheduler: cooperative device waits\r\n"
sysinfo_commands: .asciiz "commands executed: "
uptime_prefix: .asciiz "uptime: "
ms_suffix: .asciiz " ms"
mem_heap: .asciiz "heap break: "
mem_stack: .asciiz "stack pointer: "
mem_history: .asciiz "history ring: "
bytes_suffix: .asciiz " bytes"
result_prefix: .asciiz "result: "
result_hex: .asciiz " ("
result_close: .asciiz ")\r\n"
msg_div_zero: .asciiz "calc: division by zero\r\n"
msg_calc_usage: .asciiz "usage: calc A OP B   example: calc 0x20 + 22\r\n"
msg_rand_usage: .asciiz "usage: rand N   N must be between 1 and 1000000\r\n"
msg_sleep_usage: .asciiz "usage: sleep MS   MS must be between 0 and 10000\r\n"
msg_awake: .asciiz "awake\r\n"
history_separator: .asciiz "  "
msg_history_empty: .asciiz "history is empty\r\n"
ls_text: .asciiz "readme.txt\r\nmotd\r\ncommands.txt\r\n"
file_readme_name: .asciiz "readme.txt"
file_motd_name: .asciiz "motd"
file_commands_name: .asciiz "commands.txt"
file_readme_text: .asciiz "This RAM disk is compiled into the MARS-OS data segment. Files are read-only, deterministic and available without host filesystem access.\r\n"
file_motd_text: .asciiz "Learn the machine by building the machine.\r\n"
msg_file_missing: .asciiz "cat: file not found\r\n"
color_green_name: .asciiz "green"
color_cyan_name: .asciiz "cyan"
color_yellow_name: .asciiz "yellow"
color_white_name: .asciiz "white"
color_red_name: .asciiz "red"
msg_color_usage: .asciiz "usage: color green|cyan|yellow|white|red\r\n"
msg_color_set: .asciiz "prompt color updated\r\n"
ps_text: .asciiz " PID  STATE  TASK\r\n   1  run    init/shell\r\n   2  wait   tty-rx\r\n   3  ready  tty-tx\r\n"
pwd_text: .asciiz "/\r\n"
msg_shutdown: .asciiz "System halted. It is now safe to reset the simulator.\r\n"
.align 2
boot_time_low: .word 0
command_count: .word 0
history_count: .word 0
prompt_color: .word 0
line_buf: .space 128
history_buf: .space 1024
digit_buf: .space 16
.include "mips_os_kernel.asm"
