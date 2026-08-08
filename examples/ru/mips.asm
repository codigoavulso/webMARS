#MARS-OS 1.0 — полная интерактивная TTY операционная среда
#Откройте «Инструменты» > TTY Устройство + ANSI Терминал, подключитесь к MIPS,
#собрать и запустить; он открывает рабочий стол мыши. Запустите терминал для оболочки.
#
#Этот файл содержит только локализованный текст. Само ядро живет в
#нейтральные к языку модули, включенные внизу:
#mips_os_lib.asm драйвер TTY, элемент управления ANSI, строки, целые числа
#mips_os_fs.asm записываемая файловая система RAM и ее команды
#mips_os_apps.asm калькулятор, баннер, календарь, игры
#mips_os_edit.asm полноэкранный текстовый редактор
#Полноэкранная таблица mips_os_sheet.asm
#mips_os_basic.asm строковый целочисленный интерпретатор BASIC
#mips_os_desktop.asm Диспетчер программ и Windows, управляемый мышью
#mips_os_kernel.asm команды загрузки, оболочки и системы

.data

#---- ботинок ----
banner: .asciiz "+----------------------------------------------------------+\r\n| MARS-OS 1.0 | Interactive TTY environment for MIPS32     |\r\n+----------------------------------------------------------+\r\n"
msg_boot: .asciiz "[ ok ] MMIO console, shell, RAM disk and services online."
msg_disk_ready: .asciiz "[ ok ] RAM disk mounted: "
msg_disk_files: .asciiz " files, "
msg_hint: .asciiz "Starting the desktop. Open Terminal for shell commands."
prompt_user: .asciiz "guest"
prompt_host: .asciiz "@webmars"
prompt_path: .asciiz ":/$ "

#---- имена команд ----
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

#---- помощь и описание ----
help_text: .asciiz "MARS-OS command set\r\n\r\nsystem  help about clear echo sysinfo mem uptime clock date bench\r\n        history color ps pwd reboot shutdown\r\ndisk    ls cat touch rm cp mv write append wc head tail grep sort\r\n        hexdump df\r\napps    basic edit sheet calc base ascii banner fib primes rand sleep\r\n        life guess\r\n\r\nusage\r\n  echo TEXT              write TEXT back to the terminal\r\n  color NAME             prompt colour: green cyan yellow white red\r\n  cat|wc|head|tail FILE  read a file on the RAM disk\r\n  touch|rm FILE          create or delete a file\r\n  cp|mv SOURCE TARGET    copy or rename a file\r\n  write|append FILE TXT  replace or extend a file with one line\r\n  grep TEXT FILE         print every matching line\r\n  sort|hexdump FILE      sorted lines, or a byte dump\r\n  basic [FILE]           line numbered integer BASIC interpreter\r\n  edit FILE              full screen text editor\r\n  sheet FILE             full screen spreadsheet\r\n  calc A OP B            integer maths, OP is + - * / % & | ^ < >\r\n  base N                 the same number in four notations\r\n  banner TEXT            5x5 bitmap letters\r\n  fib N | primes N       sequence generators\r\n  rand N | sleep MS      random integer, cooperative delay\r\n  life [N] | guess       Game of Life, guessing game\r\n"
about_text: .asciiz "MARS-OS is a small teaching kernel written entirely in MIPS assembly. It drives the webMARS TTY over memory mapped I/O and implements cooperative device waits, line editing with history recall, a table driven shell, a writable RAM filesystem, a full screen text editor, a full screen spreadsheet with an integer formula evaluator, and a line numbered BASIC interpreter.\r\n"
msg_unknown: .asciiz "command not found: "

#---- системная отчетность ----
sysinfo_header: .asciiz "kernel: MARS-OS 1.0\r\ncpu: MIPS32 little-endian, JavaScript runtime\r\nconsole: ANSI TTY on MMIO 0xFFFF0000\r\nscheduler: cooperative device waits\r\n"
sysinfo_commands: .asciiz "commands executed: "
sysinfo_installed: .asciiz "commands installed: "
uptime_prefix: .asciiz "uptime: "
clock_time_prefix: .asciiz "clock epoch: "
clock_timer_prefix: .asciiz "counter / period: "
clock_separator: .asciiz " / "
clock_uptime_prefix: .asciiz "clock simulated time: "
clock_device_offline: .asciiz "timer device: inactive (open and connect the System Clock tool for MMIO timing)\r\n"
bench_result_prefix: .asciiz "benchmark: "
bench_ips_suffix: .asciiz " instructions/s"
bench_sample_prefix: .asciiz "sample: "
bench_ms_middle: .asciiz " ms, "
bench_instructions_suffix: .asciiz " instructions"
ms_suffix: .asciiz " ms"
mem_heap: .asciiz "heap limit: "
mem_stack: .asciiz "stack pointer: "
mem_history: .asciiz "history ring: "
mem_disk: .asciiz "ram disk: "
bytes_suffix: .asciiz " bytes"

#---- калькулятор и преобразования ----
result_prefix: .asciiz "result: "
result_hex: .asciiz " ("
result_close: .asciiz ")\r\n"
msg_div_zero: .asciiz "calc: division by zero\r\n"
msg_calc_usage: .asciiz "usage: calc A OP B   example: calc 0x20 + 22\r\n"
base_decimal: .asciiz "decimal:  "
base_hex: .asciiz "hex:      "
base_binary: .asciiz "binary:   "
base_unsigned: .asciiz "unsigned: "
msg_base_usage: .asciiz "usage: base N   example: base 0b1011\r\n"

#---- генераторы и игры ----
msg_rand_usage: .asciiz "usage: rand N   N must be between 1 and 1000000\r\n"
msg_sleep_usage: .asciiz "usage: sleep MS   MS must be between 0 and 10000\r\n"
msg_awake: .asciiz "awake\r\n"
msg_fib_usage: .asciiz "usage: fib N   N must be between 1 and 47\r\n"
msg_primes_usage: .asciiz "usage: primes N   N must be between 2 and 5000\r\n"
msg_banner_usage: .asciiz "usage: banner TEXT   letters, digits and spaces\r\n"
msg_life_usage: .asciiz "usage: life [N]   N generations, between 1 and 200\r\n"
life_header: .asciiz "Game of Life - generation "
life_of: .asciiz " of "
life_done: .asciiz "simulation finished\r\n"
guess_intro: .asciiz "I picked a number between 1 and 100. You have seven tries.\r\n"
guess_prompt: .asciiz "guess> "
guess_higher: .asciiz "higher\r\n"
guess_lower: .asciiz "lower\r\n"
guess_won: .asciiz "correct, in "
guess_tries: .asciiz " tries\r\n"
guess_lost: .asciiz "out of tries. The number was "

#---- история ----
history_separator: .asciiz "  "
msg_history_empty: .asciiz "the history is empty\r\n"

#---- файловая система ----
ls_header: .asciiz "NAME                  SIZE  LINES\r\n"
ls_empty: .asciiz "the disk is empty\r\n"
msg_file_missing: .asciiz "file not found\r\n"
msg_need_name: .asciiz "a file name is required\r\n"
msg_disk_full: .asciiz "the disk is full\r\n"
msg_exists: .asciiz "the target already exists\r\n"
msg_ok: .asciiz "ok\r\n"
msg_copy_usage: .asciiz "usage: cp SOURCE TARGET\r\n"
msg_move_usage: .asciiz "usage: mv SOURCE TARGET\r\n"
msg_write_usage: .asciiz "usage: write FILE TEXT   or   append FILE TEXT\r\n"
msg_grep_usage: .asciiz "usage: grep TEXT FILE\r\n"
grep_separator: .asciiz ": "
wc_lines: .asciiz "lines: "
wc_words: .asciiz "  words: "
wc_bytes: .asciiz "  bytes: "
df_files: .asciiz "files: "
df_of: .asciiz " of "
df_bytes: .asciiz "bytes: "
df_per_file: .asciiz "capacity per file: "

#---- подскажите цвета ----
color_green_name: .asciiz "green"
color_cyan_name: .asciiz "cyan"
color_yellow_name: .asciiz "yellow"
color_white_name: .asciiz "white"
color_red_name: .asciiz "red"
msg_color_usage: .asciiz "usage: color green|cyan|yellow|white|red\r\n"
msg_color_set: .asciiz "prompt colour updated\r\n"

#---- процессы и завершение работы ----
ps_text: .asciiz " PID  STATE   TASK\r\n   1  run     init/shell\r\n   2  wait    tty-rx\r\n   3  ready   tty-tx\r\n   4  idle    ramdisk\r\n"
pwd_text: .asciiz "/\r\n"
msg_shutdown: .asciiz "System halted. It is now safe to reset the simulator.\r\n"

#---- календарь ----
date_prefix: .asciiz "date: "
date_dash: .asciiz "-"
date_colon: .asciiz ":"
date_utc: .asciiz " UTC"
date_days_prefix: .asciiz "days since the epoch: "

#---- BASIC интерпретатор ----
basic_banner: .asciiz "MARS-OS BASIC - 64 program lines, 26 integer variables A..Z\r\nStatements PRINT LET INPUT IF/THEN GOTO GOSUB RETURN FOR/NEXT REM END CLS\r\nCommands   RUN LIST NEW SAVE name LOAD name BYE     Ctrl-C stops a program\r\n"
basic_ready: .asciiz "READY.\r\n"
basic_prompt: .asciiz "] "
basic_bye: .asciiz "basic: back to the shell\r\n"
basic_input_prompt: .asciiz "? "
basic_input_again: .asciiz "?REDO\r\n"
basic_break: .asciiz "BREAK\r\n"
basic_saved: .asciiz "saved to "
basic_loaded: .asciiz "loaded "
basic_loaded_tail: .asciiz " lines"
basic_err_prefix: .asciiz "?"
basic_err_suffix: .asciiz " ERROR"
basic_err_in: .asciiz " ERROR IN "
basic_err_syntax: .asciiz "SYNTAX"
basic_err_line: .asciiz "UNDEFINED LINE"
basic_err_divzero: .asciiz "DIVISION BY ZERO"
basic_err_stack: .asciiz "TOO MANY NESTED"
basic_err_next: .asciiz "NEXT WITHOUT FOR"
basic_err_return: .asciiz "RETURN WITHOUT GOSUB"
basic_err_full: .asciiz "PROGRAM TOO LONG"
msg_basic_usage: .asciiz "usage: basic [FILE]   opens the interpreter, loading FILE when given\r\n"

#---- текстовый редактор ----
edit_title: .asciiz " MARS-OS edit   "
edit_modified: .asciiz "   [modified]"
edit_line_label: .asciiz "line "
edit_col_label: .asciiz "   column "
edit_bytes_label: .asciiz "   bytes "
edit_slash: .asciiz "/"
edit_keys: .asciiz "ESC menu | ^S save  ^X save+exit  ^Q quit  ^K kill line  ^A home  ^E end"
edit_menu: .asciiz " ESC   s save   q quit   x save and exit   d delete line   t top   b bottom "
edit_closed: .asciiz "edit: closed "
edit_closed_tail: .asciiz ", "
msg_edit_usage: .asciiz "usage: edit FILE   the file is created when it does not exist\r\n"

#---- таблица ----
sheet_title: .asciiz " MARS-OS sheet   "
sheet_cell_label: .asciiz "cell "
sheet_content_label: .asciiz "   content: "
sheet_input_label: .asciiz "value> "
sheet_keys: .asciiz "arrows move | type or Enter to edit | Bksp clears | ESC menu | ^S save ^X exit"
sheet_menu: .asciiz " ESC   s save   q quit   x save and exit   c clear cell   r recalculate "
sheet_closed: .asciiz "sheet: closed "
msg_sheet_usage: .asciiz "usage: sheet FILE   the sheet is created when it does not exist\r\n"

#---- рабочий стол в окне ----
#Заголовки строк меню и записи меню. На рабочем столе расположены меню из
#эти строки, поэтому более длинный перевод только делает меню шире.
desktop_start: .asciiz "[ Start ]"
mb_system:   .asciiz "System"
mb_programs: .asciiz "Programs"
mb_windows:  .asciiz "Windows"
mb_help:     .asciiz "Help"
mi_about:      .asciiz "About MARS-OS"
mi_sysinfo:    .asciiz "System information"
mi_memory:     .asciiz "Memory report"
mi_disk:       .asciiz "Disk usage"
mi_restart:    .asciiz "Restart desktop"
mi_shutdown:   .asciiz "Shut down"
mi_terminal:   .asciiz "Terminal"
mi_editor:     .asciiz "Text editor"
mi_sheet:      .asciiz "Spreadsheet"
mi_basic:      .asciiz "BASIC"
mi_utils:      .asciiz "Utilities"
mi_files:      .asciiz "File manager"
mi_commands:   .asciiz "Command list"
mi_edit_notes: .asciiz "Open notes.txt"
mi_edit_new:   .asciiz "New document"
mi_sheet_open: .asciiz "Open budget.sht"
mi_sheet_new:  .asciiz "New spreadsheet"
mi_basic_demo: .asciiz "Open demo.bas"
mi_basic_new:  .asciiz "Empty session"
mi_ascii:      .asciiz "ASCII table"
mi_life:       .asciiz "Game of Life"
mi_guess:      .asciiz "Guess the number"
mi_date:       .asciiz "Calendar clock"
mi_bench:      .asciiz "Benchmark"
mi_banner:     .asciiz "Banner letters"
mi_primes:     .asciiz "Prime numbers"
mi_fib:        .asciiz "Fibonacci"
mi_programs:   .asciiz "Program Manager"
mi_cascade:    .asciiz "Cascade"
mi_tile:       .asciiz "Tile"
mi_close:      .asciiz "Close window"
mi_close_all:  .asciiz "Close all"
mi_keys:       .asciiz "Keyboard and mouse"

#Заголовки окон, индексированные по типу окна.
wt_programs: .asciiz "Program Manager"
wt_about:    .asciiz "About"
wt_files:    .asciiz "File Manager"
wt_commands: .asciiz "Commands"
wt_system:   .asciiz "System"
wt_help:     .asciiz "Help"

files_header:    .asciiz "NAME                 SIZE"
commands_header: .asciiz "CLICK TO RUN"
taskbar_hint:    .asciiz "drag title | drag # to resize"
press_any_key:   .asciiz "-- press any key to return to the desktop --"

sys_line_kernel:  .asciiz "kernel   MARS-OS 1.2"
sys_line_cpu:     .asciiz "cpu      MIPS32 little-endian"
sys_line_console: .asciiz "console  ANSI TTY at 0xFFFF0000"
sys_label_commands: .asciiz "shell commands"
sys_label_files:    .asciiz "files on the disk"
sys_label_bytes:    .asciiz "bytes in use"
sys_label_windows:  .asciiz "open windows"

about_l1: .asciiz "MARS-OS windowed desktop"
about_l2: .asciiz ""
about_l3: .asciiz "The window manager, the compositor and every"
about_l4: .asciiz "application run entirely in MIPS assembly."
about_l5: .asciiz "Windows are drawn into an 80x25 cell buffer"
about_l6: .asciiz "and only changed rows reach the terminal."
about_l7: .asciiz ""
about_l8: .asciiz "Drag a title bar to move, drag # to resize."
.align 2
about_lines: .word about_l1, about_l2, about_l3, about_l4
             .word about_l5, about_l6, about_l7, about_l8, 0

help_l1: .asciiz "Mouse"
help_l2: .asciiz "  menu bar     click a title, then an entry"
help_l3: .asciiz "  windows      click to focus, drag the title to move"
help_l4: .asciiz "  resize       drag the # in the bottom right corner"
help_l5: .asciiz "  close        click [X], or the task bar to switch"
help_l6: .asciiz "  lists        click a row, wheel scrolls"
help_l7: .asciiz "Keyboard"
help_l8: .asciiz "  T E W B      terminal, editor, sheet, BASIC"
help_l9: .asciiz "  F C I A H P  files, commands, system, about, help, programs"
help_l10: .asciiz "  S Tab X Q    Start, next window, close, restart desktop"
.align 2
help_lines: .word help_l1, help_l2, help_l3, help_l4, help_l5
            .word help_l6, help_l7, help_l8, help_l9, help_l10, 0

desktop_help_text: .asciiz "\r\ndesktop\r\n  MARS-OS starts in the windowed desktop; Terminal is one of its programs\r\n  S opens Start; exit | desktop closes Terminal and returns to the desktop\r\n  menus, draggable and resizable windows, bounded tiling and mouse lists\r\n"

#---- образ загрузочного диска ----
#В каждом блоке используются пустые символы новой строки: диск RAM хранит простой текст, а
#Драйвер консоли — это то, что на выходе превращает новую строку в CR плюс LF.
rom_readme_name: .asciiz "readme.txt"
rom_readme_text: .asciiz "MARS-OS keeps this disk inside the data segment.\nFiles are writable but volatile: reset the machine\nand the boot image comes back unchanged.\nTry: edit notes.txt, then ls and wc notes.txt.\n"
rom_motd_name: .asciiz "motd"
rom_motd_text: .asciiz "Learn the machine by building the machine.\n"
rom_notes_name: .asciiz "notes.txt"
rom_notes_text: .asciiz "scratch file\nopen it with: edit notes.txt\narrows move, ESC opens the menu\n"
rom_sheet_name: .asciiz "budget.sht"
rom_sheet_text: .asciiz "A1:item\nB1:qty\nC1:price\nD1:total\nA2:cable\nB2:3\nC2:12\nD2:=B2*C2\nA3:board\nB3:2\nC3:45\nD3:=B3*C3\nA5:TOTAL\nD5:=SUM(D2:D3)\n"

rom_basic_name: .asciiz "demo.bas"
rom_basic_text: .asciiz "10 REM SQUARES AND RUNNING TOTAL\n20 PRINT \"N\",\"N*N\",\"TOTAL\"\n30 LET T = 0\n40 FOR I = 1 TO 8\n50 LET T = T + I * I\n60 PRINT I, I * I, T\n70 NEXT I\n80 IF T > 100 THEN PRINT \"TOTAL IS LARGE\"\n90 PRINT \"DONE\"\n100 END\n"

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
