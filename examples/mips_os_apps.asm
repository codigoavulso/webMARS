# ============================================================
# MARS-OS 1.0 - userland applications
#
# Everything here is an ordinary shell command: the integer
# calculator, base conversion, the ASCII table, a 5x5 bitmap
# banner font, sequence generators, a wall-clock calendar built
# on 64 bit division, Conway's Game of Life and a guessing game.
# ============================================================

.eqv LIFE_COLS 40
.eqv LIFE_ROWS 16
.eqv LIFE_CELLS 640

.data
.align 2
life_front: .space LIFE_CELLS
life_back:  .space LIFE_CELLS

# 5x5 bitmap font: five rows per glyph, bit 4 is the leftmost pixel.
# Index 0 is the blank glyph, 1..26 are A..Z and 27..36 are 0..9.
banner_font:
  .byte 0x00,0x00,0x00,0x00,0x00
  .byte 0x0e,0x11,0x1f,0x11,0x11
  .byte 0x1e,0x11,0x1e,0x11,0x1e
  .byte 0x0e,0x11,0x10,0x11,0x0e
  .byte 0x1e,0x11,0x11,0x11,0x1e
  .byte 0x1f,0x10,0x1e,0x10,0x1f
  .byte 0x1f,0x10,0x1e,0x10,0x10
  .byte 0x0f,0x10,0x13,0x11,0x0f
  .byte 0x11,0x11,0x1f,0x11,0x11
  .byte 0x1f,0x04,0x04,0x04,0x1f
  .byte 0x01,0x01,0x01,0x11,0x0e
  .byte 0x11,0x12,0x1c,0x12,0x11
  .byte 0x10,0x10,0x10,0x10,0x1f
  .byte 0x11,0x1b,0x15,0x11,0x11
  .byte 0x11,0x19,0x15,0x13,0x11
  .byte 0x0e,0x11,0x11,0x11,0x0e
  .byte 0x1e,0x11,0x1e,0x10,0x10
  .byte 0x0e,0x11,0x15,0x12,0x0d
  .byte 0x1e,0x11,0x1e,0x12,0x11
  .byte 0x0f,0x10,0x0e,0x01,0x1e
  .byte 0x1f,0x04,0x04,0x04,0x04
  .byte 0x11,0x11,0x11,0x11,0x0e
  .byte 0x11,0x11,0x11,0x0a,0x04
  .byte 0x11,0x11,0x15,0x1b,0x11
  .byte 0x11,0x0a,0x04,0x0a,0x11
  .byte 0x11,0x0a,0x04,0x04,0x04
  .byte 0x1f,0x02,0x04,0x08,0x1f
  .byte 0x0e,0x13,0x15,0x19,0x0e
  .byte 0x04,0x0c,0x04,0x04,0x0e
  .byte 0x0e,0x11,0x02,0x04,0x1f
  .byte 0x1e,0x01,0x06,0x01,0x1e
  .byte 0x02,0x06,0x0a,0x1f,0x02
  .byte 0x1f,0x10,0x1e,0x01,0x1e
  .byte 0x06,0x08,0x1e,0x11,0x0e
  .byte 0x1f,0x01,0x02,0x04,0x08
  .byte 0x0e,0x11,0x0e,0x11,0x0e
  .byte 0x0e,0x11,0x0f,0x01,0x0e
.align 2

.text

# ------------------------------------------------------------
# calc A OP B
# ------------------------------------------------------------

command_calc:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   parse_number
  nop
  beq   $a2, $zero, calc_usage
  nop
  move  $s3, $v0
  move  $s4, $v1

  move  $a0, $s4
  jal   skip_spaces
  nop
  move  $s4, $v0
  lbu   $s5, 0($s4)
  beq   $s5, $zero, calc_usage
  nop
  addiu $s4, $s4, 1

  move  $a0, $s4
  jal   parse_number
  nop
  beq   $a2, $zero, calc_usage
  nop
  move  $s6, $v0
  move  $s4, $v1
  move  $a0, $s4
  jal   skip_spaces
  nop
  lbu   $t0, 0($v0)
  bne   $t0, $zero, calc_usage
  nop

  li    $t0, '+'
  beq   $s5, $t0, calc_add
  nop
  li    $t0, '-'
  beq   $s5, $t0, calc_sub
  nop
  li    $t0, '*'
  beq   $s5, $t0, calc_mul
  nop
  li    $t0, 'x'
  beq   $s5, $t0, calc_mul
  nop
  li    $t0, '/'
  beq   $s5, $t0, calc_div
  nop
  li    $t0, '%'
  beq   $s5, $t0, calc_mod
  nop
  li    $t0, '&'
  beq   $s5, $t0, calc_and
  nop
  li    $t0, '|'
  beq   $s5, $t0, calc_or
  nop
  li    $t0, '^'
  beq   $s5, $t0, calc_xor
  nop
  li    $t0, '<'
  beq   $s5, $t0, calc_shl
  nop
  li    $t0, '>'
  beq   $s5, $t0, calc_shr
  nop
  b     calc_usage
  nop

calc_add:
  addu  $s7, $s3, $s6
  b     calc_print
  nop
calc_sub:
  subu  $s7, $s3, $s6
  b     calc_print
  nop
calc_mul:
  mul   $s7, $s3, $s6
  b     calc_print
  nop
calc_div:
  beq   $s6, $zero, calc_zero
  nop
  div   $s3, $s6
  mflo  $s7
  b     calc_print
  nop
calc_mod:
  beq   $s6, $zero, calc_zero
  nop
  div   $s3, $s6
  mfhi  $s7
  b     calc_print
  nop
calc_and:
  and   $s7, $s3, $s6
  b     calc_print
  nop
calc_or:
  or    $s7, $s3, $s6
  b     calc_print
  nop
calc_xor:
  xor   $s7, $s3, $s6
  b     calc_print
  nop
calc_shl:
  andi  $t0, $s6, 31
  sllv  $s7, $s3, $t0
  b     calc_print
  nop
calc_shr:
  andi  $t0, $s6, 31
  srav  $s7, $s3, $t0

calc_print:
  la    $a0, result_prefix
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_int
  nop
  la    $a0, result_hex
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_hex32
  nop
  la    $a0, result_close
  jal   tty_puts
  nop
  b     calc_done
  nop
calc_zero:
  la    $a0, msg_div_zero
  jal   tty_puts
  nop
  b     calc_done
  nop
calc_usage:
  la    $a0, msg_calc_usage
  jal   tty_puts
  nop
calc_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# ------------------------------------------------------------
# base N - the same integer in four notations
# ------------------------------------------------------------

command_base:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   parse_number
  nop
  beq   $a2, $zero, command_base_usage
  nop
  move  $s7, $v0

  la    $a0, base_decimal
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_int
  nop
  jal   tty_crlf
  nop
  la    $a0, base_hex
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_hex32
  nop
  jal   tty_crlf
  nop
  la    $a0, base_binary
  jal   tty_puts
  nop
  move  $a0, $s7
  li    $a1, 32
  jal   tty_put_binary
  nop
  jal   tty_crlf
  nop
  la    $a0, base_unsigned
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
  b     command_base_done
  nop
command_base_usage:
  la    $a0, msg_base_usage
  jal   tty_puts
  nop
command_base_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# ascii - printable code points in a compact table
# ------------------------------------------------------------

command_ascii:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  li    $s7, 32
  move  $s6, $zero
command_ascii_loop:
  li    $t0, 127
  beq   $s7, $t0, command_ascii_done
  nop
  move  $a0, $s7
  li    $a1, 4
  jal   tty_put_int_width
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  move  $a0, $s7
  jal   tty_putc
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  addiu $s6, $s6, 1
  li    $t0, 10
  bne   $s6, $t0, command_ascii_next
  nop
  jal   tty_crlf
  nop
  move  $s6, $zero
command_ascii_next:
  addiu $s7, $s7, 1
  b     command_ascii_loop
  nop
command_ascii_done:
  beq   $s6, $zero, command_ascii_return
  nop
  jal   tty_crlf
  nop
command_ascii_return:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# banner TEXT - 5x5 bitmap letters
# ------------------------------------------------------------

# a0 = character, v0 = glyph index
banner_glyph:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   char_upper
  nop
  move  $t0, $v0
  li    $t1, 'A'
  slt   $t2, $t0, $t1
  bne   $t2, $zero, banner_glyph_digit
  nop
  li    $t1, 'Z'
  slt   $t2, $t1, $t0
  bne   $t2, $zero, banner_glyph_digit
  nop
  addiu $v0, $t0, -64
  b     banner_glyph_done
  nop
banner_glyph_digit:
  li    $t1, '0'
  slt   $t2, $t0, $t1
  bne   $t2, $zero, banner_glyph_blank
  nop
  li    $t1, '9'
  slt   $t2, $t1, $t0
  bne   $t2, $zero, banner_glyph_blank
  nop
  addiu $v0, $t0, -48
  addiu $v0, $v0, 27
  b     banner_glyph_done
  nop
banner_glyph_blank:
  move  $v0, $zero
banner_glyph_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_banner:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  lbu   $t0, 0($s2)
  beq   $t0, $zero, command_banner_usage
  nop
  move  $s4, $zero
command_banner_row:
  li    $t0, 5
  beq   $s4, $t0, command_banner_done
  nop
  move  $s5, $s2
  move  $s6, $zero
command_banner_char:
  lbu   $a0, 0($s5)
  beq   $a0, $zero, command_banner_row_end
  nop
  li    $t0, 12
  beq   $s6, $t0, command_banner_row_end
  nop
  jal   banner_glyph
  nop
  li    $t0, 5
  mul   $t0, $v0, $t0
  la    $t1, banner_font
  addu  $t1, $t1, $t0
  addu  $t1, $t1, $s4
  lbu   $s7, 0($t1)
  li    $s3, 4
command_banner_bits:
  bltz  $s3, command_banner_char_next
  nop
  srlv  $t3, $s7, $s3
  andi  $t3, $t3, 1
  beq   $t3, $zero, command_banner_space
  nop
  li    $a0, '#'
  b     command_banner_emit
  nop
command_banner_space:
  li    $a0, ' '
command_banner_emit:
  jal   tty_putc
  nop
  addiu $s3, $s3, -1
  b     command_banner_bits
  nop
command_banner_char_next:
  li    $a0, ' '
  jal   tty_putc
  nop
  addiu $s5, $s5, 1
  addiu $s6, $s6, 1
  b     command_banner_char
  nop
command_banner_row_end:
  jal   tty_crlf
  nop
  addiu $s4, $s4, 1
  b     command_banner_row
  nop
command_banner_usage:
  la    $a0, msg_banner_usage
  jal   tty_puts
  nop
command_banner_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# ------------------------------------------------------------
# fib N and primes N
# ------------------------------------------------------------

command_fib:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   parse_number
  nop
  beq   $a2, $zero, command_fib_usage
  nop
  blez  $v0, command_fib_usage
  nop
  li    $t0, 47
  slt   $t1, $t0, $v0
  bne   $t1, $zero, command_fib_usage
  nop
  move  $s4, $v0
  move  $s5, $zero
  li    $s6, 1
  move  $s7, $zero
command_fib_loop:
  beq   $s7, $s4, command_fib_end
  nop
  move  $a0, $s5
  jal   tty_put_uint
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  addu  $t0, $s5, $s6
  move  $s5, $s6
  move  $s6, $t0
  addiu $s7, $s7, 1
  b     command_fib_loop
  nop
command_fib_end:
  jal   tty_crlf
  nop
  b     command_fib_done
  nop
command_fib_usage:
  la    $a0, msg_fib_usage
  jal   tty_puts
  nop
command_fib_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

command_primes:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   parse_number
  nop
  beq   $a2, $zero, command_primes_usage
  nop
  li    $t0, 2
  slt   $t1, $v0, $t0
  bne   $t1, $zero, command_primes_usage
  nop
  li    $t0, 5000
  slt   $t1, $t0, $v0
  bne   $t1, $zero, command_primes_usage
  nop
  move  $s4, $v0
  li    $s5, 2
command_primes_loop:
  slt   $t0, $s4, $s5
  bne   $t0, $zero, command_primes_end
  nop
  li    $s6, 2
command_primes_trial:
  mul   $t0, $s6, $s6
  slt   $t1, $s5, $t0
  bne   $t1, $zero, command_primes_hit
  nop
  div   $s5, $s6
  mfhi  $t2
  beq   $t2, $zero, command_primes_next
  nop
  addiu $s6, $s6, 1
  b     command_primes_trial
  nop
command_primes_hit:
  move  $a0, $s5
  jal   tty_put_uint
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
command_primes_next:
  addiu $s5, $s5, 1
  b     command_primes_loop
  nop
command_primes_end:
  jal   tty_crlf
  nop
  b     command_primes_done
  nop
command_primes_usage:
  la    $a0, msg_primes_usage
  jal   tty_puts
  nop
command_primes_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# ------------------------------------------------------------
# rand N and sleep MS
# ------------------------------------------------------------

command_rand:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   parse_number
  nop
  beq   $a2, $zero, command_rand_usage
  nop
  blez  $v0, command_rand_usage
  nop
  li    $t0, 1000001
  slt   $t1, $v0, $t0
  beq   $t1, $zero, command_rand_usage
  nop
  move  $a1, $v0
  move  $a0, $zero
  li    $v0, 42
  syscall
  move  $s7, $a0
  la    $a0, result_prefix
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
  b     command_rand_done
  nop
command_rand_usage:
  la    $a0, msg_rand_usage
  jal   tty_puts
  nop
command_rand_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

command_sleep:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  move  $a0, $s2
  jal   parse_number
  nop
  beq   $a2, $zero, command_sleep_usage
  nop
  bltz  $v0, command_sleep_usage
  nop
  li    $t0, 10001
  slt   $t1, $v0, $t0
  beq   $t1, $zero, command_sleep_usage
  nop
  move  $a0, $v0
  li    $v0, 32
  syscall
  la    $a0, msg_awake
  jal   tty_puts
  nop
  b     command_sleep_done
  nop
command_sleep_usage:
  la    $a0, msg_sleep_usage
  jal   tty_puts
  nop
command_sleep_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# ------------------------------------------------------------
# 64 bit division, used by the calendar
#
# a0 = high word, a1 = low word, a2 = divisor
# v0 = quotient high, v1 = quotient low, a3 = remainder
# ------------------------------------------------------------

div64:
  move  $t0, $a0
  move  $t1, $a1
  move  $t2, $zero
  move  $t3, $zero
  move  $t4, $zero
  li    $t5, 64
div64_loop:
  blez  $t5, div64_done
  nop
  # remainder = remainder*2 + top bit of the dividend
  sll   $t4, $t4, 1
  srl   $t6, $t0, 31
  or    $t4, $t4, $t6
  sll   $t2, $t2, 1
  srl   $t6, $t3, 31
  or    $t2, $t2, $t6
  sll   $t3, $t3, 1
  sll   $t0, $t0, 1
  srl   $t6, $t1, 31
  or    $t0, $t0, $t6
  sll   $t1, $t1, 1
  sltu  $t6, $t4, $a2
  bne   $t6, $zero, div64_next
  nop
  subu  $t4, $t4, $a2
  ori   $t3, $t3, 1
div64_next:
  addiu $t5, $t5, -1
  b     div64_loop
  nop
div64_done:
  move  $v0, $t2
  move  $v1, $t3
  move  $a3, $t4
  jr    $ra
  nop

# ------------------------------------------------------------
# date - civil calendar from the host epoch
# ------------------------------------------------------------

command_date:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)

  li    $v0, 30
  syscall
  move  $t8, $a0
  move  $t9, $a1
  move  $a0, $t9
  move  $a1, $t8
  li    $a2, 86400000
  jal   div64
  nop
  move  $s3, $v1          # whole days since 1970-01-01
  move  $s4, $a3          # milliseconds inside the day

  # Civil date from a day number, the standard era based method.
  addiu $t0, $s3, 719468
  li    $t1, 146097
  divu  $t0, $t1
  mflo  $s5               # era
  mfhi  $s6               # day of era
  li    $t1, 1460
  divu  $s6, $t1
  mflo  $t2
  li    $t1, 36524
  divu  $s6, $t1
  mflo  $t3
  li    $t1, 146096
  divu  $s6, $t1
  mflo  $t4
  subu  $t5, $s6, $t2
  addu  $t5, $t5, $t3
  subu  $t5, $t5, $t4
  li    $t1, 365
  divu  $t5, $t1
  mflo  $s7               # year of era

  li    $t1, 365
  mul   $t2, $s7, $t1
  li    $t1, 4
  divu  $s7, $t1
  mflo  $t3
  addu  $t2, $t2, $t3
  li    $t1, 100
  divu  $s7, $t1
  mflo  $t3
  subu  $t2, $t2, $t3
  subu  $t2, $s6, $t2     # day of year

  li    $t1, 5
  mul   $t3, $t2, $t1
  addiu $t3, $t3, 2
  li    $t1, 153
  divu  $t3, $t1
  mflo  $t3               # month position
  li    $t1, 153
  mul   $t4, $t3, $t1
  addiu $t4, $t4, 2
  li    $t1, 5
  divu  $t4, $t1
  mflo  $t4
  subu  $t4, $t2, $t4
  addiu $t4, $t4, 1       # day of month

  li    $t1, 10
  slt   $t5, $t3, $t1
  beq   $t5, $zero, command_date_late_month
  nop
  addiu $t3, $t3, 3
  b     command_date_year
  nop
command_date_late_month:
  addiu $t3, $t3, -9
command_date_year:
  li    $t1, 400
  mul   $t5, $s5, $t1
  addu  $t5, $t5, $s7     # calendar year
  li    $t1, 2
  slt   $t6, $t1, $t3
  bne   $t6, $zero, command_date_print
  nop
  addiu $t5, $t5, 1

command_date_print:
  move  $s5, $t5
  move  $s6, $t3
  move  $s7, $t4

  la    $a0, date_prefix
  jal   tty_puts
  nop
  move  $a0, $s5
  jal   tty_put_uint
  nop
  la    $a0, date_dash
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   put_two_digits
  nop
  la    $a0, date_dash
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   put_two_digits
  nop
  li    $a0, ' '
  jal   tty_putc
  nop

  li    $t0, 3600000
  divu  $s4, $t0
  mflo  $s5
  mfhi  $s6
  li    $t0, 60000
  divu  $s6, $t0
  mflo  $s7
  mfhi  $s6
  li    $t0, 1000
  divu  $s6, $t0
  mflo  $s6

  move  $a0, $s5
  jal   put_two_digits
  nop
  la    $a0, date_colon
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   put_two_digits
  nop
  la    $a0, date_colon
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   put_two_digits
  nop
  la    $a0, date_utc
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  la    $a0, date_days_prefix
  jal   tty_puts
  nop
  move  $a0, $s3
  jal   tty_put_uint
  nop
  jal   tty_crlf
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

put_two_digits:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  li    $t0, 10
  slt   $t1, $s7, $t0
  beq   $t1, $zero, put_two_digits_value
  nop
  li    $a0, '0'
  jal   tty_putc
  nop
put_two_digits_value:
  move  $a0, $s7
  jal   tty_put_uint
  nop
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# life [generations] - Conway's Game of Life
# ------------------------------------------------------------

command_life:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  li    $s3, 24
  lbu   $t0, 0($s2)
  beq   $t0, $zero, command_life_seed
  nop
  move  $a0, $s2
  jal   parse_number
  nop
  beq   $a2, $zero, command_life_usage
  nop
  blez  $v0, command_life_usage
  nop
  li    $t0, 201
  slt   $t1, $v0, $t0
  beq   $t1, $zero, command_life_usage
  nop
  move  $s3, $v0

command_life_seed:
  la    $s4, life_front
  move  $s5, $zero
command_life_seed_loop:
  li    $t0, LIFE_CELLS
  beq   $s5, $t0, command_life_run
  nop
  li    $a1, 100
  move  $a0, $zero
  li    $v0, 42
  syscall
  li    $t0, 32
  slt   $t1, $a0, $t0
  addu  $t2, $s4, $s5
  sb    $t1, 0($t2)
  addiu $s5, $s5, 1
  b     command_life_seed_loop
  nop

command_life_run:
  jal   ansi_clear_screen
  nop
  move  $s6, $zero
command_life_generation:
  beq   $s6, $s3, command_life_finish
  nop
  li    $a0, 1
  li    $a1, 1
  jal   ansi_goto
  nop
  la    $a0, life_header
  jal   tty_puts
  nop
  addiu $a0, $s6, 1
  jal   tty_put_uint
  nop
  la    $a0, life_of
  jal   tty_puts
  nop
  move  $a0, $s3
  jal   tty_put_uint
  nop
  jal   ansi_clear_eol
  nop

  move  $s5, $zero
command_life_draw_row:
  li    $t0, LIFE_ROWS
  beq   $s5, $t0, command_life_step
  nop
  addiu $a0, $s5, 2
  li    $a1, 1
  jal   ansi_goto
  nop
  move  $s7, $zero
command_life_draw_col:
  li    $t0, LIFE_COLS
  beq   $s7, $t0, command_life_draw_row_next
  nop
  li    $t0, LIFE_COLS
  mul   $t0, $s5, $t0
  addu  $t0, $t0, $s7
  la    $t1, life_front
  addu  $t1, $t1, $t0
  lbu   $t2, 0($t1)
  beq   $t2, $zero, command_life_dead
  nop
  li    $a0, '#'
  b     command_life_plot
  nop
command_life_dead:
  li    $a0, '.'
command_life_plot:
  jal   tty_putc
  nop
  addiu $s7, $s7, 1
  b     command_life_draw_col
  nop
command_life_draw_row_next:
  jal   ansi_clear_eol
  nop
  addiu $s5, $s5, 1
  b     command_life_draw_row
  nop

command_life_step:
  jal   life_advance
  nop
  li    $a0, 90
  li    $v0, 32
  syscall
  addiu $s6, $s6, 1
  b     command_life_generation
  nop

command_life_finish:
  li    $a0, LIFE_ROWS+3
  li    $a1, 1
  jal   ansi_goto
  nop
  la    $a0, life_done
  jal   tty_puts
  nop
  b     command_life_return
  nop
command_life_usage:
  la    $a0, msg_life_usage
  jal   tty_puts
  nop
command_life_return:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# One generation, with the edges wrapping around like a torus.
life_advance:
  move  $t8, $zero
life_advance_row:
  li    $t0, LIFE_ROWS
  beq   $t8, $t0, life_advance_commit
  nop
  move  $t9, $zero
life_advance_col:
  li    $t0, LIFE_COLS
  beq   $t9, $t0, life_advance_row_next
  nop
  move  $a0, $t8
  move  $a1, $t9
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $t8, 4($sp)
  sw    $t9, 0($sp)
  jal   life_neighbours
  nop
  lw    $t9, 0($sp)
  lw    $t8, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  li    $t0, LIFE_COLS
  mul   $t0, $t8, $t0
  addu  $t0, $t0, $t9
  la    $t1, life_front
  addu  $t1, $t1, $t0
  lbu   $t2, 0($t1)
  la    $t3, life_back
  addu  $t3, $t3, $t0
  bne   $t2, $zero, life_advance_alive
  nop
  li    $t4, 3
  bne   $v0, $t4, life_advance_dead
  nop
  li    $t4, 1
  sb    $t4, 0($t3)
  b     life_advance_col_next
  nop
life_advance_alive:
  li    $t4, 2
  beq   $v0, $t4, life_advance_keep
  nop
  li    $t4, 3
  bne   $v0, $t4, life_advance_dead
  nop
life_advance_keep:
  li    $t4, 1
  sb    $t4, 0($t3)
  b     life_advance_col_next
  nop
life_advance_dead:
  sb    $zero, 0($t3)
life_advance_col_next:
  addiu $t9, $t9, 1
  b     life_advance_col
  nop
life_advance_row_next:
  addiu $t8, $t8, 1
  b     life_advance_row
  nop
life_advance_commit:
  la    $t0, life_front
  la    $t1, life_back
  li    $t2, LIFE_CELLS
life_advance_copy:
  blez  $t2, life_advance_done
  nop
  lbu   $t3, 0($t1)
  sb    $t3, 0($t0)
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  addiu $t2, $t2, -1
  b     life_advance_copy
  nop
life_advance_done:
  jr    $ra
  nop

# a0 = row, a1 = column, v0 = live neighbour count
life_neighbours:
  move  $v0, $zero
  li    $t0, -1
life_neighbours_dr:
  li    $t1, 2
  beq   $t0, $t1, life_neighbours_done
  nop
  li    $t2, -1
life_neighbours_dc:
  li    $t1, 2
  beq   $t2, $t1, life_neighbours_dr_next
  nop
  or    $t3, $t0, $t2
  bne   $t3, $zero, life_neighbours_probe
  nop
  b     life_neighbours_dc_next
  nop
life_neighbours_probe:
  # The board is a torus. Wrapping by comparison rather than by remainder
  # keeps a generation inside a few hundred thousand instructions.
  addu  $t4, $a0, $t0
  bgez  $t4, life_neighbours_row_low
  nop
  addiu $t4, $t4, LIFE_ROWS
life_neighbours_row_low:
  li    $t5, LIFE_ROWS
  slt   $t7, $t4, $t5
  bne   $t7, $zero, life_neighbours_row_ready
  nop
  subu  $t4, $t4, $t5
life_neighbours_row_ready:
  addu  $t6, $a1, $t2
  bgez  $t6, life_neighbours_col_low
  nop
  addiu $t6, $t6, LIFE_COLS
life_neighbours_col_low:
  li    $t5, LIFE_COLS
  slt   $t7, $t6, $t5
  bne   $t7, $zero, life_neighbours_col_ready
  nop
  subu  $t6, $t6, $t5
life_neighbours_col_ready:
  li    $t5, LIFE_COLS
  mul   $t4, $t4, $t5
  addu  $t4, $t4, $t6
  la    $t5, life_front
  addu  $t5, $t5, $t4
  lbu   $t7, 0($t5)
  addu  $v0, $v0, $t7
life_neighbours_dc_next:
  addiu $t2, $t2, 1
  b     life_neighbours_dc
  nop
life_neighbours_dr_next:
  addiu $t0, $t0, 1
  b     life_neighbours_dr
  nop
life_neighbours_done:
  jr    $ra
  nop

# ------------------------------------------------------------
# guess - a small interactive game over the line editor
# ------------------------------------------------------------

command_guess:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  li    $a1, 100
  move  $a0, $zero
  li    $v0, 42
  syscall
  addiu $s5, $a0, 1
  move  $s6, $zero
  la    $a0, guess_intro
  jal   tty_puts
  nop
command_guess_loop:
  li    $t0, 7
  beq   $s6, $t0, command_guess_lost
  nop
  la    $a0, guess_prompt
  jal   tty_puts
  nop
  la    $a0, scratch_buf
  li    $a1, LINE_CAP
  jal   tty_read_line
  nop
  la    $a0, scratch_buf
  jal   parse_number
  nop
  beq   $a2, $zero, command_guess_loop
  nop
  move  $s7, $v0
  addiu $s6, $s6, 1
  beq   $s7, $s5, command_guess_won
  nop
  slt   $t0, $s7, $s5
  beq   $t0, $zero, command_guess_lower
  nop
  la    $a0, guess_higher
  jal   tty_puts
  nop
  b     command_guess_loop
  nop
command_guess_lower:
  la    $a0, guess_lower
  jal   tty_puts
  nop
  b     command_guess_loop
  nop
command_guess_won:
  la    $a0, guess_won
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   tty_put_uint
  nop
  la    $a0, guess_tries
  jal   tty_puts
  nop
  b     command_guess_done
  nop
command_guess_lost:
  la    $a0, guess_lost
  jal   tty_puts
  nop
  move  $a0, $s5
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
command_guess_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop
