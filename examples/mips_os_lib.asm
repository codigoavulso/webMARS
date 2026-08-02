# ============================================================
# MARS-OS 1.0 - kernel library
#
# Language neutral services shared by every other module:
# the cooperative TTY driver, ANSI cursor control, the command
# history ring, string helpers and integer formatting.
#
# TTY MMIO:
#   0xffff0000 receiver control
#   0xffff0004 receiver data
#   0xffff0008 transmitter control
#   0xffff000c transmitter data
#
# Register contract used by the whole system:
#   $s0 always holds 0xffff0000 (the MMIO window base).
# ============================================================

.eqv LINE_CAP        128
.eqv HISTORY_SLOTS   8
.eqv HISTORY_SHIFT   7
.eqv CLOCK_CONTROL   0xffff0050
.eqv CLOCK_PERIOD    0xffff0058
.eqv CLOCK_COUNTER   0xffff005c
.eqv CLOCK_TIME_LOW  0xffff0060
.eqv CLOCK_TIME_HIGH 0xffff0064
.eqv CLOCK_UPTIME    0xffff0068

.eqv KEY_UP     1000
.eqv KEY_DOWN   1001
.eqv KEY_RIGHT  1002
.eqv KEY_LEFT   1003
.eqv KEY_ESCAPE 1004
.eqv KEY_MOUSE  1010

.data
.align 2
line_buf:       .space LINE_CAP
scratch_buf:    .space LINE_CAP
digit_buf:      .space 16
history_buf:    .space 1024
history_count:  .word 0
key_pending:    .word -1
mouse_button:   .word 0
mouse_column:   .word 0
mouse_row:      .word 0
mouse_action:   .word 0
command_count:  .word 0
prompt_color:   .word 0

# Escape sequences are ordinary bytes: 27 is ESC, so whatever follows
# is read by the terminal as a command instead of as text.
esc_bracket:    .byte 27, 91, 0
esc_clear_all:  .byte 27, 91, 50, 74, 27, 91, 72, 0
esc_clear_eol:  .byte 27, 91, 75, 0
esc_reset:      .byte 27, 99, 0
esc_normal:     .byte 27, 91, 48, 109, 0
esc_dim:        .byte 27, 91, 50, 109, 0
esc_inverse:    .byte 27, 91, 55, 109, 0
esc_semicolon:  .asciiz ";"
esc_upper_h:    .asciiz "H"
esc_mouse_on:   .byte 27,91,63,49,48,48,48,104,27,91,63,49,48,48,54,104,0
esc_mouse_off:  .byte 27,91,63,49,48,48,48,108,27,91,63,49,48,48,54,108,0
# The colour is chosen by number inside the escape sequence.
ansi_bold_cyan: .byte 27, 91, 49, 59, 57, 54, 109, 0
ansi_green:     .byte 27, 91, 57, 50, 109, 0
ansi_cyan:      .byte 27, 91, 57, 54, 109, 0
ansi_yellow:    .byte 27, 91, 57, 51, 109, 0
ansi_white:     .byte 27, 91, 57, 55, 109, 0
ansi_red:       .byte 27, 91, 57, 49, 109, 0

.text

# ------------------------------------------------------------
# Reset vector
#
# Without the "start at main" setting the simulator begins at the
# lowest text address, so the entry point has to be the very first
# instruction the assembler emits. This module is included before
# every other one precisely so that this vector lands there.
# ------------------------------------------------------------

.globl main
main:
  lui   $s0, 0xffff
  j     kernel_boot
  nop

# ------------------------------------------------------------
# Cooperative TTY driver
#
# The device is polled, never interrupt driven.  Whenever a poll
# finds the device busy the kernel yields with syscall 32 so the
# host stays responsive instead of spinning at full speed.
# ------------------------------------------------------------

tty_getc:
tty_getc_wait:
  lbu   $t0, 0($s0)
  andi  $t0, $t0, 1
  bne   $t0, $zero, tty_getc_ready
  nop
  li    $v0, 32
  li    $a0, 4
  syscall
  b     tty_getc_wait
  nop
tty_getc_ready:
  lbu   $v0, 4($s0)
  jr    $ra
  nop

tty_putc:
tty_putc_wait:
  lbu   $t0, 8($s0)
  andi  $t0, $t0, 1
  bne   $t0, $zero, tty_putc_ready
  nop
  li    $v0, 32
  li    $a0, 1
  syscall
  b     tty_putc_wait
  nop
tty_putc_ready:
  sb    $a0, 12($s0)
  jr    $ra
  nop

tty_puts:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
tty_puts_loop:
  lbu   $a0, 0($s7)
  beq   $a0, $zero, tty_puts_done
  nop
  jal   tty_putc
  nop
  addiu $s7, $s7, 1
  b     tty_puts_loop
  nop
tty_puts_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

tty_crlf:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  li    $a0, 13
  jal   tty_putc
  nop
  li    $a0, 10
  jal   tty_putc
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# a0 = string, a1 = column width. Truncates or pads with spaces.
tty_puts_pad:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s5, $a0
  move  $s6, $a1
  move  $s7, $zero
tty_puts_pad_loop:
  beq   $s7, $s6, tty_puts_pad_done
  nop
  lbu   $a0, 0($s5)
  bne   $a0, $zero, tty_puts_pad_emit
  nop
  li    $a0, ' '
  b     tty_puts_pad_write
  nop
tty_puts_pad_emit:
  addiu $s5, $s5, 1
tty_puts_pad_write:
  jal   tty_putc
  nop
  addiu $s7, $s7, 1
  b     tty_puts_pad_loop
  nop
tty_puts_pad_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# a0 = count of spaces
tty_spaces:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
tty_spaces_loop:
  blez  $s7, tty_spaces_done
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  addiu $s7, $s7, -1
  b     tty_spaces_loop
  nop
tty_spaces_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# ANSI screen control
# ------------------------------------------------------------

ansi_clear_screen:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, esc_clear_all
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

ansi_clear_eol:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, esc_clear_eol
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

ansi_normal:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, esc_normal
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

ansi_inverse:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, esc_inverse
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# a0 = row (1 based), a1 = column (1 based)
ansi_goto:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s6, $a0
  move  $s7, $a1
  la    $a0, esc_bracket
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   tty_put_uint
  nop
  la    $a0, esc_semicolon
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_uint
  nop
  la    $a0, esc_upper_h
  jal   tty_puts
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# Key decoding
#
# Returns v0 as a byte for ordinary keys or one of the KEY_*
# constants for the arrow keys, mouse and a bare Escape. Escape
# sequences arrive as ESC '[' followed by a final letter, so the
# decoder has to look ahead by up to two bytes.
# ------------------------------------------------------------

tty_getkey:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s4, 8($sp)
  sw    $s5, 4($sp)
  sw    $s6, 0($sp)
  lw    $v0, key_pending
  bltz  $v0, tty_getkey_read
  nop
  li    $t0, -1
  sw    $t0, key_pending
  b     tty_getkey_done
  nop
tty_getkey_read:
  jal   tty_getc
  nop
  andi  $v0, $v0, 0xff
  li    $t0, 27
  bne   $v0, $t0, tty_getkey_done
  nop
  jal   tty_getc
  nop
  andi  $v0, $v0, 0xff
  li    $t0, '['
  beq   $v0, $t0, tty_getkey_csi
  nop
  li    $t0, 'O'
  beq   $v0, $t0, tty_getkey_csi
  nop
  # A bare Escape: the byte that followed it belongs to the next read,
  # so it is parked in the one slot pushback register.
  li    $t0, 27
  beq   $v0, $t0, tty_getkey_escape
  nop
  sw    $v0, key_pending
tty_getkey_escape:
  li    $v0, KEY_ESCAPE
  b     tty_getkey_done
  nop
tty_getkey_csi:
  jal   tty_getc
  nop
  andi  $v0, $v0, 0xff
  li    $t0, '<'
  beq   $v0, $t0, tty_getkey_mouse
  nop
  li    $t0, 'A'
  beq   $v0, $t0, tty_getkey_up
  nop
  li    $t0, 'B'
  beq   $v0, $t0, tty_getkey_down
  nop
  li    $t0, 'C'
  beq   $v0, $t0, tty_getkey_right
  nop
  li    $t0, 'D'
  beq   $v0, $t0, tty_getkey_left
  nop
  li    $v0, KEY_ESCAPE
  b     tty_getkey_done
  nop
tty_getkey_up:
  li    $v0, KEY_UP
  b     tty_getkey_done
  nop
tty_getkey_down:
  li    $v0, KEY_DOWN
  b     tty_getkey_done
  nop
tty_getkey_right:
  li    $v0, KEY_RIGHT
  b     tty_getkey_done
  nop
tty_getkey_left:
  li    $v0, KEY_LEFT
  b     tty_getkey_done
  nop

# SGR mouse report: ESC [ < button ; column ; row M/m
tty_getkey_mouse:
  jal   tty_mouse_number
  nop
  move  $s4, $v0
  li    $t0, ';'
  bne   $v1, $t0, tty_getkey_escape
  nop
  jal   tty_mouse_number
  nop
  move  $s5, $v0
  li    $t0, ';'
  bne   $v1, $t0, tty_getkey_escape
  nop
  jal   tty_mouse_number
  nop
  move  $s6, $v0
  li    $t0, 'M'
  beq   $v1, $t0, tty_getkey_mouse_press
  nop
  li    $t0, 'm'
  bne   $v1, $t0, tty_getkey_escape
  nop
  sw    $zero, mouse_action
  b     tty_getkey_mouse_store
  nop
tty_getkey_mouse_press:
  li    $t0, 1
  sw    $t0, mouse_action
tty_getkey_mouse_store:
  sw    $s4, mouse_button
  sw    $s5, mouse_column
  sw    $s6, mouse_row
  li    $v0, KEY_MOUSE
tty_getkey_done:
  lw    $s6, 0($sp)
  lw    $s5, 4($sp)
  lw    $s4, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# Read one unsigned decimal field of an SGR mouse report.
# v0 = number, v1 = delimiter byte.
tty_mouse_number:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $zero
tty_mouse_number_loop:
  jal   tty_getc
  nop
  andi  $v1, $v0, 0xff
  li    $t0, '0'
  slt   $t1, $v1, $t0
  bne   $t1, $zero, tty_mouse_number_done
  nop
  li    $t0, ':'
  slt   $t1, $v1, $t0
  beq   $t1, $zero, tty_mouse_number_done
  nop
  sll   $t0, $s7, 3
  sll   $t1, $s7, 1
  addu  $s7, $t0, $t1
  addiu $t0, $v1, -48
  addu  $s7, $s7, $t0
  b     tty_mouse_number_loop
  nop
tty_mouse_number_done:
  move  $v0, $s7
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# Line editor with history recall
#
# a0 = buffer, a1 = capacity, v0 = length.
# Up and Down walk the history ring in place, exactly like a
# real shell: the visible line is erased and rewritten.
# ------------------------------------------------------------

tty_read_line:
  addiu $sp, $sp, -28
  sw    $ra, 24($sp)
  sw    $s1, 20($sp)
  sw    $s2, 16($sp)
  sw    $s3, 12($sp)
  sw    $s4, 8($sp)
  sw    $s5, 4($sp)
  sw    $s6, 0($sp)
  move  $s1, $a0
  move  $s2, $a1
  move  $s3, $zero
  move  $s6, $zero
  sb    $zero, 0($s1)
tty_read_line_loop:
  jal   tty_getkey
  nop
  move  $s4, $v0
  li    $t0, KEY_UP
  beq   $s4, $t0, tty_read_line_prev
  nop
  li    $t0, KEY_DOWN
  beq   $s4, $t0, tty_read_line_next
  nop
  li    $t0, KEY_LEFT
  beq   $s4, $t0, tty_read_line_loop
  nop
  li    $t0, KEY_RIGHT
  beq   $s4, $t0, tty_read_line_loop
  nop
  li    $t0, KEY_ESCAPE
  beq   $s4, $t0, tty_read_line_kill
  nop
  li    $t0, 13
  beq   $s4, $t0, tty_read_line_term
  nop
  li    $t0, 10
  beq   $s4, $t0, tty_read_line_term
  nop
  li    $t0, 8
  beq   $s4, $t0, tty_read_line_backspace
  nop
  li    $t0, 127
  beq   $s4, $t0, tty_read_line_backspace
  nop
  li    $t0, 21
  beq   $s4, $t0, tty_read_line_kill
  nop
  li    $t0, 32
  slt   $t1, $s4, $t0
  bne   $t1, $zero, tty_read_line_loop
  nop
  li    $t0, 127
  slt   $t1, $s4, $t0
  beq   $t1, $zero, tty_read_line_loop
  nop
  addiu $t0, $s2, -1
  slt   $t1, $s3, $t0
  beq   $t1, $zero, tty_read_line_loop
  nop
  addu  $t2, $s1, $s3
  sb    $s4, 0($t2)
  addiu $s3, $s3, 1
  addu  $t2, $s1, $s3
  sb    $zero, 0($t2)
  move  $a0, $s4
  jal   tty_putc
  nop
  b     tty_read_line_loop
  nop

tty_read_line_backspace:
  beq   $s3, $zero, tty_read_line_loop
  nop
  addiu $s3, $s3, -1
  addu  $t0, $s1, $s3
  sb    $zero, 0($t0)
  jal   tty_erase_one
  nop
  b     tty_read_line_loop
  nop

tty_read_line_kill:
  beq   $s3, $zero, tty_read_line_loop
  nop
  addiu $s3, $s3, -1
  jal   tty_erase_one
  nop
  b     tty_read_line_kill
  nop

tty_read_line_prev:
  lw    $t0, history_count
  beq   $t0, $zero, tty_read_line_loop
  nop
  addiu $t1, $s6, 1
  slt   $t2, $t0, $t1
  bne   $t2, $zero, tty_read_line_loop
  nop
  li    $t2, HISTORY_SLOTS+1
  slt   $t3, $t1, $t2
  beq   $t3, $zero, tty_read_line_loop
  nop
  move  $s6, $t1
  b     tty_read_line_recall
  nop

tty_read_line_next:
  blez  $s6, tty_read_line_loop
  nop
  addiu $s6, $s6, -1
  bne   $s6, $zero, tty_read_line_recall
  nop
  jal   tty_read_line_erase
  nop
  move  $s3, $zero
  sb    $zero, 0($s1)
  b     tty_read_line_loop
  nop

tty_read_line_recall:
  jal   tty_read_line_erase
  nop
  move  $a0, $s6
  jal   history_fetch
  nop
  beq   $v0, $zero, tty_read_line_loop
  nop
  move  $a0, $s1
  move  $a1, $v0
  addiu $a2, $s2, -1
  jal   str_copy_n
  nop
  move  $s3, $v0
  move  $a0, $s1
  jal   tty_puts
  nop
  b     tty_read_line_loop
  nop

# Erases s3 characters from the screen without touching the buffer.
tty_read_line_erase:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s5, 0($sp)
  move  $s5, $s3
tty_read_line_erase_loop:
  blez  $s5, tty_read_line_erase_done
  nop
  jal   tty_erase_one
  nop
  addiu $s5, $s5, -1
  b     tty_read_line_erase_loop
  nop
tty_read_line_erase_done:
  lw    $s5, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

tty_erase_one:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  li    $a0, 8
  jal   tty_putc
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  li    $a0, 8
  jal   tty_putc
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

tty_read_line_term:
  addu  $t0, $s1, $s3
  sb    $zero, 0($t0)
  jal   tty_crlf
  nop
  move  $v0, $s3
  lw    $s6, 0($sp)
  lw    $s5, 4($sp)
  lw    $s4, 8($sp)
  lw    $s3, 12($sp)
  lw    $s2, 16($sp)
  lw    $s1, 20($sp)
  lw    $ra, 24($sp)
  addiu $sp, $sp, 28
  jr    $ra
  nop

# ------------------------------------------------------------
# Command history ring
# ------------------------------------------------------------

history_add:
  move  $t9, $a0
  lbu   $t4, 0($t9)
  beq   $t4, $zero, history_add_return
  nop
  lw    $t0, history_count
  andi  $t1, $t0, HISTORY_SLOTS-1
  sll   $t1, $t1, HISTORY_SHIFT
  la    $t2, history_buf
  addu  $t2, $t2, $t1
  li    $t3, LINE_CAP-1
history_add_loop:
  lbu   $t4, 0($t9)
  sb    $t4, 0($t2)
  beq   $t4, $zero, history_add_done
  nop
  addiu $t9, $t9, 1
  addiu $t2, $t2, 1
  addiu $t3, $t3, -1
  bgtz  $t3, history_add_loop
  nop
  sb    $zero, 0($t2)
history_add_done:
  addiu $t0, $t0, 1
  sw    $t0, history_count
history_add_return:
  jr    $ra
  nop

# a0 = depth (1 = most recent), v0 = pointer or zero
history_fetch:
  lw    $t0, history_count
  blez  $a0, history_fetch_none
  nop
  slt   $t1, $t0, $a0
  bne   $t1, $zero, history_fetch_none
  nop
  li    $t1, HISTORY_SLOTS
  slt   $t2, $t1, $a0
  bne   $t2, $zero, history_fetch_none
  nop
  subu  $t2, $t0, $a0
  andi  $t2, $t2, HISTORY_SLOTS-1
  sll   $t2, $t2, HISTORY_SHIFT
  la    $v0, history_buf
  addu  $v0, $v0, $t2
  jr    $ra
  nop
history_fetch_none:
  move  $v0, $zero
  jr    $ra
  nop

# ------------------------------------------------------------
# String helpers
# ------------------------------------------------------------

str_equal:
  lbu   $t0, 0($a0)
  lbu   $t1, 0($a1)
  bne   $t0, $t1, str_not_equal
  nop
  beq   $t0, $zero, str_is_equal
  nop
  addiu $a0, $a0, 1
  addiu $a1, $a1, 1
  b     str_equal
  nop
str_is_equal:
  li    $v0, 1
  jr    $ra
  nop
str_not_equal:
  move  $v0, $zero
  jr    $ra
  nop

# v0 = negative, zero or positive like strcmp
str_compare:
  move  $t8, $a0
  move  $t9, $a1
str_compare_loop:
  lbu   $t0, 0($t8)
  lbu   $t1, 0($t9)
  bne   $t0, $t1, str_compare_diff
  nop
  beq   $t0, $zero, str_compare_same
  nop
  addiu $t8, $t8, 1
  addiu $t9, $t9, 1
  b     str_compare_loop
  nop
str_compare_diff:
  subu  $v0, $t0, $t1
  jr    $ra
  nop
str_compare_same:
  move  $v0, $zero
  jr    $ra
  nop

str_len:
  move  $t0, $a0
  move  $v0, $zero
str_len_loop:
  lbu   $t1, 0($t0)
  beq   $t1, $zero, str_len_done
  nop
  addiu $t0, $t0, 1
  addiu $v0, $v0, 1
  b     str_len_loop
  nop
str_len_done:
  jr    $ra
  nop

# a0 = destination, a1 = source, a2 = capacity without the terminator
# v0 = bytes copied
str_copy_n:
  move  $t0, $a0
  move  $t1, $a1
  move  $v0, $zero
str_copy_n_loop:
  beq   $v0, $a2, str_copy_n_done
  nop
  lbu   $t2, 0($t1)
  beq   $t2, $zero, str_copy_n_done
  nop
  sb    $t2, 0($t0)
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  addiu $v0, $v0, 1
  b     str_copy_n_loop
  nop
str_copy_n_done:
  sb    $zero, 0($t0)
  jr    $ra
  nop

# a0 = haystack, a1 = needle, v0 = 1 when the needle occurs
str_contains:
  move  $t8, $a0
str_contains_outer:
  move  $t0, $t8
  move  $t1, $a1
  lbu   $t2, 0($t1)
  beq   $t2, $zero, str_contains_hit
  nop
str_contains_inner:
  lbu   $t2, 0($t1)
  beq   $t2, $zero, str_contains_hit
  nop
  lbu   $t3, 0($t0)
  beq   $t3, $zero, str_contains_miss
  nop
  bne   $t2, $t3, str_contains_advance
  nop
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  b     str_contains_inner
  nop
str_contains_advance:
  lbu   $t3, 0($t8)
  beq   $t3, $zero, str_contains_miss
  nop
  addiu $t8, $t8, 1
  b     str_contains_outer
  nop
str_contains_hit:
  li    $v0, 1
  jr    $ra
  nop
str_contains_miss:
  move  $v0, $zero
  jr    $ra
  nop

# a0 = character, v0 = uppercase equivalent
char_upper:
  move  $v0, $a0
  li    $t0, 'a'
  slt   $t1, $v0, $t0
  bne   $t1, $zero, char_upper_done
  nop
  li    $t0, 'z'
  slt   $t1, $t0, $v0
  bne   $t1, $zero, char_upper_done
  nop
  addiu $v0, $v0, -32
char_upper_done:
  jr    $ra
  nop

skip_spaces:
  move  $t0, $a0
skip_spaces_loop:
  lbu   $t1, 0($t0)
  li    $t2, ' '
  beq   $t1, $t2, skip_spaces_step
  nop
  li    $t2, 9
  bne   $t1, $t2, skip_spaces_done
  nop
skip_spaces_step:
  addiu $t0, $t0, 1
  b     skip_spaces_loop
  nop
skip_spaces_done:
  move  $v0, $t0
  jr    $ra
  nop

# Splits the line in place. v0 = first word, v1 = remaining text.
split_command:
  move  $t0, $a0
split_skip_leading:
  lbu   $t1, 0($t0)
  li    $t2, ' '
  bne   $t1, $t2, split_scan
  nop
  addiu $t0, $t0, 1
  b     split_skip_leading
  nop
split_scan:
  move  $v0, $t0
split_scan_loop:
  lbu   $t1, 0($t0)
  beq   $t1, $zero, split_no_args
  nop
  li    $t2, ' '
  beq   $t1, $t2, split_found_space
  nop
  addiu $t0, $t0, 1
  b     split_scan_loop
  nop
split_found_space:
  sb    $zero, 0($t0)
  addiu $t0, $t0, 1
split_args_skip:
  lbu   $t1, 0($t0)
  li    $t2, ' '
  bne   $t1, $t2, split_done
  nop
  addiu $t0, $t0, 1
  b     split_args_skip
  nop
split_done:
  move  $v1, $t0
  jr    $ra
  nop
split_no_args:
  move  $v1, $t0
  jr    $ra
  nop

# a0 = destination, a1 = source, a2 = length. Overlap safe.
mem_move:
  beq   $a2, $zero, mem_move_done
  nop
  sltu  $t0, $a0, $a1
  bne   $t0, $zero, mem_move_forward
  nop
  addu  $t1, $a0, $a2
  addiu $t1, $t1, -1
  addu  $t2, $a1, $a2
  addiu $t2, $t2, -1
  move  $t3, $a2
mem_move_back_loop:
  lbu   $t4, 0($t2)
  sb    $t4, 0($t1)
  addiu $t1, $t1, -1
  addiu $t2, $t2, -1
  addiu $t3, $t3, -1
  bgtz  $t3, mem_move_back_loop
  nop
  b     mem_move_done
  nop
mem_move_forward:
  move  $t1, $a0
  move  $t2, $a1
  move  $t3, $a2
mem_move_forward_loop:
  lbu   $t4, 0($t2)
  sb    $t4, 0($t1)
  addiu $t1, $t1, 1
  addiu $t2, $t2, 1
  addiu $t3, $t3, -1
  bgtz  $t3, mem_move_forward_loop
  nop
mem_move_done:
  jr    $ra
  nop

# ------------------------------------------------------------
# Integer parsing and formatting
# ------------------------------------------------------------

# a0 = input pointer
# v0 = signed value, v1 = first unparsed byte, a2 = success flag
parse_number:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s1, 4($sp)
  sw    $s2, 0($sp)
  jal   skip_spaces
  nop
  move  $t0, $v0
  move  $s1, $zero
  lbu   $t1, 0($t0)
  li    $t2, '-'
  bne   $t1, $t2, parse_number_base
  nop
  li    $s1, 1
  addiu $t0, $t0, 1

parse_number_base:
  li    $s2, 10
  lbu   $t1, 0($t0)
  li    $t2, '0'
  bne   $t1, $t2, parse_number_digits
  nop
  lbu   $t1, 1($t0)
  li    $t2, 'x'
  beq   $t1, $t2, parse_number_hex
  nop
  li    $t2, 'X'
  beq   $t1, $t2, parse_number_hex
  nop
  li    $t2, 'b'
  beq   $t1, $t2, parse_number_binary
  nop
  li    $t2, 'B'
  bne   $t1, $t2, parse_number_digits
  nop
parse_number_binary:
  li    $s2, 2
  addiu $t0, $t0, 2
  b     parse_number_digits
  nop
parse_number_hex:
  li    $s2, 16
  addiu $t0, $t0, 2

parse_number_digits:
  move  $t3, $zero
  move  $t4, $zero
parse_number_loop:
  lbu   $t1, 0($t0)
  li    $t2, '0'
  slt   $t5, $t1, $t2
  bne   $t5, $zero, parse_number_alpha
  nop
  li    $t2, ':'
  slt   $t5, $t1, $t2
  beq   $t5, $zero, parse_number_alpha
  nop
  addiu $t6, $t1, -48
  b     parse_number_digit_ready
  nop

parse_number_alpha:
  li    $t2, 16
  bne   $s2, $t2, parse_number_done
  nop
  li    $t2, 'A'
  slt   $t5, $t1, $t2
  bne   $t5, $zero, parse_number_lower
  nop
  li    $t2, 'G'
  slt   $t5, $t1, $t2
  beq   $t5, $zero, parse_number_lower
  nop
  addiu $t6, $t1, -55
  b     parse_number_digit_ready
  nop
parse_number_lower:
  li    $t2, 'a'
  slt   $t5, $t1, $t2
  bne   $t5, $zero, parse_number_done
  nop
  li    $t2, 'g'
  slt   $t5, $t1, $t2
  beq   $t5, $zero, parse_number_done
  nop
  addiu $t6, $t1, -87

parse_number_digit_ready:
  slt   $t5, $t6, $s2
  beq   $t5, $zero, parse_number_done
  nop
  mul   $t3, $t3, $s2
  addu  $t3, $t3, $t6
  addiu $t4, $t4, 1
  addiu $t0, $t0, 1
  b     parse_number_loop
  nop

parse_number_done:
  beq   $t4, $zero, parse_number_fail
  nop
  beq   $s1, $zero, parse_number_success
  nop
  subu  $t3, $zero, $t3
parse_number_success:
  move  $v0, $t3
  move  $v1, $t0
  li    $a2, 1
  b     parse_number_return
  nop
parse_number_fail:
  move  $v0, $zero
  move  $v1, $t0
  move  $a2, $zero
parse_number_return:
  lw    $s2, 0($sp)
  lw    $s1, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

tty_put_uint:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s1, 8($sp)
  sw    $s2, 4($sp)
  sw    $s3, 0($sp)
  move  $s1, $a0
  bne   $s1, $zero, tty_uint_build
  nop
  li    $a0, '0'
  jal   tty_putc
  nop
  b     tty_uint_done
  nop
tty_uint_build:
  la    $s2, digit_buf
  move  $s3, $zero
tty_uint_div:
  li    $t0, 10
  divu  $s1, $t0
  mfhi  $t1
  mflo  $s1
  addiu $t1, $t1, '0'
  sb    $t1, 0($s2)
  addiu $s2, $s2, 1
  addiu $s3, $s3, 1
  bne   $s1, $zero, tty_uint_div
  nop
  addiu $s2, $s2, -1
tty_uint_output:
  lbu   $a0, 0($s2)
  jal   tty_putc
  nop
  addiu $s2, $s2, -1
  addiu $s3, $s3, -1
  bgtz  $s3, tty_uint_output
  nop
tty_uint_done:
  lw    $s3, 0($sp)
  lw    $s2, 4($sp)
  lw    $s1, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

tty_put_int:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s1, 0($sp)
  move  $s1, $a0
  bgez  $s1, tty_int_positive
  nop
  li    $a0, '-'
  jal   tty_putc
  nop
  subu  $s1, $zero, $s1
tty_int_positive:
  move  $a0, $s1
  jal   tty_put_uint
  nop
  lw    $s1, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# a0 = signed value, a1 = field width. Right aligned with spaces.
tty_put_int_width:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s6, $a0
  move  $s7, $a1
  move  $a0, $s6
  jal   int_digits
  nop
  subu  $a0, $s7, $v0
  blez  $a0, tty_put_int_width_value
  nop
  jal   tty_spaces
  nop
tty_put_int_width_value:
  move  $a0, $s6
  jal   tty_put_int
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# a0 = signed value, v0 = printed width including any minus sign
int_digits:
  move  $t0, $a0
  move  $v0, $zero
  bgez  $t0, int_digits_positive
  nop
  subu  $t0, $zero, $t0
  li    $v0, 1
int_digits_positive:
  bne   $t0, $zero, int_digits_loop
  nop
  addiu $v0, $v0, 1
  jr    $ra
  nop
int_digits_loop:
  beq   $t0, $zero, int_digits_done
  nop
  li    $t1, 10
  divu  $t0, $t1
  mflo  $t0
  addiu $v0, $v0, 1
  b     int_digits_loop
  nop
int_digits_done:
  jr    $ra
  nop

tty_put_hex32:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s1, 8($sp)
  sw    $s2, 4($sp)
  sw    $s3, 0($sp)
  move  $s1, $a0
  li    $a0, '0'
  jal   tty_putc
  nop
  li    $a0, 'x'
  jal   tty_putc
  nop
  li    $s2, 28
tty_hex_loop:
  srlv  $s3, $s1, $s2
  andi  $s3, $s3, 0x0f
  slti  $t0, $s3, 10
  bne   $t0, $zero, tty_hex_digit
  nop
  addiu $a0, $s3, 55
  b     tty_hex_emit
  nop
tty_hex_digit:
  addiu $a0, $s3, '0'
tty_hex_emit:
  jal   tty_putc
  nop
  addiu $s2, $s2, -4
  bgez  $s2, tty_hex_loop
  nop
  lw    $s3, 0($sp)
  lw    $s2, 4($sp)
  lw    $s1, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# a0 = value, a1 = digit count. Bare hex without the 0x prefix.
tty_put_hex_digits:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s1, 8($sp)
  sw    $s2, 4($sp)
  sw    $s3, 0($sp)
  move  $s1, $a0
  sll   $s2, $a1, 2
  addiu $s2, $s2, -4
tty_put_hex_digits_loop:
  bltz  $s2, tty_put_hex_digits_done
  nop
  srlv  $s3, $s1, $s2
  andi  $s3, $s3, 0x0f
  slti  $t0, $s3, 10
  bne   $t0, $zero, tty_put_hex_digits_decimal
  nop
  addiu $a0, $s3, 87
  b     tty_put_hex_digits_emit
  nop
tty_put_hex_digits_decimal:
  addiu $a0, $s3, '0'
tty_put_hex_digits_emit:
  jal   tty_putc
  nop
  addiu $s2, $s2, -4
  b     tty_put_hex_digits_loop
  nop
tty_put_hex_digits_done:
  lw    $s3, 0($sp)
  lw    $s2, 4($sp)
  lw    $s1, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# a0 = value, a1 = bit count
tty_put_binary:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s1, 8($sp)
  sw    $s2, 4($sp)
  sw    $s3, 0($sp)
  move  $s1, $a0
  addiu $s2, $a1, -1
tty_put_binary_loop:
  bltz  $s2, tty_put_binary_done
  nop
  srlv  $s3, $s1, $s2
  andi  $s3, $s3, 1
  addiu $a0, $s3, '0'
  jal   tty_putc
  nop
  addiu $s2, $s2, -1
  b     tty_put_binary_loop
  nop
tty_put_binary_done:
  lw    $s3, 0($sp)
  lw    $s2, 4($sp)
  lw    $s1, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop
