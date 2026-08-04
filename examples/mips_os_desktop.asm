# ============================================================
# MARS-OS 1.2 - windowed desktop with a text mode compositor
#
# The previous desktop painted straight at the terminal, so two
# overlapping windows simply corrupted each other. Everything now
# renders into an 80x25 cell back buffer of characters plus colour
# attributes; only rows that actually changed are flushed to the
# TTY. Overlap, z-order, dragging and resizing all become ordinary
# buffer writes, and a clip rectangle keeps window content from
# bleeding past its own frame.
#
# Layout
#   row 1      menu bar with pull down menus and one level of submenus
#   rows 2-24  desktop, windows float here
#   row 25     task bar, one button per open window
#
# Mouse: DECSET 1002 gives press, release and drag motion as SGR
# reports, which is what a title bar drag and a corner resize need.
# ============================================================

.eqv SCR_COLS   80
.eqv SCR_ROWS   25
.eqv DESK_TOP   2
.eqv DESK_BOTTOM 24

.eqv ATTR_DESK    0
.eqv ATTR_WIN     1
.eqv ATTR_TITLE   2
.eqv ATTR_TITLEI  3
.eqv ATTR_MENU    4
.eqv ATTR_HILITE  5
.eqv ATTR_SHADOW  6
.eqv ATTR_ACCENT  7

.eqv WIN_MAX    6
.eqv WIN_MIN_W  22
.eqv WIN_MIN_H  6

.eqv WK_FREE     0
.eqv WK_PROGRAMS 1
.eqv WK_ABOUT    2
.eqv WK_FILES    3
.eqv WK_COMMANDS 4
.eqv WK_SYSTEM   5
.eqv WK_HELP     6
.eqv WK_COUNT    7

.eqv ACT_NONE      0
.eqv ACT_TERMINAL  1
.eqv ACT_EDITOR    2
.eqv ACT_SHEET     3
.eqv ACT_BASIC     4
.eqv ACT_ABOUT     5
.eqv ACT_FILES     6
.eqv ACT_COMMANDS  7
.eqv ACT_SYSTEM    8
.eqv ACT_HELP      9
.eqv ACT_PROGRAMS  10
.eqv ACT_CLOSE     11
.eqv ACT_CASCADE   12
.eqv ACT_TILE      13
.eqv ACT_CLOSE_ALL 14
.eqv ACT_SHUTDOWN  15
.eqv ACT_RESTART   16
.eqv ACT_EDIT_NEW  17
.eqv ACT_SHEET_NEW 18
.eqv ACT_BASIC_NEW 19
.eqv ACT_ASCII     20
.eqv ACT_LIFE      21
.eqv ACT_GUESS     22
.eqv ACT_DATE      23
.eqv ACT_BENCH     24
.eqv ACT_BANNER    25
.eqv ACT_PRIMES    26
.eqv ACT_FIB       27
.eqv ACT_MEMORY    28
.eqv ACT_DISK      29

.data
.align 2

# ---- compositor ----
scr_char:   .space 2000       # SCR_COLS * SCR_ROWS
scr_attr:   .space 2000
scr_pchar:  .space 2000       # last frame, for row level diffing
scr_pattr:  .space 2000
scr_full:   .word 1           # force a complete flush
clip_r0:    .word 1
clip_c0:    .word 1
clip_r1:    .word 25
clip_c1:    .word 80

# Colour attributes. Index order must match the ATTR_ constants.
attr_table: .word sgr_desk, sgr_win, sgr_title, sgr_titlei
            .word sgr_menu, sgr_hilite, sgr_shadow, sgr_accent
sgr_desk:   .byte 27
            .ascii "[0;37;44m"
            .byte 0
sgr_win:    .byte 27
            .ascii "[0;30;47m"
            .byte 0
sgr_title:  .byte 27
            .ascii "[0;1;97;44m"
            .byte 0
sgr_titlei: .byte 27
            .ascii "[0;1;30;47m"
            .byte 0
sgr_menu:   .byte 27
            .ascii "[0;30;47m"
            .byte 0
sgr_hilite: .byte 27
            .ascii "[0;1;97;44m"
            .byte 0
sgr_shadow: .byte 27
            .ascii "[0;90;40m"
            .byte 0
sgr_accent: .byte 27
            .ascii "[0;1;31;47m"
            .byte 0

desktop_hide_cur: .byte 27
                  .ascii "[?25l"
                  .byte 0
desktop_show_cur: .byte 27
                  .ascii "[?25h"
                  .byte 0

# ---- window table ----
.align 2
win_kind:   .space 24         # WIN_MAX words
win_row:    .space 24
win_col:    .space 24
win_w:      .space 24
win_h:      .space 24
win_scroll: .space 24
win_order:  .space 24         # open window ids, front-most last
win_open:   .word 0

drag_mode:  .word 0           # 0 idle, 1 move, 2 resize
drag_win:   .word 0
drag_dr:    .word 0
drag_dc:    .word 0

menu_open:  .word -1          # index into menu_bar, -1 when closed
menu_sub:   .word -1          # index of the item whose submenu is open
menu_item:  .word -1          # highlighted entry
menu_hot:   .word -1          # entry whose submenu is open
menu_start: .word 0           # root is anchored above the Start button
menu_xs:    .space 32         # first column of each menu title
desk_run:   .word 1
desk_dirty: .word 1
desk_arg:     .word 0
desk_handler: .word 0
ext_bas:      .asciiz ".bas"
ext_sht:      .asciiz ".sht"
win_close_box: .asciiz "[X]"
ic_terminal:  .asciiz "[>_]"
ic_editor:    .asciiz "[A ]"
ic_sheet:     .asciiz "[##]"
ic_basic:     .asciiz "[10]"
ic_files:     .asciiz "[==]"
ic_command:   .asciiz "[$ ]"
scratch_name: .asciiz "scratch.txt"
scratch_sheet: .asciiz "new.sht"
arg_life:   .asciiz "18"
arg_primes: .asciiz "120"
arg_fib:    .asciiz "16"
arg_banner: .asciiz "MARS OS"
desktop_empty: .byte 0

# ---- menu structure ----
# Bar entry: label, item table. Item: label, action, submenu.
.align 2
menu_bar:
  .word mb_system,   items_system
  .word mb_programs, items_programs
  .word mb_windows,  items_windows
  .word mb_help,     items_help
  .word 0, 0

items_system:
  .word mi_about,     ACT_ABOUT,     0
  .word mi_sysinfo,   ACT_SYSTEM,    0
  .word mi_memory,    ACT_MEMORY,    0
  .word mi_disk,      ACT_DISK,      0
  .word mi_restart,   ACT_RESTART,   0
  .word mi_shutdown,  ACT_SHUTDOWN,  0
  .word 0, 0, 0

items_programs:
  .word mi_terminal,  ACT_TERMINAL,  0
  .word mi_editor,    ACT_NONE,      items_editor
  .word mi_sheet,     ACT_NONE,      items_sheet
  .word mi_basic,     ACT_NONE,      items_basic
  .word mi_utils,     ACT_NONE,      items_utils
  .word mi_files,     ACT_FILES,     0
  .word mi_commands,  ACT_COMMANDS,  0
  .word 0, 0, 0

items_editor:
  .word mi_edit_notes,  ACT_EDITOR,    0
  .word mi_edit_new,    ACT_EDIT_NEW,  0
  .word 0, 0, 0

items_sheet:
  .word mi_sheet_open,  ACT_SHEET,     0
  .word mi_sheet_new,   ACT_SHEET_NEW, 0
  .word 0, 0, 0

items_basic:
  .word mi_basic_demo,  ACT_BASIC,     0
  .word mi_basic_new,   ACT_BASIC_NEW, 0
  .word 0, 0, 0

items_utils:
  .word mi_ascii,   ACT_ASCII,   0
  .word mi_life,    ACT_LIFE,    0
  .word mi_guess,   ACT_GUESS,   0
  .word mi_date,    ACT_DATE,    0
  .word mi_bench,   ACT_BENCH,   0
  .word mi_banner,  ACT_BANNER,  0
  .word mi_primes,  ACT_PRIMES,  0
  .word mi_fib,     ACT_FIB,     0
  .word 0, 0, 0

items_windows:
  .word mi_programs,   ACT_PROGRAMS,  0
  .word mi_files,      ACT_FILES,     0
  .word mi_sysinfo,    ACT_SYSTEM,    0
  .word mi_cascade,    ACT_CASCADE,   0
  .word mi_tile,       ACT_TILE,      0
  .word mi_close,      ACT_CLOSE,     0
  .word mi_close_all,  ACT_CLOSE_ALL, 0
  .word 0, 0, 0

items_help:
  .word mi_commands,   ACT_COMMANDS,  0
  .word mi_keys,       ACT_HELP,      0
  .word mi_about,      ACT_ABOUT,     0
  .word 0, 0, 0

# Program Manager icons: glyph, label, action.
icon_table:
  .word ic_terminal, mi_terminal,  ACT_TERMINAL
  .word ic_editor,   mi_editor,    ACT_EDITOR
  .word ic_sheet,    mi_sheet,     ACT_SHEET
  .word ic_basic,    mi_basic,     ACT_BASIC
  .word ic_files,    mi_files,     ACT_FILES
  .word ic_command,  mi_commands,  ACT_COMMANDS
  .word 0, 0, 0

# Window titles indexed by kind.
title_table: .word desktop_empty, wt_programs, wt_about, wt_files
             .word wt_commands, wt_system, wt_help

.text

# ------------------------------------------------------------
# Compositor primitives
#
# Every painter writes into scr_char and scr_attr. Nothing reaches
# the terminal until scr_flush runs, which is what makes overlap
# and z-order behave.
# ------------------------------------------------------------

scr_reset_clip:
  li    $t0, 1
  sw    $t0, clip_r0
  sw    $t0, clip_c0
  li    $t0, SCR_ROWS
  sw    $t0, clip_r1
  li    $t0, SCR_COLS
  sw    $t0, clip_c1
  jr    $ra
  nop

# a0 = top row, a1 = left column, a2 = bottom row, a3 = right column
scr_set_clip:
  # Intersect every caller-provided rectangle with the physical framebuffer.
  # Windows may be dragged or resized at the edge; an unchecked clip would let
  # the tight fill/text loops write beyond the two 2000-byte screen buffers.
  li    $t0, 1
  slt   $t1, $a2, $t0
  bne   $t1, $zero, scr_set_clip_empty
  nop
  li    $t0, SCR_ROWS
  slt   $t1, $t0, $a0
  bne   $t1, $zero, scr_set_clip_empty
  nop
  li    $t0, 1
  slt   $t1, $a3, $t0
  bne   $t1, $zero, scr_set_clip_empty
  nop
  li    $t0, SCR_COLS
  slt   $t1, $t0, $a1
  bne   $t1, $zero, scr_set_clip_empty
  nop

  li    $t0, 1
  slt   $t1, $a0, $t0
  beq   $t1, $zero, scr_set_clip_top_max
  nop
  move  $a0, $t0
scr_set_clip_top_max:
  li    $t0, SCR_ROWS
  slt   $t1, $t0, $a0
  beq   $t1, $zero, scr_set_clip_bottom_min
  nop
  move  $a0, $t0
scr_set_clip_bottom_min:
  li    $t0, 1
  slt   $t1, $a2, $t0
  beq   $t1, $zero, scr_set_clip_bottom_max
  nop
  move  $a2, $t0
scr_set_clip_bottom_max:
  li    $t0, SCR_ROWS
  slt   $t1, $t0, $a2
  beq   $t1, $zero, scr_set_clip_left_min
  nop
  move  $a2, $t0
scr_set_clip_left_min:
  li    $t0, 1
  slt   $t1, $a1, $t0
  beq   $t1, $zero, scr_set_clip_left_max
  nop
  move  $a1, $t0
scr_set_clip_left_max:
  li    $t0, SCR_COLS
  slt   $t1, $t0, $a1
  beq   $t1, $zero, scr_set_clip_right_min
  nop
  move  $a1, $t0
scr_set_clip_right_min:
  li    $t0, 1
  slt   $t1, $a3, $t0
  beq   $t1, $zero, scr_set_clip_right_max
  nop
  move  $a3, $t0
scr_set_clip_right_max:
  li    $t0, SCR_COLS
  slt   $t1, $t0, $a3
  beq   $t1, $zero, scr_set_clip_order
  nop
  move  $a3, $t0
scr_set_clip_order:
  slt   $t1, $a2, $a0
  bne   $t1, $zero, scr_set_clip_empty
  nop
  slt   $t1, $a3, $a1
  bne   $t1, $zero, scr_set_clip_empty
  nop
  sw    $a0, clip_r0
  sw    $a1, clip_c0
  sw    $a2, clip_r1
  sw    $a3, clip_c1
  jr    $ra
  nop

scr_set_clip_empty:
  li    $t0, 1
  sw    $t0, clip_r0
  sw    $t0, clip_c0
  sw    $zero, clip_r1
  sw    $zero, clip_c1
  jr    $ra
  nop

# a0 = row, a1 = column, a2 = character, a3 = attribute
scr_put:
  lw    $t0, clip_r0
  slt   $t1, $a0, $t0
  bne   $t1, $zero, scr_put_done
  nop
  lw    $t0, clip_r1
  slt   $t1, $t0, $a0
  bne   $t1, $zero, scr_put_done
  nop
  lw    $t0, clip_c0
  slt   $t1, $a1, $t0
  bne   $t1, $zero, scr_put_done
  nop
  lw    $t0, clip_c1
  slt   $t1, $t0, $a1
  bne   $t1, $zero, scr_put_done
  nop
  addiu $t2, $a0, -1
  li    $t3, SCR_COLS
  mul   $t2, $t2, $t3
  addiu $t3, $a1, -1
  addu  $t2, $t2, $t3
  la    $t4, scr_char
  addu  $t4, $t4, $t2
  sb    $a2, 0($t4)
  la    $t4, scr_attr
  addu  $t4, $t4, $t2
  sb    $a3, 0($t4)
scr_put_done:
  jr    $ra
  nop

# a0 = row, a1 = column, a2 = width, a3 = height, t8 = character, t9 = attribute
# Clamped once against the clip box, then written with a tight inner loop:
# routing every cell through scr_put made a full frame cost megainstructions.
scr_fill:
  blez  $a2, scr_fill_done
  nop
  blez  $a3, scr_fill_done
  nop
  lw    $t0, clip_r0
  move  $t1, $a0
  slt   $t2, $t1, $t0
  beq   $t2, $zero, scr_fill_row_end
  nop
  move  $t1, $t0                # first row
scr_fill_row_end:
  addu  $t2, $a0, $a3
  addiu $t2, $t2, -1
  lw    $t3, clip_r1
  slt   $t4, $t3, $t2
  beq   $t4, $zero, scr_fill_col_start
  nop
  move  $t2, $t3                # last row
scr_fill_col_start:
  lw    $t0, clip_c0
  move  $t3, $a1
  slt   $t4, $t3, $t0
  beq   $t4, $zero, scr_fill_col_end
  nop
  move  $t3, $t0                # first column
scr_fill_col_end:
  addu  $t4, $a1, $a2
  addiu $t4, $t4, -1
  lw    $t5, clip_c1
  slt   $t6, $t5, $t4
  beq   $t6, $zero, scr_fill_rows
  nop
  move  $t4, $t5                # last column
scr_fill_rows:
  slt   $t5, $t2, $t1
  bne   $t5, $zero, scr_fill_done
  nop
  slt   $t5, $t4, $t3
  bne   $t5, $zero, scr_fill_done
  nop
  addiu $t5, $t1, -1
  li    $t6, SCR_COLS
  mul   $t5, $t5, $t6
  addiu $t6, $t3, -1
  addu  $t5, $t5, $t6           # first cell of the clipped span
  la    $t6, scr_char
  addu  $t6, $t6, $t5
  la    $t7, scr_attr
  addu  $t7, $t7, $t5
  subu  $t5, $t4, $t3
  addiu $t5, $t5, 1             # cells in the span
scr_fill_span:
  blez  $t5, scr_fill_next
  nop
  sb    $t8, 0($t6)
  sb    $t9, 0($t7)
  addiu $t6, $t6, 1
  addiu $t7, $t7, 1
  addiu $t5, $t5, -1
  b     scr_fill_span
  nop
scr_fill_next:
  addiu $t1, $t1, 1
  b     scr_fill_rows
  nop
scr_fill_done:
  jr    $ra
  nop
# a0 = row, a1 = column, a2 = string, a3 = attribute
scr_text:
  lw    $t0, clip_r0
  slt   $t1, $a0, $t0
  bne   $t1, $zero, scr_text_done
  nop
  lw    $t0, clip_r1
  slt   $t1, $t0, $a0
  bne   $t1, $zero, scr_text_done
  nop
  addiu $t0, $a0, -1
  li    $t1, SCR_COLS
  mul   $t0, $t0, $t1           # row base
  lw    $t6, clip_c0
  lw    $t7, clip_c1
  move  $t1, $a1                # current column
scr_text_loop:
  lbu   $t2, 0($a2)
  beq   $t2, $zero, scr_text_done
  nop
  slt   $t3, $t7, $t1
  bne   $t3, $zero, scr_text_done
  nop
  slt   $t3, $t1, $t6
  bne   $t3, $zero, scr_text_skip
  nop
  addiu $t3, $t1, -1
  addu  $t3, $t0, $t3
  la    $t4, scr_char
  addu  $t4, $t4, $t3
  sb    $t2, 0($t4)
  la    $t4, scr_attr
  addu  $t4, $t4, $t3
  sb    $a3, 0($t4)
scr_text_skip:
  addiu $a2, $a2, 1
  addiu $t1, $t1, 1
  b     scr_text_loop
  nop
scr_text_done:
  jr    $ra
  nop
scr_uint:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  move  $s4, $a0
  move  $s5, $a1
  move  $s7, $a3
  la    $a0, scratch_buf
  move  $a1, $a2
  jal   uint_to_text
  nop
  move  $s6, $v0
  # uint_to_text reports a length and leaves no terminator, so a shorter
  # number would otherwise inherit digits from the previous one.
  la    $t0, scratch_buf
  addu  $t0, $t0, $v0
  sb    $zero, 0($t0)
  move  $a0, $s4
  move  $a1, $s5
  la    $a2, scratch_buf
  move  $a3, $s7
  jal   scr_text
  nop
  move  $v0, $s6
  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# a0 = attribute: paints the whole buffer with spaces.
# a0 = attribute: paints the whole buffer with spaces.
scr_clear:
  la    $t0, scr_char
  la    $t1, scr_attr
  li    $t2, 2000
  li    $t3, ' '
scr_clear_loop:
  blez  $t2, scr_clear_done
  nop
  sb    $t3, 0($t0)
  sb    $a0, 0($t1)
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  addiu $t2, $t2, -1
  b     scr_clear_loop
  nop
scr_clear_done:
  jr    $ra
  nop
scr_flush:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s3, $zero              # row index, zero based
scr_flush_rows:
  li    $t0, SCR_ROWS
  beq   $s3, $t0, scr_flush_done
  nop
  li    $t0, SCR_COLS
  mul   $s4, $s3, $t0           # first cell of the row
  lw    $t0, scr_full
  bne   $t0, $zero, scr_flush_row
  nop
  move  $a0, $s4
  jal   scr_row_changed
  nop
  beq   $v0, $zero, scr_flush_next
  nop
scr_flush_row:
  addiu $a0, $s3, 1
  li    $a1, 1
  jal   ansi_goto
  nop
  li    $s6, -1                 # attribute currently selected
  move  $s5, $zero
scr_flush_cols:
  li    $t0, SCR_COLS
  beq   $s5, $t0, scr_flush_next
  nop
  addu  $t1, $s4, $s5
  la    $t2, scr_attr
  addu  $t2, $t2, $t1
  lbu   $s7, 0($t2)
  beq   $s7, $s6, scr_flush_char
  nop
  move  $s6, $s7
  sll   $t3, $s7, 2
  la    $t4, attr_table
  addu  $t4, $t4, $t3
  lw    $a0, 0($t4)
  jal   tty_puts
  nop
scr_flush_char:
  addu  $t1, $s4, $s5
  la    $t2, scr_char
  addu  $t2, $t2, $t1
  lbu   $a0, 0($t2)
  jal   tty_putc
  nop
  addiu $s5, $s5, 1
  b     scr_flush_cols
  nop
scr_flush_next:
  addiu $s3, $s3, 1
  b     scr_flush_rows
  nop
scr_flush_done:
  # The frame just drawn becomes the comparison baseline.
  la    $a0, scr_pchar
  la    $a1, scr_char
  li    $a2, 2000
  jal   mem_move
  nop
  la    $a0, scr_pattr
  la    $a1, scr_attr
  li    $a2, 2000
  jal   mem_move
  nop
  sw    $zero, scr_full
  la    $a0, esc_normal
  jal   tty_puts
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# a0 = first cell of a row. v0 = 1 when the row differs from last frame.
scr_row_changed:
  move  $t0, $a0
  li    $t1, SCR_COLS
  la    $t2, scr_char
  addu  $t2, $t2, $t0
  la    $t3, scr_pchar
  addu  $t3, $t3, $t0
  la    $t4, scr_attr
  addu  $t4, $t4, $t0
  la    $t5, scr_pattr
  addu  $t5, $t5, $t0
scr_row_changed_loop:
  blez  $t1, scr_row_changed_same
  nop
  lbu   $t6, 0($t2)
  lbu   $t7, 0($t3)
  bne   $t6, $t7, scr_row_changed_diff
  nop
  lbu   $t6, 0($t4)
  lbu   $t7, 0($t5)
  bne   $t6, $t7, scr_row_changed_diff
  nop
  addiu $t2, $t2, 1
  addiu $t3, $t3, 1
  addiu $t4, $t4, 1
  addiu $t5, $t5, 1
  addiu $t1, $t1, -1
  b     scr_row_changed_loop
  nop
scr_row_changed_diff:
  li    $v0, 1
  jr    $ra
  nop
scr_row_changed_same:
  move  $v0, $zero
  jr    $ra
  nop

# ------------------------------------------------------------
# Window table access
# ------------------------------------------------------------

# a0 = window id, a1 = field base pointer in v0
win_field:
  sll   $t0, $a0, 2
  addu  $v0, $a1, $t0
  jr    $ra
  nop

# a0 = id. v0 = value. Separate helpers keep the call sites readable.
win_get_kind:
  sll   $t0, $a0, 2
  la    $t1, win_kind
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop
win_get_row:
  sll   $t0, $a0, 2
  la    $t1, win_row
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop
win_get_col:
  sll   $t0, $a0, 2
  la    $t1, win_col
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop
win_get_w:
  sll   $t0, $a0, 2
  la    $t1, win_w
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop
win_get_h:
  sll   $t0, $a0, 2
  la    $t1, win_h
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop
win_get_scroll:
  sll   $t0, $a0, 2
  la    $t1, win_scroll
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop

# a0 = window id. v0 = largest useful scroll offset. Only list windows scroll;
# all other window kinds deliberately return zero.
win_max_scroll:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s4, $a0
  move  $s5, $zero             # item count
  jal   win_get_kind
  nop
  li    $t0, WK_FILES
  beq   $v0, $t0, win_max_scroll_files
  nop
  li    $t0, WK_COMMANDS
  beq   $v0, $t0, win_max_scroll_commands
  nop
  b     win_max_scroll_visible
  nop
win_max_scroll_files:
  move  $s6, $zero
win_max_scroll_files_loop:
  li    $t0, FS_MAX_FILES
  beq   $s6, $t0, win_max_scroll_visible
  nop
  move  $a0, $s6
  jal   fs_slot_used
  nop
  beq   $v0, $zero, win_max_scroll_files_next
  nop
  addiu $s5, $s5, 1
win_max_scroll_files_next:
  addiu $s6, $s6, 1
  b     win_max_scroll_files_loop
  nop
win_max_scroll_commands:
  la    $s6, command_table
win_max_scroll_commands_loop:
  lw    $t0, 0($s6)
  beq   $t0, $zero, win_max_scroll_visible
  nop
  addiu $s5, $s5, 1
  addiu $s6, $s6, 8
  b     win_max_scroll_commands_loop
  nop
win_max_scroll_visible:
  move  $a0, $s4
  jal   win_get_h
  nop
  addiu $t0, $v0, -3           # title, header and bottom border
  bgtz  $t0, win_max_scroll_subtract
  nop
  li    $t0, 1
win_max_scroll_subtract:
  subu  $v0, $s5, $t0
  bgez  $v0, win_max_scroll_done
  nop
  move  $v0, $zero
win_max_scroll_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# a0 = id, a1 = value
win_set_row:
  sll   $t0, $a0, 2
  la    $t1, win_row
  addu  $t1, $t1, $t0
  sw    $a1, 0($t1)
  jr    $ra
  nop
win_set_col:
  sll   $t0, $a0, 2
  la    $t1, win_col
  addu  $t1, $t1, $t0
  sw    $a1, 0($t1)
  jr    $ra
  nop
win_set_w:
  sll   $t0, $a0, 2
  la    $t1, win_w
  addu  $t1, $t1, $t0
  sw    $a1, 0($t1)
  jr    $ra
  nop
win_set_h:
  sll   $t0, $a0, 2
  la    $t1, win_h
  addu  $t1, $t1, $t0
  sw    $a1, 0($t1)
  jr    $ra
  nop
win_set_scroll:
  sll   $t0, $a0, 2
  la    $t1, win_scroll
  addu  $t1, $t1, $t0
  sw    $a1, 0($t1)
  jr    $ra
  nop

# a0 = order slot, v0 = window id
win_at:
  sll   $t0, $a0, 2
  la    $t1, win_order
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop

# v0 = focused window id, or -1 when nothing is open
win_focused:
  lw    $t0, win_open
  blez  $t0, win_focused_none
  nop
  addiu $t0, $t0, -1
  sll   $t0, $t0, 2
  la    $t1, win_order
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop
win_focused_none:
  li    $v0, -1
  jr    $ra
  nop

# a0 = kind. v0 = window id or -1.
win_find_kind:
  lw    $t0, win_open
  move  $t1, $zero
win_find_kind_loop:
  slt   $t2, $t1, $t0
  beq   $t2, $zero, win_find_kind_none
  nop
  sll   $t3, $t1, 2
  la    $t4, win_order
  addu  $t4, $t4, $t3
  lw    $v0, 0($t4)
  sll   $t3, $v0, 2
  la    $t4, win_kind
  addu  $t4, $t4, $t3
  lw    $t5, 0($t4)
  beq   $t5, $a0, win_find_kind_done
  nop
  addiu $t1, $t1, 1
  b     win_find_kind_loop
  nop
win_find_kind_none:
  li    $v0, -1
win_find_kind_done:
  jr    $ra
  nop

# a0 = window id: move it to the front of the z-order.
win_raise:
  lw    $t0, win_open
  move  $t1, $zero
win_raise_find:
  slt   $t2, $t1, $t0
  beq   $t2, $zero, win_raise_done
  nop
  sll   $t3, $t1, 2
  la    $t4, win_order
  addu  $t4, $t4, $t3
  lw    $t5, 0($t4)
  beq   $t5, $a0, win_raise_shift
  nop
  addiu $t1, $t1, 1
  b     win_raise_find
  nop
win_raise_shift:
  addiu $t2, $t0, -1
win_raise_shift_loop:
  slt   $t3, $t1, $t2
  beq   $t3, $zero, win_raise_place
  nop
  sll   $t4, $t1, 2
  la    $t5, win_order
  addu  $t5, $t5, $t4
  lw    $t6, 4($t5)
  sw    $t6, 0($t5)
  addiu $t1, $t1, 1
  b     win_raise_shift_loop
  nop
win_raise_place:
  sll   $t4, $t2, 2
  la    $t5, win_order
  addu  $t5, $t5, $t4
  sw    $a0, 0($t5)
win_raise_done:
  jr    $ra
  nop

# a0 = kind, a1 = row, a2 = column, a3 = width, t8 = height.
# Opens the window, or raises it when that kind is already on screen.
win_open_kind:
  addiu $sp, $sp, -28
  sw    $ra, 24($sp)
  sw    $s2, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s2, $a0
  move  $s3, $a1
  move  $s4, $a2
  move  $s5, $a3
  move  $s6, $t8
  move  $a0, $s2
  jal   win_find_kind
  nop
  bltz  $v0, win_open_kind_new
  nop
  move  $a0, $v0
  jal   win_raise
  nop
  b     win_open_kind_done
  nop
win_open_kind_new:
  # Find a free slot; when the desk is full, recycle the oldest window.
  move  $s7, $zero
win_open_kind_slot:
  li    $t0, WIN_MAX
  beq   $s7, $t0, win_open_kind_recycle
  nop
  sll   $t1, $s7, 2
  la    $t2, win_kind
  addu  $t2, $t2, $t1
  lw    $t3, 0($t2)
  beq   $t3, $zero, win_open_kind_claim
  nop
  addiu $s7, $s7, 1
  b     win_open_kind_slot
  nop
win_open_kind_recycle:
  move  $a0, $zero
  jal   win_at
  nop
  move  $a0, $v0
  jal   win_close
  nop
  move  $s7, $v0
win_open_kind_claim:
  sll   $t1, $s7, 2
  la    $t2, win_kind
  addu  $t2, $t2, $t1
  sw    $s2, 0($t2)
  move  $a0, $s7
  move  $a1, $s3
  jal   win_set_row
  nop
  move  $a0, $s7
  move  $a1, $s4
  jal   win_set_col
  nop
  move  $a0, $s7
  move  $a1, $s5
  jal   win_set_w
  nop
  move  $a0, $s7
  move  $a1, $s6
  jal   win_set_h
  nop
  move  $a0, $s7
  move  $a1, $zero
  jal   win_set_scroll
  nop
  lw    $t0, win_open
  sll   $t1, $t0, 2
  la    $t2, win_order
  addu  $t2, $t2, $t1
  sw    $s7, 0($t2)
  addiu $t0, $t0, 1
  sw    $t0, win_open
win_open_kind_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $s2, 20($sp)
  lw    $ra, 24($sp)
  addiu $sp, $sp, 28
  jr    $ra
  nop

# a0 = window id. v0 = the freed slot.
win_close:
  move  $t8, $a0
  sll   $t0, $a0, 2
  la    $t1, win_kind
  addu  $t1, $t1, $t0
  sw    $zero, 0($t1)
  lw    $t0, win_open
  move  $t1, $zero
win_close_find:
  slt   $t2, $t1, $t0
  beq   $t2, $zero, win_close_done
  nop
  sll   $t3, $t1, 2
  la    $t4, win_order
  addu  $t4, $t4, $t3
  lw    $t5, 0($t4)
  beq   $t5, $t8, win_close_remove
  nop
  addiu $t1, $t1, 1
  b     win_close_find
  nop
win_close_remove:
  addiu $t2, $t0, -1
win_close_shift:
  slt   $t3, $t1, $t2
  beq   $t3, $zero, win_close_shrink
  nop
  sll   $t4, $t1, 2
  la    $t5, win_order
  addu  $t5, $t5, $t4
  lw    $t6, 4($t5)
  sw    $t6, 0($t5)
  addiu $t1, $t1, 1
  b     win_close_shift
  nop
win_close_shrink:
  addiu $t0, $t0, -1
  sw    $t0, win_open
win_close_done:
  move  $v0, $t8
  jr    $ra
  nop

# a0 = row, a1 = column. v0 = topmost window id at that cell, or -1.
win_at_point:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s4, $a0
  move  $s5, $a1
  lw    $s6, win_open
  addiu $s6, $s6, -1
win_at_point_loop:
  bltz  $s6, win_at_point_none
  nop
  move  $a0, $s6
  jal   win_at
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   win_get_row
  nop
  slt   $t0, $s4, $v0
  bne   $t0, $zero, win_at_point_next
  nop
  move  $t8, $v0
  move  $a0, $s7
  jal   win_get_h
  nop
  addu  $t1, $t8, $v0
  slt   $t0, $s4, $t1
  beq   $t0, $zero, win_at_point_next
  nop
  move  $a0, $s7
  jal   win_get_col
  nop
  slt   $t0, $s5, $v0
  bne   $t0, $zero, win_at_point_next
  nop
  move  $t8, $v0
  move  $a0, $s7
  jal   win_get_w
  nop
  addu  $t1, $t8, $v0
  slt   $t0, $s5, $t1
  beq   $t0, $zero, win_at_point_next
  nop
  move  $v0, $s7
  b     win_at_point_done
  nop
win_at_point_next:
  addiu $s6, $s6, -1
  b     win_at_point_loop
  nop
win_at_point_none:
  li    $v0, -1
win_at_point_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# ------------------------------------------------------------
# Window painting
# ------------------------------------------------------------

# a0 = window id, a1 = 1 when the window has focus
win_paint:
  addiu $sp, $sp, -32
  sw    $ra, 28($sp)
  sw    $s2, 24($sp)
  sw    $s3, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  move  $s2, $a0
  move  $s3, $a1
  move  $a0, $s2
  jal   win_get_row
  nop
  move  $s4, $v0
  move  $a0, $s2
  jal   win_get_col
  nop
  move  $s5, $v0
  move  $a0, $s2
  jal   win_get_w
  nop
  move  $s6, $v0
  move  $a0, $s2
  jal   win_get_h
  nop
  move  $s7, $v0

  # Drop shadow first so the frame paints over its own top-left.
  addiu $a0, $s4, 1
  addiu $a1, $s5, 1
  move  $a2, $s6
  move  $a3, $s7
  li    $t8, ' '
  li    $t9, ATTR_SHADOW
  jal   scr_shadow
  nop

  # Body.
  move  $a0, $s4
  move  $a1, $s5
  move  $a2, $s6
  move  $a3, $s7
  li    $t8, ' '
  li    $t9, ATTR_WIN
  jal   scr_fill
  nop

  # Border.
  move  $a0, $s4
  move  $a1, $s5
  move  $a2, $s6
  move  $a3, $s7
  jal   scr_border
  nop

  # Title bar spans the inside of the top border.
  move  $a0, $s4
  addiu $a1, $s5, 1
  addiu $a2, $s6, -2
  li    $a3, 1
  li    $t8, ' '
  li    $t9, ATTR_TITLE
  beq   $s3, $zero, win_paint_title_inactive
  nop
  b     win_paint_title_fill
  nop
win_paint_title_inactive:
  li    $t9, ATTR_TITLEI
win_paint_title_fill:
  jal   scr_fill
  nop
  # Keep translated or long titles out of the close box. The clip is restored
  # before painting the rest of the frame and body.
  move  $a0, $s4
  addiu $a1, $s5, 2
  move  $a2, $s4
  addu  $a3, $s5, $s6
  addiu $a3, $a3, -5
  jal   scr_set_clip
  nop
  move  $a0, $s2
  jal   win_title
  nop
  move  $a2, $v0
  move  $a0, $s4
  addiu $a1, $s5, 2
  li    $a3, ATTR_TITLE
  bne   $s3, $zero, win_paint_title_text
  nop
  li    $a3, ATTR_TITLEI
win_paint_title_text:
  jal   scr_text
  nop
  jal   scr_reset_clip
  nop
  # Close box at the right end of the title bar.
  move  $a0, $s4
  addu  $a1, $s5, $s6
  addiu $a1, $a1, -4
  la    $a2, win_close_box
  li    $a3, ATTR_ACCENT
  jal   scr_text
  nop
  # Resize grip in the bottom right corner.
  addu  $a0, $s4, $s7
  addiu $a0, $a0, -1
  addu  $a1, $s5, $s6
  addiu $a1, $a1, -1
  li    $a2, '#'
  li    $a3, ATTR_ACCENT
  jal   scr_put
  nop

  # Content is clipped to the inside of the frame.
  addiu $a0, $s4, 1
  addiu $a1, $s5, 1
  addu  $a2, $s4, $s7
  addiu $a2, $a2, -2
  addu  $a3, $s5, $s6
  addiu $a3, $a3, -2
  jal   scr_set_clip
  nop
  move  $a0, $s2
  jal   win_paint_body
  nop
  jal   scr_reset_clip
  nop

  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $s3, 20($sp)
  lw    $s2, 24($sp)
  lw    $ra, 28($sp)
  addiu $sp, $sp, 32
  jr    $ra
  nop

# a0 = window id, v0 = title string
win_title:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   win_get_kind
  nop
  sll   $t0, $v0, 2
  la    $t1, title_table
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# a0 = row, a1 = column, a2 = width, a3 = height
scr_border:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s3, $a0
  move  $s4, $a1
  move  $s5, $a2
  move  $s6, $a3
  # Two horizontal runs and two vertical runs, then the four corners.
  move  $a0, $s3
  move  $a1, $s4
  move  $a2, $s5
  li    $a3, 1
  li    $t8, '-'
  li    $t9, ATTR_WIN
  jal   scr_fill
  nop
  addu  $a0, $s3, $s6
  addiu $a0, $a0, -1
  move  $a1, $s4
  move  $a2, $s5
  li    $a3, 1
  li    $t8, '-'
  li    $t9, ATTR_WIN
  jal   scr_fill
  nop
  move  $a0, $s3
  move  $a1, $s4
  li    $a2, 1
  move  $a3, $s6
  li    $t8, '|'
  li    $t9, ATTR_WIN
  jal   scr_fill
  nop
  move  $a0, $s3
  addu  $a1, $s4, $s5
  addiu $a1, $a1, -1
  li    $a2, 1
  move  $a3, $s6
  li    $t8, '|'
  li    $t9, ATTR_WIN
  jal   scr_fill
  nop
  move  $a0, $s3
  move  $a1, $s4
  li    $a2, '+'
  li    $a3, ATTR_WIN
  jal   scr_put
  nop
  move  $a0, $s3
  addu  $a1, $s4, $s5
  addiu $a1, $a1, -1
  li    $a2, '+'
  li    $a3, ATTR_WIN
  jal   scr_put
  nop
  addu  $a0, $s3, $s6
  addiu $a0, $a0, -1
  move  $a1, $s4
  li    $a2, '+'
  li    $a3, ATTR_WIN
  jal   scr_put
  nop
  addu  $a0, $s3, $s6
  addiu $a0, $a0, -1
  addu  $a1, $s4, $s5
  addiu $a1, $a1, -1
  li    $a2, '+'
  li    $a3, ATTR_WIN
  jal   scr_put
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# Drop shadow: recolours a rectangle and leaves its characters alone, so
# whatever the shadow falls on stays readable instead of being blanked.
# a0 = row, a1 = column, a2 = width, a3 = height
scr_shadow:
  blez  $a2, scr_shadow_done
  nop
  blez  $a3, scr_shadow_done
  nop
  lw    $t0, clip_r0
  move  $t1, $a0
  slt   $t2, $t1, $t0
  beq   $t2, $zero, scr_shadow_row_end
  nop
  move  $t1, $t0
scr_shadow_row_end:
  addu  $t2, $a0, $a3
  addiu $t2, $t2, -1
  lw    $t3, clip_r1
  slt   $t4, $t3, $t2
  beq   $t4, $zero, scr_shadow_col_start
  nop
  move  $t2, $t3
scr_shadow_col_start:
  lw    $t0, clip_c0
  move  $t3, $a1
  slt   $t4, $t3, $t0
  beq   $t4, $zero, scr_shadow_col_end
  nop
  move  $t3, $t0
scr_shadow_col_end:
  addu  $t4, $a1, $a2
  addiu $t4, $t4, -1
  lw    $t5, clip_c1
  slt   $t6, $t5, $t4
  beq   $t6, $zero, scr_shadow_rows
  nop
  move  $t4, $t5
scr_shadow_rows:
  slt   $t5, $t2, $t1
  bne   $t5, $zero, scr_shadow_done
  nop
  slt   $t5, $t4, $t3
  bne   $t5, $zero, scr_shadow_done
  nop
  addiu $t5, $t1, -1
  li    $t6, SCR_COLS
  mul   $t5, $t5, $t6
  addiu $t6, $t3, -1
  addu  $t5, $t5, $t6
  la    $t7, scr_attr
  addu  $t7, $t7, $t5
  subu  $t5, $t4, $t3
  addiu $t5, $t5, 1
  li    $t8, ATTR_SHADOW
scr_shadow_span:
  blez  $t5, scr_shadow_next
  nop
  sb    $t8, 0($t7)
  addiu $t7, $t7, 1
  addiu $t5, $t5, -1
  b     scr_shadow_span
  nop
scr_shadow_next:
  addiu $t1, $t1, 1
  b     scr_shadow_rows
  nop
scr_shadow_done:
  jr    $ra
  nop
# ------------------------------------------------------------
# Window content
# ------------------------------------------------------------

# a0 = window id. The clip rectangle is already the window interior.
win_paint_body:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s6, $a0
  jal   win_get_kind
  nop
  move  $s7, $v0
  li    $t0, WK_PROGRAMS
  bne   $s7, $t0, win_body_about
  nop
  move  $a0, $s6
  jal   paint_programs
  nop
  b     win_paint_body_done
  nop
win_body_about:
  li    $t0, WK_ABOUT
  bne   $s7, $t0, win_body_files
  nop
  move  $a0, $s6
  jal   paint_about
  nop
  b     win_paint_body_done
  nop
win_body_files:
  li    $t0, WK_FILES
  bne   $s7, $t0, win_body_commands
  nop
  move  $a0, $s6
  jal   paint_files
  nop
  b     win_paint_body_done
  nop
win_body_commands:
  li    $t0, WK_COMMANDS
  bne   $s7, $t0, win_body_system
  nop
  move  $a0, $s6
  jal   paint_commands
  nop
  b     win_paint_body_done
  nop
win_body_system:
  li    $t0, WK_SYSTEM
  bne   $s7, $t0, win_body_help
  nop
  move  $a0, $s6
  jal   paint_system
  nop
  b     win_paint_body_done
  nop
win_body_help:
  li    $t0, WK_HELP
  bne   $s7, $t0, win_paint_body_done
  nop
  move  $a0, $s6
  jal   paint_help
  nop
win_paint_body_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# Program Manager: a grid of launcher icons, three per row.
paint_programs:
  addiu $sp, $sp, -32
  sw    $ra, 28($sp)
  sw    $s2, 24($sp)
  sw    $s3, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  move  $s2, $a0
  jal   win_get_row
  nop
  addiu $s3, $v0, 2           # first icon row
  move  $a0, $s2
  jal   win_get_col
  nop
  addiu $s4, $v0, 3           # first icon column
  move  $s5, $zero
  la    $s6, icon_table
paint_programs_loop:
  lw    $t0, 0($s6)
  beq   $t0, $zero, paint_programs_done
  nop
  move  $a0, $s5
  jal   icon_origin
  nop
  move  $s7, $v0              # row offset
  sw    $v1, 0($sp)           # column offset
  addu  $a0, $s3, $s7
  lw    $t1, 0($sp)
  addu  $a1, $s4, $t1
  addiu $a1, $a1, 2
  lw    $a2, 0($s6)
  li    $a3, ATTR_ACCENT
  jal   scr_text
  nop
  addu  $a0, $s3, $s7
  addiu $a0, $a0, 1
  lw    $t1, 0($sp)
  addu  $a1, $s4, $t1
  lw    $a2, 4($s6)
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  addiu $s6, $s6, 12
  addiu $s5, $s5, 1
  b     paint_programs_loop
  nop
paint_programs_done:
  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $s3, 20($sp)
  lw    $s2, 24($sp)
  lw    $ra, 28($sp)
  addiu $sp, $sp, 32
  jr    $ra
  nop

# a0 = icon index. v0 = row offset, v1 = column offset.
icon_origin:
  li    $t0, 3
  divu  $a0, $t0
  mflo  $t1
  mfhi  $t2
  li    $t3, 4
  mul   $v0, $t1, $t3
  li    $t3, 17
  mul   $v1, $t2, $t3
  jr    $ra
  nop

# a0 = window id, a1 = table of string pointers ending with zero
paint_lines:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  move  $s6, $a1
  move  $s4, $a0
  jal   win_get_row
  nop
  addiu $s5, $v0, 2
  move  $a0, $s4
  jal   win_get_col
  nop
  addiu $s4, $v0, 2
  move  $s7, $zero
paint_lines_loop:
  lw    $a2, 0($s6)
  beq   $a2, $zero, paint_lines_done
  nop
  addu  $a0, $s5, $s7
  move  $a1, $s4
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  addiu $s6, $s6, 4
  addiu $s7, $s7, 1
  b     paint_lines_loop
  nop
paint_lines_done:
  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

paint_about:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a1, about_lines
  jal   paint_lines
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

paint_help:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a1, help_lines
  jal   paint_lines
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# File manager: the RAM disk, one row per file, scrollable.
paint_files:
  addiu $sp, $sp, -32
  sw    $ra, 28($sp)
  sw    $s1, 24($sp)
  sw    $s2, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s2, $a0
  jal   win_get_row
  nop
  addiu $s3, $v0, 1
  move  $a0, $s2
  jal   win_get_col
  nop
  addiu $s4, $v0, 2
  move  $a0, $s2
  jal   win_get_h
  nop
  addiu $s5, $v0, -3          # rows available under the header

  move  $a0, $s3
  move  $a1, $s4
  la    $a2, files_header
  li    $a3, ATTR_ACCENT
  jal   scr_text
  nop

  move  $a0, $s2
  jal   win_get_scroll
  nop
  move  $s1, $v0
  move  $s6, $zero            # disk slot
  move  $s7, $zero            # visible row
paint_files_loop:
  li    $t0, FS_MAX_FILES
  beq   $s6, $t0, paint_files_done
  nop
  slt   $t0, $s7, $s5
  beq   $t0, $zero, paint_files_done
  nop
  move  $a0, $s6
  jal   fs_slot_used
  nop
  beq   $v0, $zero, paint_files_next
  nop
  bgtz  $s1, paint_files_skip
  nop
  move  $a0, $s6
  jal   fs_name_ptr
  nop
  move  $a2, $v0
  addu  $a0, $s3, $s7
  addiu $a0, $a0, 1
  move  $a1, $s4
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  move  $a0, $s6
  jal   fs_size
  nop
  move  $a2, $v0
  addu  $a0, $s3, $s7
  addiu $a0, $a0, 1
  addiu $a1, $s4, 22
  li    $a3, ATTR_WIN
  jal   scr_uint
  nop
  addiu $s7, $s7, 1
  b     paint_files_next
  nop
paint_files_skip:
  addiu $s1, $s1, -1
paint_files_next:
  addiu $s6, $s6, 1
  b     paint_files_loop
  nop
paint_files_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $s2, 20($sp)
  lw    $s1, 24($sp)
  lw    $ra, 28($sp)
  addiu $sp, $sp, 32
  jr    $ra
  nop

# Command browser: every verb the shell knows, read straight from
# the kernel dispatch table so the window cannot drift out of date.
paint_commands:
  addiu $sp, $sp, -32
  sw    $ra, 28($sp)
  sw    $s1, 24($sp)
  sw    $s2, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s2, $a0
  jal   win_get_row
  nop
  addiu $s3, $v0, 1
  move  $a0, $s2
  jal   win_get_col
  nop
  addiu $s4, $v0, 2
  move  $a0, $s2
  jal   win_get_h
  nop
  addiu $s5, $v0, -3

  move  $a0, $s3
  move  $a1, $s4
  la    $a2, commands_header
  li    $a3, ATTR_ACCENT
  jal   scr_text
  nop

  move  $a0, $s2
  jal   win_get_scroll
  nop
  move  $s1, $v0
  la    $s6, command_table
  move  $s7, $zero
paint_commands_loop:
  lw    $t0, 0($s6)
  beq   $t0, $zero, paint_commands_done
  nop
  slt   $t0, $s7, $s5
  beq   $t0, $zero, paint_commands_done
  nop
  bgtz  $s1, paint_commands_skip
  nop
  lw    $a2, 0($s6)
  addu  $a0, $s3, $s7
  addiu $a0, $a0, 1
  move  $a1, $s4
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  addiu $s7, $s7, 1
  b     paint_commands_next
  nop
paint_commands_skip:
  addiu $s1, $s1, -1
paint_commands_next:
  addiu $s6, $s6, 8
  b     paint_commands_loop
  nop
paint_commands_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $s2, 20($sp)
  lw    $s1, 24($sp)
  lw    $ra, 28($sp)
  addiu $sp, $sp, 32
  jr    $ra
  nop

paint_system:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  move  $s4, $a0
  jal   win_get_row
  nop
  addiu $s5, $v0, 2
  move  $a0, $s4
  jal   win_get_col
  nop
  addiu $s6, $v0, 2

  move  $a0, $s5
  move  $a1, $s6
  la    $a2, sys_line_kernel
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  addiu $a0, $s5, 1
  move  $a1, $s6
  la    $a2, sys_line_cpu
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  addiu $a0, $s5, 2
  move  $a1, $s6
  la    $a2, sys_line_console
  li    $a3, ATTR_WIN
  jal   scr_text
  nop

  addiu $a0, $s5, 4
  move  $a1, $s6
  la    $a2, sys_label_commands
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  jal   command_table_size
  nop
  move  $a2, $v0
  addiu $a0, $s5, 4
  addiu $a1, $s6, 22
  li    $a3, ATTR_ACCENT
  jal   scr_uint
  nop

  jal   fs_usage
  nop
  move  $s7, $v1
  sw    $v0, 0($sp)
  addiu $a0, $s5, 5
  move  $a1, $s6
  la    $a2, sys_label_files
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  lw    $a2, 0($sp)
  addiu $a0, $s5, 5
  addiu $a1, $s6, 22
  li    $a3, ATTR_ACCENT
  jal   scr_uint
  nop
  addiu $a0, $s5, 6
  move  $a1, $s6
  la    $a2, sys_label_bytes
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  move  $a2, $s7
  addiu $a0, $s5, 6
  addiu $a1, $s6, 22
  li    $a3, ATTR_ACCENT
  jal   scr_uint
  nop

  addiu $a0, $s5, 7
  move  $a1, $s6
  la    $a2, sys_label_windows
  li    $a3, ATTR_WIN
  jal   scr_text
  nop
  lw    $a2, win_open
  addiu $a0, $s5, 7
  addiu $a1, $s6, 22
  li    $a3, ATTR_ACCENT
  jal   scr_uint
  nop

  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# ------------------------------------------------------------
# Menu geometry
#
# Layout is computed from the tables in both the painter and the
# hit tester, so a new menu entry needs no coordinate bookkeeping.
# ------------------------------------------------------------

# a0 = item table. v0 = number of entries.
menu_count:
  move  $v0, $zero
  move  $t0, $a0
menu_count_loop:
  lw    $t1, 0($t0)
  beq   $t1, $zero, menu_count_done
  nop
  addiu $v0, $v0, 1
  addiu $t0, $t0, 12
  b     menu_count_loop
  nop
menu_count_done:
  jr    $ra
  nop

# a0 = item table, a1 = index. v0 = entry pointer.
menu_entry:
  li    $t0, 12
  mul   $t0, $a1, $t0
  addu  $v0, $a0, $t0
  jr    $ra
  nop

# a0 = item table. v0 = dropdown width including borders.
menu_width:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s6, $a0
  move  $s7, $zero
menu_width_loop:
  lw    $a0, 0($s6)
  beq   $a0, $zero, menu_width_done
  nop
  jal   str_len
  nop
  slt   $t0, $s7, $v0
  beq   $t0, $zero, menu_width_next
  nop
  move  $s7, $v0
menu_width_next:
  addiu $s6, $s6, 12
  b     menu_width_loop
  nop
menu_width_done:
  addiu $v0, $s7, 6
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# a0 = bar index. v0 = item table pointer.
menu_items_of:
  sll   $t0, $a0, 3
  la    $t1, menu_bar
  addu  $t1, $t1, $t0
  lw    $v0, 4($t1)
  jr    $ra
  nop

# Lays out the menu bar and records where each title starts.
paint_menubar:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  li    $a0, 1
  li    $a1, 1
  li    $a2, SCR_COLS
  li    $a3, 1
  li    $t8, ' '
  li    $t9, ATTR_MENU
  jal   scr_fill
  nop
  move  $s4, $zero            # bar index
  li    $s5, 2                # current column
  la    $s6, menu_bar
paint_menubar_loop:
  lw    $a0, 0($s6)
  beq   $a0, $zero, paint_menubar_done
  nop
  sll   $t0, $s4, 2
  la    $t1, menu_xs
  addu  $t1, $t1, $t0
  sw    $s5, 0($t1)
  jal   str_len
  nop
  move  $s7, $v0
  lw    $t0, menu_open
  li    $a3, ATTR_MENU
  lw    $t1, menu_start
  bne   $t1, $zero, paint_menubar_draw
  nop
  bne   $t0, $s4, paint_menubar_draw
  nop
  li    $a3, ATTR_HILITE
paint_menubar_draw:
  move  $t9, $a3
  li    $a0, 1
  addiu $a1, $s5, -1
  addiu $a2, $s7, 2
  li    $a3, 1
  li    $t8, ' '
  sw    $t9, 0($sp)
  jal   scr_fill
  nop
  li    $a0, 1
  move  $a1, $s5
  lw    $a2, 0($s6)
  lw    $a3, 0($sp)
  jal   scr_text
  nop
  addu  $s5, $s5, $s7
  addiu $s5, $s5, 3
  addiu $s6, $s6, 8
  addiu $s4, $s4, 1
  b     paint_menubar_loop
  nop
paint_menubar_done:
  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# a0 = item table, a1 = top row, a2 = left column,
# a3 = index of the highlighted entry, t8 = index whose submenu is open
paint_dropdown:
  addiu $sp, $sp, -48
  sw    $ra, 44($sp)
  sw    $s1, 40($sp)
  sw    $s2, 36($sp)
  sw    $s3, 32($sp)
  sw    $s4, 28($sp)
  sw    $s5, 24($sp)
  sw    $s6, 20($sp)
  sw    $s7, 16($sp)
  move  $s1, $a0
  move  $s2, $a1
  move  $s3, $a2
  move  $s4, $a3
  move  $s5, $t8
  move  $a0, $s1
  jal   menu_count
  nop
  move  $s6, $v0
  move  $a0, $s1
  jal   menu_width
  nop
  move  $s7, $v0

  addiu $a0, $s2, 1
  addiu $a1, $s3, 1
  move  $a2, $s7
  addiu $a3, $s6, 2
  jal   scr_shadow
  nop
  move  $a0, $s2
  move  $a1, $s3
  move  $a2, $s7
  addiu $a3, $s6, 2
  li    $t8, ' '
  li    $t9, ATTR_WIN
  jal   scr_fill
  nop
  move  $a0, $s2
  move  $a1, $s3
  move  $a2, $s7
  addiu $a3, $s6, 2
  jal   scr_border
  nop

  move  $t9, $zero
paint_dropdown_items:
  slt   $t0, $t9, $s6
  beq   $t0, $zero, paint_dropdown_sub
  nop
  sw    $t9, 0($sp)
  move  $a0, $s1
  lw    $a1, 0($sp)
  jal   menu_entry
  nop
  move  $t8, $v0
  lw    $t9, 0($sp)
  li    $a3, ATTR_WIN
  bne   $t9, $s4, paint_dropdown_row
  nop
  li    $a3, ATTR_HILITE
paint_dropdown_row:
  sw    $a3, 4($sp)
  sw    $t8, 8($sp)
  addu  $a0, $s2, $t9
  addiu $a0, $a0, 1
  addiu $a1, $s3, 1
  addiu $a2, $s7, -2
  li    $a3, 1
  li    $t8, ' '
  lw    $t9, 4($sp)
  jal   scr_fill
  nop
  lw    $t9, 0($sp)
  lw    $t8, 8($sp)
  addu  $a0, $s2, $t9
  addiu $a0, $a0, 1
  addiu $a1, $s3, 2
  lw    $a2, 0($t8)
  lw    $a3, 4($sp)
  jal   scr_text
  nop
  lw    $t8, 8($sp)
  lw    $t0, 8($t8)
  beq   $t0, $zero, paint_dropdown_next
  nop
  lw    $t9, 0($sp)
  addu  $a0, $s2, $t9
  addiu $a0, $a0, 1
  addu  $a1, $s3, $s7
  addiu $a1, $a1, -3
  li    $a2, '>'
  lw    $a3, 4($sp)
  jal   scr_put
  nop
paint_dropdown_next:
  lw    $t9, 0($sp)
  addiu $t9, $t9, 1
  b     paint_dropdown_items
  nop

paint_dropdown_sub:
  bltz  $s5, paint_dropdown_done
  nop
  move  $a0, $s1
  move  $a1, $s5
  jal   menu_entry
  nop
  lw    $a0, 8($v0)
  beq   $a0, $zero, paint_dropdown_done
  nop
  sw    $a0, 12($sp)
  jal   menu_count
  nop
  addu  $t0, $s2, $s5
  addiu $t0, $t0, 1
  li    $t1, SCR_ROWS-2
  subu  $t1, $t1, $v0         # latest top that stays above row 25
  slt   $t2, $t1, $t0
  beq   $t2, $zero, paint_dropdown_sub_top
  nop
  move  $t0, $t1
paint_dropdown_sub_top:
  move  $a1, $t0
  addu  $a2, $s3, $s7
  addiu $a2, $a2, -1
  lw    $a0, 12($sp)
  # The submenu draws its own highlight and never nests further.
  li    $t8, -1
  lw    $a3, menu_sub
  jal   paint_dropdown
  nop
paint_dropdown_done:
  lw    $s7, 16($sp)
  lw    $s6, 20($sp)
  lw    $s5, 24($sp)
  lw    $s4, 28($sp)
  lw    $s3, 32($sp)
  lw    $s2, 36($sp)
  lw    $s1, 40($sp)
  lw    $ra, 44($sp)
  addiu $sp, $sp, 48
  jr    $ra
  nop

paint_menus:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   paint_menubar
  nop
  lw    $s7, menu_open
  bltz  $s7, paint_menus_done
  nop
  move  $a0, $s7
  jal   menu_items_of
  nop
  move  $s6, $v0
  lw    $t0, menu_start
  beq   $t0, $zero, paint_menus_top
  nop
  # The Start menu grows upward and finishes immediately above the taskbar.
  move  $a0, $s6
  jal   menu_count
  nop
  li    $t0, SCR_ROWS-2
  subu  $a1, $t0, $v0
  li    $a2, 1
  b     paint_menus_root
  nop
paint_menus_top:
  li    $a1, 2
  sll   $t0, $s7, 2
  la    $t1, menu_xs
  addu  $t1, $t1, $t0
  lw    $a2, 0($t1)
  addiu $a2, $a2, -1
paint_menus_root:
  move  $a0, $s6
  lw    $a3, menu_item
  lw    $t8, menu_hot
  jal   paint_dropdown
  nop
paint_menus_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# Task bar
# ------------------------------------------------------------

paint_taskbar:
  addiu $sp, $sp, -32
  sw    $ra, 28($sp)
  sw    $s4, 24($sp)
  sw    $s5, 20($sp)
  sw    $s6, 16($sp)
  sw    $s7, 12($sp)
  li    $a0, SCR_ROWS
  li    $a1, 1
  li    $a2, SCR_COLS
  li    $a3, 1
  li    $t8, ' '
  li    $t9, ATTR_MENU
  jal   scr_fill
  nop

  # Windows-style Start button. It remains visibly pressed while its menu is
  # open and reserves a stable target at the lower-left corner.
  li    $t9, ATTR_WIN
  lw    $t0, menu_start
  beq   $t0, $zero, paint_taskbar_start_fill
  nop
  li    $t9, ATTR_HILITE
paint_taskbar_start_fill:
  sw    $t9, 4($sp)
  li    $a0, SCR_ROWS
  li    $a1, 1
  li    $a2, 11
  li    $a3, 1
  li    $t8, ' '
  jal   scr_fill
  nop
  li    $a0, SCR_ROWS
  li    $a1, 1
  li    $a2, SCR_ROWS
  li    $a3, 11
  jal   scr_set_clip
  nop
  li    $a0, SCR_ROWS
  li    $a1, 1
  la    $a2, desktop_start
  lw    $a3, 4($sp)
  jal   scr_text
  nop
  jal   scr_reset_clip
  nop

  lw    $s4, win_open
  jal   win_focused
  nop
  move  $s5, $v0
  move  $s6, $zero
paint_taskbar_loop:
  slt   $t0, $s6, $s4
  beq   $t0, $zero, paint_taskbar_done
  nop
  li    $t1, 11
  mul   $t2, $s6, $t1
  addiu $t2, $t2, 13
  li    $t3, SCR_COLS-9
  slt   $t4, $t3, $t2
  bne   $t4, $zero, paint_taskbar_done
  nop
  sw    $t2, 0($sp)
  move  $a0, $s6
  jal   win_at
  nop
  move  $s7, $v0
  li    $a3, ATTR_WIN
  bne   $s7, $s5, paint_taskbar_button
  nop
  li    $a3, ATTR_HILITE
paint_taskbar_button:
  sw    $a3, 4($sp)
  li    $a0, SCR_ROWS
  lw    $a1, 0($sp)
  li    $a2, 10
  li    $a3, 1
  li    $t8, ' '
  lw    $t9, 4($sp)
  jal   scr_fill
  nop
  move  $a0, $s7
  jal   win_title
  nop
  sw    $v0, 8($sp)
  li    $a0, SCR_ROWS
  lw    $a1, 0($sp)
  addiu $a1, $a1, 1
  li    $a2, SCR_ROWS
  addu  $a3, $a1, 7
  jal   scr_set_clip
  nop
  lw    $a1, 0($sp)
  addiu $a1, $a1, 1
  li    $a0, SCR_ROWS
  lw    $a2, 8($sp)
  lw    $a3, 4($sp)
  jal   scr_text
  nop
  jal   scr_reset_clip
  nop
  addiu $s6, $s6, 1
  b     paint_taskbar_loop
  nop
paint_taskbar_done:
  lw    $s7, 12($sp)
  lw    $s6, 16($sp)
  lw    $s5, 20($sp)
  lw    $s4, 24($sp)
  lw    $ra, 28($sp)
  addiu $sp, $sp, 32
  jr    $ra
  nop

# ------------------------------------------------------------
# Frame assembly
# ------------------------------------------------------------

desk_render:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   scr_reset_clip
  nop
  # One pass paints the whole buffer: the menu bar and the task bar
  # overwrite their rows straight afterwards, so clearing twice is waste.
  li    $a0, 1
  li    $a1, 1
  li    $a2, SCR_COLS
  li    $a3, SCR_ROWS
  li    $t8, '.'
  li    $t9, ATTR_DESK
  jal   scr_fill
  nop

  lw    $s5, win_open
  jal   win_focused
  nop
  move  $s6, $v0
  move  $s7, $zero
desk_render_windows:
  slt   $t0, $s7, $s5
  beq   $t0, $zero, desk_render_chrome
  nop
  move  $a0, $s7
  jal   win_at
  nop
  move  $a0, $v0
  move  $a1, $zero
  bne   $v0, $s6, desk_render_paint
  nop
  li    $a1, 1
desk_render_paint:
  jal   win_paint
  nop
  addiu $s7, $s7, 1
  b     desk_render_windows
  nop
desk_render_chrome:
  jal   paint_taskbar
  nop
  jal   paint_menus
  nop
  jal   scr_flush
  nop
  sw    $zero, desk_dirty
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# ------------------------------------------------------------
# Hit testing
# ------------------------------------------------------------

# a0 = column. v0 = menu bar index under it, or -1.
menubar_hit:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s6, $a0
  move  $s7, $zero
menubar_hit_loop:
  sll   $t0, $s7, 3
  la    $t1, menu_bar
  addu  $t1, $t1, $t0
  lw    $a0, 0($t1)
  beq   $a0, $zero, menubar_hit_none
  nop
  jal   str_len
  nop
  sll   $t0, $s7, 2
  la    $t1, menu_xs
  addu  $t1, $t1, $t0
  lw    $t2, 0($t1)
  addiu $t3, $t2, -1
  slt   $t4, $s6, $t3
  bne   $t4, $zero, menubar_hit_next
  nop
  addu  $t3, $t2, $v0
  slt   $t4, $t3, $s6
  bne   $t4, $zero, menubar_hit_next
  nop
  move  $v0, $s7
  b     menubar_hit_done
  nop
menubar_hit_next:
  addiu $s7, $s7, 1
  b     menubar_hit_loop
  nop
menubar_hit_none:
  li    $v0, -1
menubar_hit_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# a0 = row, a1 = column, a2 = 1 to activate, 0 to only track hover.
# v0 = action to run, or ACT_NONE.
menu_hit:
  addiu $sp, $sp, -60
  sw    $ra, 56($sp)
  sw    $s1, 52($sp)
  sw    $s2, 48($sp)
  sw    $s3, 44($sp)
  sw    $s4, 40($sp)
  sw    $s5, 36($sp)
  sw    $s6, 32($sp)
  sw    $s7, 28($sp)
  move  $s1, $a0
  move  $s2, $a1
  move  $s3, $a2
  lw    $s4, menu_open
  move  $a0, $s4
  jal   menu_items_of
  nop
  move  $s5, $v0              # item table
  move  $a0, $s5
  jal   menu_width
  nop
  move  $s6, $v0              # dropdown width
  move  $a0, $s5
  jal   menu_count
  nop
  move  $s7, $v0              # entry count
  lw    $t0, menu_start
  beq   $t0, $zero, menu_hit_top_geometry
  nop
  li    $t2, 1
  sw    $t2, 0($sp)           # Start dropdown left column
  li    $t0, SCR_ROWS-2
  subu  $t5, $t0, $s7
  sw    $t5, 20($sp)          # Start dropdown top row
  b     menu_hit_geometry_done
  nop
menu_hit_top_geometry:
  sll   $t0, $s4, 2
  la    $t1, menu_xs
  addu  $t1, $t1, $t0
  lw    $t2, 0($t1)
  addiu $t2, $t2, -1
  sw    $t2, 0($sp)           # dropdown left column
  li    $t5, 2
  sw    $t5, 20($sp)          # dropdown top row
menu_hit_geometry_done:

  # The submenu floats above the parent menu, so test it first.
  lw    $t3, menu_hot
  bltz  $t3, menu_hit_parent
  nop
  move  $a0, $s5
  lw    $a1, menu_hot
  jal   menu_entry
  nop
  lw    $t4, 8($v0)
  beq   $t4, $zero, menu_hit_parent
  nop
  sw    $t4, 4($sp)           # submenu table
  move  $a0, $t4
  jal   menu_width
  nop
  sw    $v0, 12($sp)          # submenu width
  lw    $t4, 4($sp)
  move  $a0, $t4
  jal   menu_count
  nop
  sw    $v0, 16($sp)          # submenu entries
  lw    $t3, menu_hot
  lw    $t5, 20($sp)
  addu  $t5, $t5, $t3
  addiu $t5, $t5, 1           # align with the owning root entry
  lw    $t8, 16($sp)
  li    $t9, SCR_ROWS-2
  subu  $t9, $t9, $t8
  slt   $t7, $t9, $t5
  beq   $t7, $zero, menu_hit_sub_top_ready
  nop
  move  $t5, $t9
menu_hit_sub_top_ready:
  lw    $t2, 0($sp)
  addu  $t6, $t2, $s6
  addiu $t6, $t6, -1          # submenu left column
  # Inside the submenu box?
  slt   $t7, $s1, $t5
  bne   $t7, $zero, menu_hit_parent
  nop
  lw    $t8, 16($sp)
  addu  $t9, $t5, $t8
  addiu $t9, $t9, 1
  slt   $t7, $t9, $s1
  bne   $t7, $zero, menu_hit_parent
  nop
  slt   $t7, $s2, $t6
  bne   $t7, $zero, menu_hit_parent
  nop
  lw    $t9, 12($sp)
  addu  $t9, $t6, $t9
  slt   $t7, $t9, $s2
  bne   $t7, $zero, menu_hit_parent
  nop
  subu  $t9, $s1, $t5
  addiu $t9, $t9, -1          # submenu entry index
  bltz  $t9, menu_hit_none
  nop
  lw    $t8, 16($sp)
  slt   $t7, $t9, $t8
  beq   $t7, $zero, menu_hit_none
  nop
  sw    $t9, menu_sub
  beq   $s3, $zero, menu_hit_dirty
  nop
  lw    $a0, 4($sp)
  move  $a1, $t9
  jal   menu_entry
  nop
  lw    $v0, 4($v0)
  jal   menu_close
  nop
  b     menu_hit_done
  nop

menu_hit_parent:
  lw    $t2, 0($sp)
  slt   $t7, $s2, $t2
  bne   $t7, $zero, menu_hit_outside
  nop
  addu  $t9, $t2, $s6
  addiu $t9, $t9, -1
  slt   $t7, $t9, $s2
  bne   $t7, $zero, menu_hit_outside
  nop
  lw    $t5, 20($sp)
  slt   $t7, $s1, $t5
  bne   $t7, $zero, menu_hit_outside
  nop
  addu  $t9, $t5, $s7
  addiu $t9, $t9, 1
  slt   $t7, $t9, $s1
  bne   $t7, $zero, menu_hit_outside
  nop
  subu  $t9, $s1, $t5
  addiu $t9, $t9, -1
  bltz  $t9, menu_hit_none
  nop
  slt   $t7, $t9, $s7
  beq   $t7, $zero, menu_hit_none
  nop
  sw    $t9, menu_item
  move  $a0, $s5
  move  $a1, $t9
  jal   menu_entry
  nop
  lw    $t4, 8($v0)
  beq   $t4, $zero, menu_hit_leaf
  nop
  # Opening a submenu is not itself an action.
  lw    $t9, menu_item
  sw    $t9, menu_hot
  li    $t0, -1
  sw    $t0, menu_sub
  b     menu_hit_dirty
  nop
menu_hit_leaf:
  li    $t0, -1
  sw    $t0, menu_hot
  beq   $s3, $zero, menu_hit_dirty
  nop
  lw    $v0, 4($v0)
  jal   menu_close
  nop
  b     menu_hit_done
  nop

menu_hit_outside:
  beq   $s3, $zero, menu_hit_none
  nop
  jal   menu_close
  nop
  b     menu_hit_none
  nop
menu_hit_dirty:
  li    $t0, 1
  sw    $t0, desk_dirty
menu_hit_none:
  move  $v0, $zero
menu_hit_done:
  li    $t0, 1
  sw    $t0, desk_dirty
  lw    $s7, 28($sp)
  lw    $s6, 32($sp)
  lw    $s5, 36($sp)
  lw    $s4, 40($sp)
  lw    $s3, 44($sp)
  lw    $s2, 48($sp)
  lw    $s1, 52($sp)
  lw    $ra, 56($sp)
  addiu $sp, $sp, 60
  jr    $ra
  nop

menu_close:
  li    $t0, -1
  sw    $t0, menu_open
  sw    $t0, menu_item
  sw    $t0, menu_hot
  sw    $t0, menu_sub
  sw    $zero, menu_start
  li    $t0, 1
  sw    $t0, desk_dirty
  jr    $ra
  nop

start_toggle:
  lw    $t0, menu_start
  bne   $t0, $zero, start_toggle_close
  nop
  li    $t0, 1                 # Programs is menu-bar index 1
  sw    $t0, menu_open
  sw    $t0, menu_start
  li    $t0, -1
  sw    $t0, menu_item
  sw    $t0, menu_hot
  sw    $t0, menu_sub
  b     start_toggle_dirty
  nop
start_toggle_close:
  li    $t0, -1
  sw    $t0, menu_open
  sw    $t0, menu_item
  sw    $t0, menu_hot
  sw    $t0, menu_sub
  sw    $zero, menu_start
start_toggle_dirty:
  li    $t0, 1
  sw    $t0, desk_dirty
  jr    $ra
  nop

# a0 = window id, a1 = row, a2 = column. v0 = action.
icon_hit:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  move  $s4, $a0
  move  $s5, $a1
  move  $s6, $a2
  jal   win_get_row
  nop
  addiu $t0, $v0, 2
  subu  $s5, $s5, $t0         # row inside the icon grid
  move  $a0, $s4
  jal   win_get_col
  nop
  addiu $t0, $v0, 3
  subu  $s6, $s6, $t0         # column inside the icon grid
  bltz  $s5, icon_hit_none
  nop
  bltz  $s6, icon_hit_none
  nop
  li    $t0, 4
  divu  $s5, $t0
  mflo  $t1                   # grid row
  mfhi  $t2                   # row within the cell
  li    $t3, 2
  slt   $t4, $t2, $t3
  beq   $t4, $zero, icon_hit_none
  nop
  li    $t0, 17
  divu  $s6, $t0
  mflo  $t3                   # grid column
  mfhi  $t4
  li    $t5, 3
  slt   $t6, $t3, $t5
  beq   $t6, $zero, icon_hit_none
  nop
  li    $t5, 13
  slt   $t6, $t4, $t5
  beq   $t6, $zero, icon_hit_none
  nop
  li    $t5, 3
  mul   $t1, $t1, $t5
  addu  $s7, $t1, $t3         # icon index
  la    $t0, icon_table
  li    $t1, 12
  mul   $t1, $s7, $t1
  addu  $t0, $t0, $t1
  lw    $t2, 0($t0)
  beq   $t2, $zero, icon_hit_none
  nop
  lw    $v0, 8($t0)
  b     icon_hit_done
  nop
icon_hit_none:
  move  $v0, $zero
icon_hit_done:
  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# a0 = window id, a1 = row. v0 = action for the file under the cursor.
files_hit:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s4, $a0
  move  $s5, $a1
  jal   win_get_row
  nop
  addiu $t0, $v0, 2
  subu  $s5, $s5, $t0
  bltz  $s5, files_hit_none
  nop
  move  $a0, $s4
  jal   win_get_scroll
  nop
  addu  $s5, $s5, $v0         # index among the used slots
  move  $s6, $zero
  move  $s7, $zero
files_hit_loop:
  li    $t0, FS_MAX_FILES
  beq   $s6, $t0, files_hit_none
  nop
  move  $a0, $s6
  jal   fs_slot_used
  nop
  beq   $v0, $zero, files_hit_next
  nop
  beq   $s7, $s5, files_hit_open
  nop
  addiu $s7, $s7, 1
files_hit_next:
  addiu $s6, $s6, 1
  b     files_hit_loop
  nop
files_hit_open:
  move  $a0, $s6
  jal   fs_name_ptr
  nop
  sw    $v0, desk_arg
  move  $a0, $v0
  la    $a1, ext_bas
  jal   str_contains
  nop
  bne   $v0, $zero, files_hit_basic
  nop
  lw    $a0, desk_arg
  la    $a1, ext_sht
  jal   str_contains
  nop
  bne   $v0, $zero, files_hit_sheet
  nop
  li    $v0, ACT_EDITOR
  b     files_hit_done
  nop
files_hit_basic:
  li    $v0, ACT_BASIC
  b     files_hit_done
  nop
files_hit_sheet:
  li    $v0, ACT_SHEET
  b     files_hit_done
  nop
files_hit_none:
  move  $v0, $zero
files_hit_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# a0 = window id, a1 = row. Runs the selected shell command.
commands_hit:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s4, $a0
  move  $s5, $a1
  jal   win_get_row
  nop
  addiu $t0, $v0, 2
  subu  $s5, $s5, $t0
  bltz  $s5, commands_hit_none
  nop
  move  $a0, $s4
  jal   win_get_scroll
  nop
  addu  $s5, $s5, $v0
  la    $s6, command_table
  move  $s7, $zero
commands_hit_loop:
  lw    $t0, 0($s6)
  beq   $t0, $zero, commands_hit_none
  nop
  beq   $s7, $s5, commands_hit_run
  nop
  addiu $s6, $s6, 8
  addiu $s7, $s7, 1
  b     commands_hit_loop
  nop
commands_hit_run:
  lw    $t0, 4($s6)
  sw    $t0, desk_handler
  la    $t0, desktop_empty
  sw    $t0, desk_arg
  li    $v0, 1
  b     commands_hit_done
  nop
commands_hit_none:
  move  $v0, $zero
commands_hit_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# ------------------------------------------------------------
# Pointer handling
# ------------------------------------------------------------

desk_pointer:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  lw    $s4, mouse_button
  lw    $s5, mouse_row
  lw    $s6, mouse_column
  lw    $s7, mouse_action
  move  $v0, $zero

  # Wheel reports arrive as codes 64 and 65.
  li    $t0, 64
  beq   $s4, $t0, desk_pointer_wheel_up
  nop
  li    $t0, 65
  beq   $s4, $t0, desk_pointer_wheel_down
  nop

  andi  $t0, $s4, 32
  bne   $t0, $zero, desk_pointer_motion
  nop
  beq   $s7, $zero, desk_pointer_release
  nop
  b     desk_pointer_press
  nop

desk_pointer_wheel_up:
  li    $a0, -1
  b     desk_pointer_scroll
  nop
desk_pointer_wheel_down:
  li    $a0, 1
desk_pointer_scroll:
  move  $t8, $a0
  move  $a0, $s5
  move  $a1, $s6
  sw    $t8, 0($sp)
  jal   win_at_point
  nop
  bltz  $v0, desk_pointer_done
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   win_get_scroll
  nop
  lw    $t8, 0($sp)
  addu  $t1, $v0, $t8
  bgez  $t1, desk_pointer_scroll_store
  nop
  move  $t1, $zero
desk_pointer_scroll_store:
  sw    $t1, 0($sp)
  move  $a0, $s7
  jal   win_max_scroll
  nop
  lw    $t1, 0($sp)
  slt   $t2, $v0, $t1
  beq   $t2, $zero, desk_pointer_scroll_apply
  nop
  move  $t1, $v0
desk_pointer_scroll_apply:
  move  $a0, $s7
  move  $a1, $t1
  jal   win_set_scroll
  nop
  li    $t0, 1
  sw    $t0, desk_dirty
  b     desk_pointer_done
  nop

desk_pointer_release:
  sw    $zero, drag_mode
  b     desk_pointer_done
  nop

desk_pointer_motion:
  lw    $t0, drag_mode
  bne   $t0, $zero, desk_pointer_drag
  nop
  lw    $t0, menu_open
  bltz  $t0, desk_pointer_done
  nop
  move  $a0, $s5
  move  $a1, $s6
  move  $a2, $zero
  jal   menu_hit
  nop
  move  $v0, $zero
  b     desk_pointer_done
  nop

desk_pointer_drag:
  lw    $s7, drag_win
  li    $t1, 1
  bne   $t0, $t1, desk_pointer_resize
  nop
  # Move: keep the grab offset and the complete window inside the desktop band.
  lw    $t2, drag_dr
  subu  $t3, $s5, $t2
  li    $t4, DESK_TOP
  slt   $t5, $t3, $t4
  beq   $t5, $zero, desk_pointer_move_row_max
  nop
  move  $t3, $t4
desk_pointer_move_row_max:
  sw    $t3, 0($sp)
  move  $a0, $s7
  jal   win_get_h
  nop
  li    $t4, DESK_BOTTOM+1
  subu  $t4, $t4, $v0
  li    $t6, DESK_TOP
  slt   $t5, $t4, $t6
  beq   $t5, $zero, desk_pointer_move_row_limit
  nop
  move  $t4, $t6
desk_pointer_move_row_limit:
  lw    $t3, 0($sp)
  slt   $t5, $t4, $t3
  beq   $t5, $zero, desk_pointer_move_col
  nop
  move  $t3, $t4
desk_pointer_move_col:
  move  $a0, $s7
  move  $a1, $t3
  jal   win_set_row
  nop
  lw    $t2, drag_dc
  subu  $t3, $s6, $t2
  li    $t4, 1
  slt   $t5, $t3, $t4
  beq   $t5, $zero, desk_pointer_move_col_max
  nop
  move  $t3, $t4
desk_pointer_move_col_max:
  sw    $t3, 0($sp)
  move  $a0, $s7
  jal   win_get_w
  nop
  li    $t4, SCR_COLS+1
  subu  $t4, $t4, $v0
  li    $t6, 1
  slt   $t5, $t4, $t6
  beq   $t5, $zero, desk_pointer_move_col_limit
  nop
  move  $t4, $t6
desk_pointer_move_col_limit:
  lw    $t3, 0($sp)
  slt   $t5, $t4, $t3
  beq   $t5, $zero, desk_pointer_move_apply
  nop
  move  $t3, $t4
desk_pointer_move_apply:
  move  $a0, $s7
  move  $a1, $t3
  jal   win_set_col
  nop
  li    $t0, 1
  sw    $t0, desk_dirty
  move  $v0, $zero
  b     desk_pointer_done
  nop

desk_pointer_resize:
  move  $a0, $s7
  jal   win_get_col
  nop
  subu  $t3, $s6, $v0
  addiu $t3, $t3, 1           # requested width
  li    $t4, WIN_MIN_W
  slt   $t5, $t3, $t4
  beq   $t5, $zero, desk_pointer_resize_wmax
  nop
  move  $t3, $t4
desk_pointer_resize_wmax:
  li    $t4, SCR_COLS
  addiu $t4, $t4, 1
  subu  $t4, $t4, $v0
  slt   $t5, $t4, $t3
  beq   $t5, $zero, desk_pointer_resize_wset
  nop
  move  $t3, $t4
desk_pointer_resize_wset:
  move  $a0, $s7
  move  $a1, $t3
  jal   win_set_w
  nop
  move  $a0, $s7
  jal   win_get_row
  nop
  subu  $t3, $s5, $v0
  addiu $t3, $t3, 1           # requested height
  li    $t4, WIN_MIN_H
  slt   $t5, $t3, $t4
  beq   $t5, $zero, desk_pointer_resize_hmax
  nop
  move  $t3, $t4
desk_pointer_resize_hmax:
  li    $t4, DESK_BOTTOM
  addiu $t4, $t4, 1
  subu  $t4, $t4, $v0
  slt   $t5, $t4, $t3
  beq   $t5, $zero, desk_pointer_resize_hset
  nop
  move  $t3, $t4
desk_pointer_resize_hset:
  move  $a0, $s7
  move  $a1, $t3
  jal   win_set_h
  nop
  li    $t0, 1
  sw    $t0, desk_dirty
  move  $v0, $zero
  b     desk_pointer_done
  nop

desk_pointer_press:
  li    $t0, 1
  beq   $s5, $t0, desk_pointer_menubar
  nop
  # The Start button remains a direct target even while another menu is open,
  # so switching between the top menus and Start never needs a second click.
  li    $t0, SCR_ROWS
  bne   $s5, $t0, desk_pointer_press_menu
  nop
  li    $t1, 11
  slt   $t2, $t1, $s6
  bne   $t2, $zero, desk_pointer_press_menu
  nop
  jal   start_toggle
  nop
  move  $v0, $zero
  b     desk_pointer_done
  nop
desk_pointer_press_menu:
  lw    $t0, menu_open
  bltz  $t0, desk_pointer_body
  nop
  move  $a0, $s5
  move  $a1, $s6
  li    $a2, 1
  jal   menu_hit
  nop
  b     desk_pointer_done
  nop

desk_pointer_menubar:
  move  $a0, $s6
  jal   menubar_hit
  nop
  bltz  $v0, desk_pointer_menubar_close
  nop
  lw    $t0, menu_open
  beq   $t0, $v0, desk_pointer_menubar_close
  nop
  sw    $v0, menu_open
  sw    $zero, menu_start
  li    $t0, -1
  sw    $t0, menu_item
  sw    $t0, menu_hot
  sw    $t0, menu_sub
  li    $t0, 1
  sw    $t0, desk_dirty
  move  $v0, $zero
  b     desk_pointer_done
  nop
desk_pointer_menubar_close:
  jal   menu_close
  nop
  move  $v0, $zero
  b     desk_pointer_done
  nop

desk_pointer_body:
  li    $t0, SCR_ROWS
  bne   $s5, $t0, desk_pointer_window
  nop
  # Taskbar: Start occupies columns 1..11. Window buttons start at 13,
  # use a ten-cell face and leave one-cell gaps that are not clickable.
  li    $t1, 11
  slt   $t2, $t1, $s6
  bne   $t2, $zero, desk_pointer_task_window
  nop
  jal   start_toggle
  nop
  move  $v0, $zero
  b     desk_pointer_done
  nop
desk_pointer_task_window:
  addiu $t1, $s6, -13
  bltz  $t1, desk_pointer_done
  nop
  li    $t2, 11
  divu  $t1, $t2
  mflo  $t3
  mfhi  $t6
  li    $t5, 10
  slt   $t5, $t6, $t5
  beq   $t5, $zero, desk_pointer_done
  nop
  lw    $t4, win_open
  slt   $t5, $t3, $t4
  beq   $t5, $zero, desk_pointer_done
  nop
  move  $a0, $t3
  jal   win_at
  nop
  move  $a0, $v0
  jal   win_raise
  nop
  li    $t0, 1
  sw    $t0, desk_dirty
  move  $v0, $zero
  b     desk_pointer_done
  nop

desk_pointer_window:
  move  $a0, $s5
  move  $a1, $s6
  jal   win_at_point
  nop
  bltz  $v0, desk_pointer_done
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   win_raise
  nop
  li    $t0, 1
  sw    $t0, desk_dirty
  move  $a0, $s7
  jal   win_get_row
  nop
  move  $t8, $v0
  bne   $s5, $t8, desk_pointer_grip
  nop
  # Title bar: the close box, otherwise start a move.
  move  $a0, $s7
  jal   win_get_col
  nop
  move  $t8, $v0
  move  $a0, $s7
  jal   win_get_w
  nop
  addu  $t2, $t8, $v0
  addiu $t2, $t2, -4          # first column of the close box
  slt   $t3, $s6, $t2
  bne   $t3, $zero, desk_pointer_start_move
  nop
  addiu $t3, $t2, 2
  slt   $t4, $t3, $s6
  bne   $t4, $zero, desk_pointer_start_move
  nop
  move  $a0, $s7
  jal   win_close
  nop
  move  $v0, $zero
  b     desk_pointer_done
  nop
desk_pointer_start_move:
  li    $t0, 1
  sw    $t0, drag_mode
  sw    $s7, drag_win
  move  $a0, $s7
  jal   win_get_row
  nop
  subu  $t1, $s5, $v0
  sw    $t1, drag_dr
  move  $a0, $s7
  jal   win_get_col
  nop
  subu  $t1, $s6, $v0
  sw    $t1, drag_dc
  move  $v0, $zero
  b     desk_pointer_done
  nop

desk_pointer_grip:
  move  $a0, $s7
  jal   win_get_row
  nop
  move  $t8, $v0
  move  $a0, $s7
  jal   win_get_h
  nop
  addu  $t2, $t8, $v0
  addiu $t2, $t2, -1
  bne   $s5, $t2, desk_pointer_content
  nop
  move  $a0, $s7
  jal   win_get_col
  nop
  move  $t8, $v0
  move  $a0, $s7
  jal   win_get_w
  nop
  addu  $t2, $t8, $v0
  addiu $t2, $t2, -1
  bne   $s6, $t2, desk_pointer_content
  nop
  li    $t0, 2
  sw    $t0, drag_mode
  sw    $s7, drag_win
  move  $v0, $zero
  b     desk_pointer_done
  nop

desk_pointer_content:
  # Side and bottom borders are frame chrome, never list/icon activation areas.
  move  $a0, $s7
  jal   win_get_row
  nop
  sw    $v0, 0($sp)
  move  $a0, $s7
  jal   win_get_h
  nop
  lw    $t0, 0($sp)
  addu  $t1, $t0, $v0
  addiu $t1, $t1, -1
  slt   $t2, $t0, $s5
  beq   $t2, $zero, desk_pointer_content_none
  nop
  slt   $t2, $s5, $t1
  beq   $t2, $zero, desk_pointer_content_none
  nop
  move  $a0, $s7
  jal   win_get_col
  nop
  sw    $v0, 0($sp)
  move  $a0, $s7
  jal   win_get_w
  nop
  lw    $t0, 0($sp)
  addu  $t1, $t0, $v0
  addiu $t1, $t1, -1
  slt   $t2, $t0, $s6
  beq   $t2, $zero, desk_pointer_content_none
  nop
  slt   $t2, $s6, $t1
  beq   $t2, $zero, desk_pointer_content_none
  nop
  move  $a0, $s7
  jal   win_get_kind
  nop
  li    $t0, WK_PROGRAMS
  bne   $v0, $t0, desk_pointer_content_files
  nop
  move  $a0, $s7
  move  $a1, $s5
  move  $a2, $s6
  jal   icon_hit
  nop
  b     desk_pointer_done
  nop
desk_pointer_content_files:
  li    $t0, WK_FILES
  bne   $v0, $t0, desk_pointer_content_commands
  nop
  move  $a0, $s7
  move  $a1, $s5
  jal   files_hit
  nop
  b     desk_pointer_done
  nop
desk_pointer_content_commands:
  li    $t0, WK_COMMANDS
  bne   $v0, $t0, desk_pointer_content_none
  nop
  move  $a0, $s7
  move  $a1, $s5
  jal   commands_hit
  nop
  beq   $v0, $zero, desk_pointer_content_none
  nop
  li    $v0, 100              # run the stored handler
  b     desk_pointer_done
  nop
desk_pointer_content_none:
  move  $v0, $zero
desk_pointer_done:
  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# ------------------------------------------------------------
# Launching
# ------------------------------------------------------------

desk_suspend:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  # Full-screen editor and spreadsheet views still accept clicks. Use click
  # tracking without desktop hover motion while one of those apps owns the TTY.
  la    $a0, esc_mouse_clicks
  jal   tty_puts
  nop
  la    $a0, desktop_show_cur
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop
  jal   ansi_clear_screen
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

desk_resume:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, esc_mouse_on
  jal   tty_puts
  nop
  la    $a0, desktop_hide_cur
  jal   tty_puts
  nop
  li    $t0, 1
  sw    $t0, scr_full
  sw    $t0, desk_dirty
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# a0 = command handler, a1 = argument string. Full screen application.
desk_launch:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s2, 0($sp)
  move  $s6, $a0
  jal   desk_suspend
  nop
  move  $s2, $a1
  jalr  $s6
  nop
  jal   desk_resume
  nop
  lw    $s2, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# a0 = command handler, a1 = argument string. Console output plus a pause.
desk_console:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s2, 0($sp)
  move  $s6, $a0
  jal   desk_suspend
  nop
  move  $s2, $a1
  jalr  $s6
  nop
  jal   tty_crlf
  nop
  la    $a0, press_any_key
  jal   tty_puts
  nop
  jal   tty_getkey
  nop
  jal   desk_resume
  nop
  lw    $s2, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# a0 = window kind, a1 = row, a2 = column, a3 = width, t8 = height
desk_open_window:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   win_open_kind
  nop
  li    $t0, 1
  sw    $t0, desk_dirty
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# Stacks every open window with a fixed offset.
desk_cascade:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  lw    $s5, win_open
  move  $s6, $zero
desk_cascade_loop:
  slt   $t0, $s6, $s5
  beq   $t0, $zero, desk_cascade_done
  nop
  move  $a0, $s6
  jal   win_at
  nop
  move  $s7, $v0
  li    $t0, 2
  mul   $t1, $s6, $t0
  addiu $t1, $t1, DESK_TOP
  move  $a0, $s7
  move  $a1, $t1
  jal   win_set_row
  nop
  li    $t0, 4
  mul   $t1, $s6, $t0
  addiu $t1, $t1, 2
  move  $a0, $s7
  move  $a1, $t1
  jal   win_set_col
  nop
  move  $a0, $s7
  li    $a1, 50
  jal   win_set_w
  nop
  move  $a0, $s7
  li    $a1, 13
  jal   win_set_h
  nop
  addiu $s6, $s6, 1
  b     desk_cascade_loop
  nop
desk_cascade_done:
  li    $t0, 1
  sw    $t0, desk_dirty
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# Tiles one to three windows in a row, four as 2x2, and five or six as 3x2.
# The final row/column absorbs integer-division remainders, so every cell stays
# inside the 80x23 desktop band without gaps or off-screen windows.
desk_tile:
  addiu $sp, $sp, -60
  sw    $ra, 56($sp)
  sw    $s4, 52($sp)
  sw    $s5, 48($sp)
  sw    $s6, 44($sp)
  sw    $s7, 40($sp)
  lw    $s4, win_open          # window count
  blez  $s4, desk_tile_done
  nop

  # Choose the grid dimensions.
  li    $s5, 1                 # columns
  li    $t0, 1                 # rows
  li    $t1, 3
  slt   $t2, $t1, $s4
  bne   $t2, $zero, desk_tile_many
  nop
  move  $s5, $s4              # 1..3 => one row
  b     desk_tile_grid
  nop
desk_tile_many:
  li    $t0, 2
  li    $s5, 2                 # four => 2x2
  li    $t1, 4
  beq   $s4, $t1, desk_tile_grid
  nop
  li    $s5, 3                 # five or six => 3x2
desk_tile_grid:
  sw    $t0, 16($sp)           # row count
  li    $t1, SCR_COLS
  divu  $t1, $s5
  mflo  $t2
  sw    $t2, 8($sp)            # base cell width
  li    $t1, 23
  divu  $t1, $t0
  mflo  $t2
  sw    $t2, 12($sp)           # base cell height
  move  $s6, $zero
desk_tile_next:
  slt   $t0, $s6, $s4
  beq   $t0, $zero, desk_tile_done
  nop
  divu  $s6, $s5
  mflo  $t0                    # row index
  mfhi  $t1                    # column index
  sw    $t0, 0($sp)
  sw    $t1, 4($sp)

  # Base size, extended at the right/bottom edges for any remainder.
  lw    $t2, 8($sp)
  move  $t3, $t2
  addiu $t4, $s5, -1
  bne   $t1, $t4, desk_tile_width_ready
  nop
  mul   $t4, $t1, $t2
  li    $t3, SCR_COLS
  subu  $t3, $t3, $t4
desk_tile_width_ready:
  sw    $t3, 20($sp)
  lw    $t2, 12($sp)
  move  $t3, $t2
  lw    $t4, 16($sp)
  addiu $t4, $t4, -1
  bne   $t0, $t4, desk_tile_height_ready
  nop
  mul   $t4, $t0, $t2
  li    $t3, 23
  subu  $t3, $t3, $t4
desk_tile_height_ready:
  sw    $t3, 24($sp)

  move  $a0, $s6
  jal   win_at
  nop
  move  $s7, $v0
  move  $a0, $s7
  lw    $t0, 0($sp)
  lw    $t1, 12($sp)
  mul   $a1, $t0, $t1
  addiu $a1, $a1, DESK_TOP
  jal   win_set_row
  nop
  move  $a0, $s7
  lw    $t0, 4($sp)
  lw    $t1, 8($sp)
  mul   $a1, $t0, $t1
  addiu $a1, $a1, 1
  jal   win_set_col
  nop
  move  $a0, $s7
  lw    $a1, 20($sp)
  jal   win_set_w
  nop
  move  $a0, $s7
  lw    $a1, 24($sp)
  jal   win_set_h
  nop
  addiu $s6, $s6, 1
  b     desk_tile_next
  nop
desk_tile_done:
  li    $t0, 1
  sw    $t0, desk_dirty
  lw    $s7, 40($sp)
  lw    $s6, 44($sp)
  lw    $s5, 48($sp)
  lw    $s4, 52($sp)
  lw    $ra, 56($sp)
  addiu $sp, $sp, 60
  jr    $ra
  nop

# a0 = action identifier
desk_action:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  beq   $s7, $zero, desk_action_done
  nop

  li    $t0, 100
  bne   $s7, $t0, desk_action_terminal
  nop
  lw    $a0, desk_handler
  lw    $a1, desk_arg
  jal   desk_console
  nop
  b     desk_action_done
  nop

desk_action_terminal:
  li    $t0, ACT_TERMINAL
  bne   $s7, $t0, desk_action_editor
  nop
  la    $a0, shell_session
  la    $a1, desktop_empty
  jal   desk_launch
  nop
  b     desk_action_done
  nop
desk_action_editor:
  li    $t0, ACT_EDITOR
  bne   $s7, $t0, desk_action_sheet
  nop
  lw    $a1, desk_arg
  bne   $a1, $zero, desk_action_editor_go
  nop
  la    $a1, rom_notes_name
desk_action_editor_go:
  sw    $zero, desk_arg
  la    $a0, command_edit
  jal   desk_launch
  nop
  b     desk_action_done
  nop
desk_action_sheet:
  li    $t0, ACT_SHEET
  bne   $s7, $t0, desk_action_basic
  nop
  lw    $a1, desk_arg
  bne   $a1, $zero, desk_action_sheet_go
  nop
  la    $a1, rom_sheet_name
desk_action_sheet_go:
  sw    $zero, desk_arg
  la    $a0, command_sheet
  jal   desk_launch
  nop
  b     desk_action_done
  nop
desk_action_basic:
  li    $t0, ACT_BASIC
  bne   $s7, $t0, desk_action_edit_new
  nop
  lw    $a1, desk_arg
  bne   $a1, $zero, desk_action_basic_go
  nop
  la    $a1, rom_basic_name
desk_action_basic_go:
  sw    $zero, desk_arg
  la    $a0, command_basic
  jal   desk_launch
  nop
  b     desk_action_done
  nop
desk_action_edit_new:
  li    $t0, ACT_EDIT_NEW
  bne   $s7, $t0, desk_action_sheet_new
  nop
  la    $a0, command_edit
  la    $a1, scratch_name
  jal   desk_launch
  nop
  b     desk_action_done
  nop
desk_action_sheet_new:
  li    $t0, ACT_SHEET_NEW
  bne   $s7, $t0, desk_action_basic_new
  nop
  la    $a0, command_sheet
  la    $a1, scratch_sheet
  jal   desk_launch
  nop
  b     desk_action_done
  nop
desk_action_basic_new:
  li    $t0, ACT_BASIC_NEW
  bne   $s7, $t0, desk_action_about
  nop
  la    $a0, command_basic
  la    $a1, desktop_empty
  jal   desk_launch
  nop
  b     desk_action_done
  nop

desk_action_about:
  li    $t0, ACT_ABOUT
  bne   $s7, $t0, desk_action_files
  nop
  li    $a0, WK_ABOUT
  li    $a1, 7
  li    $a2, 14
  li    $a3, 54
  li    $t8, 10
  jal   desk_open_window
  nop
  b     desk_action_done
  nop
desk_action_files:
  li    $t0, ACT_FILES
  bne   $s7, $t0, desk_action_commands
  nop
  li    $a0, WK_FILES
  li    $a1, 4
  li    $a2, 8
  li    $a3, 38
  li    $t8, 14
  jal   desk_open_window
  nop
  b     desk_action_done
  nop
desk_action_commands:
  li    $t0, ACT_COMMANDS
  bne   $s7, $t0, desk_action_system
  nop
  li    $a0, WK_COMMANDS
  li    $a1, 4
  li    $a2, 46
  li    $a3, 28
  li    $t8, 17
  jal   desk_open_window
  nop
  b     desk_action_done
  nop
desk_action_system:
  li    $t0, ACT_SYSTEM
  bne   $s7, $t0, desk_action_help
  nop
  li    $a0, WK_SYSTEM
  li    $a1, 8
  li    $a2, 20
  li    $a3, 46
  li    $t8, 12
  jal   desk_open_window
  nop
  b     desk_action_done
  nop
desk_action_help:
  li    $t0, ACT_HELP
  bne   $s7, $t0, desk_action_programs
  nop
  li    $a0, WK_HELP
  li    $a1, 6
  li    $a2, 10
  li    $a3, 60
  li    $t8, 12
  jal   desk_open_window
  nop
  b     desk_action_done
  nop
desk_action_programs:
  li    $t0, ACT_PROGRAMS
  bne   $s7, $t0, desk_action_close
  nop
  li    $a0, WK_PROGRAMS
  li    $a1, 3
  li    $a2, 4
  li    $a3, 58
  li    $t8, 12
  jal   desk_open_window
  nop
  b     desk_action_done
  nop

desk_action_close:
  li    $t0, ACT_CLOSE
  bne   $s7, $t0, desk_action_close_all
  nop
  jal   win_focused
  nop
  bltz  $v0, desk_action_done
  nop
  move  $a0, $v0
  jal   win_close
  nop
  li    $t0, 1
  sw    $t0, desk_dirty
  b     desk_action_done
  nop
desk_action_close_all:
  li    $t0, ACT_CLOSE_ALL
  bne   $s7, $t0, desk_action_cascade
  nop
desk_action_close_all_loop:
  lw    $t0, win_open
  blez  $t0, desk_action_close_all_done
  nop
  jal   win_focused
  nop
  move  $a0, $v0
  jal   win_close
  nop
  b     desk_action_close_all_loop
  nop
desk_action_close_all_done:
  li    $t0, 1
  sw    $t0, desk_dirty
  b     desk_action_done
  nop
desk_action_cascade:
  li    $t0, ACT_CASCADE
  bne   $s7, $t0, desk_action_tile
  nop
  jal   desk_cascade
  nop
  b     desk_action_done
  nop
desk_action_tile:
  li    $t0, ACT_TILE
  bne   $s7, $t0, desk_action_memory
  nop
  jal   desk_tile
  nop
  b     desk_action_done
  nop

desk_action_memory:
  li    $t0, ACT_MEMORY
  bne   $s7, $t0, desk_action_disk
  nop
  la    $a0, command_mem
  la    $a1, desktop_empty
  jal   desk_console
  nop
  b     desk_action_done
  nop
desk_action_disk:
  li    $t0, ACT_DISK
  bne   $s7, $t0, desk_action_ascii
  nop
  la    $a0, command_df
  la    $a1, desktop_empty
  jal   desk_console
  nop
  b     desk_action_done
  nop
desk_action_ascii:
  li    $t0, ACT_ASCII
  bne   $s7, $t0, desk_action_life
  nop
  la    $a0, command_ascii
  la    $a1, desktop_empty
  jal   desk_console
  nop
  b     desk_action_done
  nop
desk_action_life:
  li    $t0, ACT_LIFE
  bne   $s7, $t0, desk_action_guess
  nop
  la    $a0, command_life
  la    $a1, arg_life
  jal   desk_console
  nop
  b     desk_action_done
  nop
desk_action_guess:
  li    $t0, ACT_GUESS
  bne   $s7, $t0, desk_action_date
  nop
  la    $a0, command_guess
  la    $a1, desktop_empty
  jal   desk_console
  nop
  b     desk_action_done
  nop
desk_action_date:
  li    $t0, ACT_DATE
  bne   $s7, $t0, desk_action_bench
  nop
  la    $a0, command_date
  la    $a1, desktop_empty
  jal   desk_console
  nop
  b     desk_action_done
  nop
desk_action_bench:
  li    $t0, ACT_BENCH
  bne   $s7, $t0, desk_action_banner
  nop
  la    $a0, command_bench
  la    $a1, desktop_empty
  jal   desk_console
  nop
  b     desk_action_done
  nop
desk_action_banner:
  li    $t0, ACT_BANNER
  bne   $s7, $t0, desk_action_primes
  nop
  la    $a0, command_banner
  la    $a1, arg_banner
  jal   desk_console
  nop
  b     desk_action_done
  nop
desk_action_primes:
  li    $t0, ACT_PRIMES
  bne   $s7, $t0, desk_action_fib
  nop
  la    $a0, command_primes
  la    $a1, arg_primes
  jal   desk_console
  nop
  b     desk_action_done
  nop
desk_action_fib:
  li    $t0, ACT_FIB
  bne   $s7, $t0, desk_action_restart
  nop
  la    $a0, command_fib
  la    $a1, arg_fib
  jal   desk_console
  nop
  b     desk_action_done
  nop

desk_action_restart:
  li    $t0, ACT_RESTART
  bne   $s7, $t0, desk_action_shutdown
  nop
  sw    $zero, desk_run
  b     desk_action_done
  nop
desk_action_shutdown:
  li    $t0, ACT_SHUTDOWN
  bne   $s7, $t0, desk_action_done
  nop
  jal   desk_suspend
  nop
  la    $a1, desktop_empty
  move  $s2, $a1
  jal   command_shutdown
  nop
desk_action_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# Keyboard shortcuts
# ------------------------------------------------------------

# a0 = key. v0 = action.
desk_key:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  move  $v0, $zero
  li    $t0, KEY_ESCAPE
  bne   $s7, $t0, desk_key_tab
  nop
  jal   menu_close
  nop
  b     desk_key_done
  nop
desk_key_tab:
  li    $t0, 9
  bne   $s7, $t0, desk_key_letters
  nop
  lw    $t1, win_open
  blez  $t1, desk_key_done
  nop
  move  $a0, $zero
  jal   win_at
  nop
  move  $a0, $v0
  jal   win_raise
  nop
  li    $t0, 1
  sw    $t0, desk_dirty
  move  $v0, $zero
  b     desk_key_done
  nop
desk_key_letters:
  move  $a0, $s7
  jal   char_upper
  nop
  move  $s7, $v0
  li    $t0, 'S'
  bne   $s7, $t0, desk_key_t
  nop
  jal   start_toggle
  nop
  move  $v0, $zero
  b     desk_key_done
  nop
desk_key_t:
  li    $t0, 'T'
  bne   $s7, $t0, desk_key_e
  nop
  li    $v0, ACT_TERMINAL
  b     desk_key_done
  nop
desk_key_e:
  li    $t0, 'E'
  bne   $s7, $t0, desk_key_w
  nop
  li    $v0, ACT_EDITOR
  b     desk_key_done
  nop
desk_key_w:
  li    $t0, 'W'
  bne   $s7, $t0, desk_key_b
  nop
  li    $v0, ACT_SHEET
  b     desk_key_done
  nop
desk_key_b:
  li    $t0, 'B'
  bne   $s7, $t0, desk_key_f
  nop
  li    $v0, ACT_BASIC
  b     desk_key_done
  nop
desk_key_f:
  li    $t0, 'F'
  bne   $s7, $t0, desk_key_c
  nop
  li    $v0, ACT_FILES
  b     desk_key_done
  nop
desk_key_c:
  li    $t0, 'C'
  bne   $s7, $t0, desk_key_i
  nop
  li    $v0, ACT_COMMANDS
  b     desk_key_done
  nop
desk_key_i:
  li    $t0, 'I'
  bne   $s7, $t0, desk_key_a
  nop
  li    $v0, ACT_SYSTEM
  b     desk_key_done
  nop
desk_key_a:
  li    $t0, 'A'
  bne   $s7, $t0, desk_key_h
  nop
  li    $v0, ACT_ABOUT
  b     desk_key_done
  nop
desk_key_h:
  li    $t0, 'H'
  bne   $s7, $t0, desk_key_p
  nop
  li    $v0, ACT_HELP
  b     desk_key_done
  nop
desk_key_p:
  li    $t0, 'P'
  bne   $s7, $t0, desk_key_x
  nop
  li    $v0, ACT_PROGRAMS
  b     desk_key_done
  nop
desk_key_x:
  li    $t0, 'X'
  bne   $s7, $t0, desk_key_q
  nop
  li    $v0, ACT_CLOSE
  b     desk_key_done
  nop
desk_key_q:
  li    $t0, 'Q'
  bne   $s7, $t0, desk_key_done
  nop
  li    $v0, ACT_RESTART
desk_key_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# Entry points
# ------------------------------------------------------------

# Shell compatibility: leave Terminal and return to the desktop.
command_desktop:
  li    $t0, 1
  sw    $t0, shell_exit_requested
  jr    $ra
  nop

desktop_main:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  # Fresh session: one Program Manager, no menus, everything dirty.
  sw    $zero, win_open
  move  $t0, $zero
desktop_main_clear:
  li    $t1, WIN_MAX
  beq   $t0, $t1, desktop_main_ready
  nop
  sll   $t2, $t0, 2
  la    $t3, win_kind
  addu  $t3, $t3, $t2
  sw    $zero, 0($t3)
  addiu $t0, $t0, 1
  b     desktop_main_clear
  nop
desktop_main_ready:
  li    $t0, -1
  sw    $t0, menu_open
  sw    $t0, menu_item
  sw    $t0, menu_hot
  sw    $t0, menu_sub
  sw    $zero, menu_start
  sw    $zero, drag_mode
  sw    $zero, desk_arg
  li    $t0, 1
  sw    $t0, desk_run
  sw    $t0, desk_dirty
  sw    $t0, scr_full

  la    $a0, esc_mouse_on
  jal   tty_puts
  nop
  la    $a0, desktop_hide_cur
  jal   tty_puts
  nop

  li    $a0, WK_PROGRAMS
  li    $a1, 3
  li    $a2, 4
  li    $a3, 58
  li    $t8, 12
  jal   win_open_kind
  nop
  li    $a0, WK_ABOUT
  li    $a1, 9
  li    $a2, 22
  li    $a3, 54
  li    $t8, 10
  jal   win_open_kind
  nop

desktop_main_loop:
  lw    $t0, desk_dirty
  beq   $t0, $zero, desktop_main_input
  nop
  jal   desk_render
  nop
desktop_main_input:
  jal   tty_getkey
  nop
  move  $s7, $v0
  li    $t0, KEY_MOUSE
  bne   $s7, $t0, desktop_main_key
  nop
  jal   desk_pointer
  nop
  b     desktop_main_act
  nop
desktop_main_key:
  move  $a0, $s7
  jal   desk_key
  nop
desktop_main_act:
  move  $a0, $v0
  jal   desk_action
  nop
  lw    $t0, desk_run
  bne   $t0, $zero, desktop_main_loop
  nop

  la    $a0, esc_mouse_off
  jal   tty_puts
  nop
  la    $a0, desktop_show_cur
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop
  jal   ansi_clear_screen
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop
