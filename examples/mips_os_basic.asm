# ============================================================
# MARS-OS 1.1 - integer BASIC interpreter
#
# A line numbered BASIC in the Tiny BASIC tradition: one
# statement per line, 26 integer variables A..Z, and a program
# held in a sorted line table rather than in a text blob, so
# typing a line number replaces or deletes that line in place.
#
#   10 FOR I = 1 TO 8
#   20 LET T = T + I * I
#   30 PRINT I, I * I, T
#   40 NEXT I
#   50 IF T > 100 THEN PRINT "LARGE"
#
# Statements: PRINT LET INPUT IF/THEN GOTO GOSUB RETURN
#             FOR/TO/STEP NEXT REM END STOP CLS
# Immediate:  RUN LIST NEW SAVE LOAD BYE
# Operators:  OR AND, = <> < > <= >=, + -, * / MOD, unary - NOT
# Functions:  ABS(x) SGN(x) RND(n)
#
# Programs are saved to the RAM disk as their own listing, so the
# full screen editor and the BASIC editor read the same files.
# ============================================================

.eqv BAS_MAX_LINES 64
.eqv BAS_LINE_CAP  64
.eqv BAS_STACK     8

.data
.align 2
bas_numbers:   .space 256       # BAS_MAX_LINES words
bas_text:      .space 4096      # BAS_MAX_LINES * BAS_LINE_CAP
bas_count:     .word 0
bas_vars:      .space 104       # 26 words, one per variable
bas_pc:        .word 0
bas_jumped:    .word 0
bas_running:   .word 0
bas_broke:     .word 0
bas_leaving:   .word 0
bas_err_msg:   .word 0
bas_column:    .word 0
bas_gosub:     .space 32        # BAS_STACK return line indexes
bas_gosub_sp:  .word 0
bas_for_var:   .space 32
bas_for_limit: .space 32
bas_for_step:  .space 32
bas_for_line:  .space 32
bas_for_sp:    .word 0
bas_line_buf:  .space 128
bas_out:       .space 1024      # FS_FILE_CAP, used by SAVE

# Keywords stay in English: they are the language of BASIC itself,
# not user interface text, so they are not localized.
kw_print:  .asciiz "PRINT"
kw_let:    .asciiz "LET"
kw_input:  .asciiz "INPUT"
kw_if:     .asciiz "IF"
kw_then:   .asciiz "THEN"
kw_goto:   .asciiz "GOTO"
kw_gosub:  .asciiz "GOSUB"
kw_return: .asciiz "RETURN"
kw_for:    .asciiz "FOR"
kw_to:     .asciiz "TO"
kw_step:   .asciiz "STEP"
kw_next:   .asciiz "NEXT"
kw_rem:    .asciiz "REM"
kw_end:    .asciiz "END"
kw_stop:   .asciiz "STOP"
kw_cls:    .asciiz "CLS"
kw_list:   .asciiz "LIST"
kw_run:    .asciiz "RUN"
kw_new:    .asciiz "NEW"
kw_save:   .asciiz "SAVE"
kw_load:   .asciiz "LOAD"
kw_bye:    .asciiz "BYE"
kw_mod:    .asciiz "MOD"
kw_and:    .asciiz "AND"
kw_or:     .asciiz "OR"
kw_not:    .asciiz "NOT"
kw_abs:    .asciiz "ABS"
kw_sgn:    .asciiz "SGN"
kw_rnd:    .asciiz "RND"
bas_space: .asciiz " "

.text

# ------------------------------------------------------------
# Program storage
# ------------------------------------------------------------

# a0 = index, v0 = text pointer
bas_line_ptr:
  li    $t0, BAS_LINE_CAP
  mul   $t0, $a0, $t0
  la    $v0, bas_text
  addu  $v0, $v0, $t0
  jr    $ra
  nop

# a0 = index, v0 = line number
bas_line_number:
  sll   $t0, $a0, 2
  la    $t1, bas_numbers
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop

# a0 = line number, v0 = insertion index, v1 = 1 when it already exists
bas_find_line:
  lw    $t0, bas_count
  move  $v0, $zero
  la    $t1, bas_numbers
bas_find_line_loop:
  slt   $t2, $v0, $t0
  beq   $t2, $zero, bas_find_line_missing
  nop
  sll   $t3, $v0, 2
  addu  $t3, $t1, $t3
  lw    $t4, 0($t3)
  beq   $t4, $a0, bas_find_line_hit
  nop
  slt   $t2, $t4, $a0
  beq   $t2, $zero, bas_find_line_missing
  nop
  addiu $v0, $v0, 1
  b     bas_find_line_loop
  nop
bas_find_line_hit:
  li    $v1, 1
  jr    $ra
  nop
bas_find_line_missing:
  move  $v1, $zero
  jr    $ra
  nop

bas_new:
  sw    $zero, bas_count
  jr    $ra
  nop

# a0 = line number, a1 = statement text. An empty statement deletes.
bas_store_line:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s3, $a0
  move  $s4, $a1
  jal   bas_find_line
  nop
  move  $s5, $v0              # insertion index
  move  $s6, $v1              # 1 when the line already exists
  lbu   $t0, 0($s4)
  bne   $t0, $zero, bas_store_line_content
  nop

  # Empty text deletes, but only if there is something to delete.
  beq   $s6, $zero, bas_store_line_done
  nop
  lw    $t0, bas_count
  addiu $t1, $s5, 1
  subu  $s7, $t0, $t1         # entries following the one being removed
  blez  $s7, bas_store_line_shrink
  nop
  sll   $a2, $s7, 2
  sll   $t3, $s5, 2
  la    $t4, bas_numbers
  addu  $a0, $t4, $t3
  addiu $a1, $a0, 4
  jal   mem_move
  nop
  li    $t2, BAS_LINE_CAP
  mul   $s6, $s7, $t2
  move  $a0, $s5
  jal   bas_line_ptr
  nop
  move  $a0, $v0
  addiu $a1, $v0, BAS_LINE_CAP
  move  $a2, $s6
  jal   mem_move
  nop
bas_store_line_shrink:
  lw    $t0, bas_count
  addiu $t0, $t0, -1
  sw    $t0, bas_count
  b     bas_store_line_done
  nop

bas_store_line_content:
  bne   $s6, $zero, bas_store_line_write
  nop
  lw    $t0, bas_count
  li    $t1, BAS_MAX_LINES
  slt   $t2, $t0, $t1
  bne   $t2, $zero, bas_store_line_shift
  nop
  la    $a0, basic_err_full
  jal   bas_error
  nop
  b     bas_store_line_done
  nop
bas_store_line_shift:
  subu  $s7, $t0, $s5         # entries that move up by one slot
  blez  $s7, bas_store_line_place
  nop
  sll   $a2, $s7, 2
  sll   $t3, $s5, 2
  la    $t4, bas_numbers
  addu  $a1, $t4, $t3
  addiu $a0, $a1, 4
  jal   mem_move
  nop
  li    $t2, BAS_LINE_CAP
  mul   $s6, $s7, $t2
  move  $a0, $s5
  jal   bas_line_ptr
  nop
  move  $a1, $v0
  addiu $a0, $v0, BAS_LINE_CAP
  move  $a2, $s6
  jal   mem_move
  nop
bas_store_line_place:
  sll   $t3, $s5, 2
  la    $t4, bas_numbers
  addu  $t4, $t4, $t3
  sw    $s3, 0($t4)
  lw    $t0, bas_count
  addiu $t0, $t0, 1
  sw    $t0, bas_count

bas_store_line_write:
  move  $a0, $s5
  jal   bas_line_ptr
  nop
  move  $a0, $v0
  move  $a1, $s4
  li    $a2, BAS_LINE_CAP-1
  jal   str_copy_n
  nop
bas_store_line_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

bas_list:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $zero
bas_list_loop:
  lw    $s6, bas_count
  slt   $t0, $s7, $s6
  beq   $t0, $zero, bas_list_done
  nop
  move  $a0, $s7
  jal   bas_line_number
  nop
  move  $a0, $v0
  li    $a1, 5
  jal   tty_put_int_width
  nop
  la    $a0, bas_space
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   bas_line_ptr
  nop
  move  $a0, $v0
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  addiu $s7, $s7, 1
  b     bas_list_loop
  nop
bas_list_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# Output with column tracking
#
# PRINT needs to know the current column so that a comma can pad
# to the next eight column zone, so every byte the interpreter
# emits goes through here instead of straight to tty_putc.
# ------------------------------------------------------------

bas_putc:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  jal   tty_putc
  nop
  li    $t0, 32
  slt   $t1, $s7, $t0
  bne   $t1, $zero, bas_putc_done
  nop
  lw    $t0, bas_column
  addiu $t0, $t0, 1
  sw    $t0, bas_column
bas_putc_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

bas_puts:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
bas_puts_loop:
  lbu   $a0, 0($s7)
  beq   $a0, $zero, bas_puts_done
  nop
  jal   bas_putc
  nop
  addiu $s7, $s7, 1
  b     bas_puts_loop
  nop
bas_puts_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

bas_newline:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   tty_crlf
  nop
  sw    $zero, bas_column
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

bas_put_int:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  jal   int_digits
  nop
  lw    $t0, bas_column
  addu  $t0, $t0, $v0
  sw    $t0, bas_column
  move  $a0, $s7
  jal   tty_put_int
  nop
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# Errors
#
# One slot holds the pending message. Every level of the parser
# checks it, so a failure unwinds without threading a status
# register through the whole recursive descent.
# ------------------------------------------------------------

# a0 = message pointer
bas_error:
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_error_done
  nop
  sw    $a0, bas_err_msg
bas_error_done:
  jr    $ra
  nop

bas_clear_error:
  sw    $zero, bas_err_msg
  jr    $ra
  nop

# ------------------------------------------------------------
# Keyword matching
#
# a0 = text, a1 = keyword. v0 = 1 on a match, v1 = text after it.
# ------------------------------------------------------------

bas_match:
  move  $t8, $a0
  move  $t9, $a1
bas_match_loop:
  lbu   $t1, 0($t9)
  beq   $t1, $zero, bas_match_hit
  nop
  lbu   $t2, 0($t8)
  beq   $t2, $zero, bas_match_miss
  nop
  # Fold the source byte to upper case before comparing.
  li    $t3, 'a'
  slt   $t4, $t2, $t3
  bne   $t4, $zero, bas_match_compare
  nop
  li    $t3, 'z'
  slt   $t4, $t3, $t2
  bne   $t4, $zero, bas_match_compare
  nop
  addiu $t2, $t2, -32
bas_match_compare:
  bne   $t1, $t2, bas_match_miss
  nop
  addiu $t8, $t8, 1
  addiu $t9, $t9, 1
  b     bas_match_loop
  nop
bas_match_hit:
  li    $v0, 1
  move  $v1, $t8
  jr    $ra
  nop
bas_match_miss:
  move  $v0, $zero
  move  $v1, $a0
  jr    $ra
  nop

# a0 = character, v0 = 1 when it can name a variable
bas_is_letter:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   char_upper
  nop
  move  $t0, $v0
  move  $v0, $zero
  li    $t1, 'A'
  slt   $t2, $t0, $t1
  bne   $t2, $zero, bas_is_letter_done
  nop
  li    $t1, 'Z'
  slt   $t2, $t1, $t0
  bne   $t2, $zero, bas_is_letter_done
  nop
  li    $v0, 1
bas_is_letter_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# a0 = variable index, v0 = value
bas_var_get:
  sll   $t0, $a0, 2
  la    $t1, bas_vars
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop

# a0 = variable index, a1 = value
bas_var_set:
  sll   $t0, $a0, 2
  la    $t1, bas_vars
  addu  $t1, $t1, $t0
  sw    $a1, 0($t1)
  jr    $ra
  nop

bas_clear_vars:
  la    $t0, bas_vars
  li    $t1, 26
bas_clear_vars_loop:
  blez  $t1, bas_clear_vars_done
  nop
  sw    $zero, 0($t0)
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  b     bas_clear_vars_loop
  nop
bas_clear_vars_done:
  jr    $ra
  nop

# ------------------------------------------------------------
# Expressions
#
# Recursive descent, one routine per precedence level. Every
# level takes a0 = text and returns v0 = value, v1 = text after.
#
#   bas_eval   OR AND
#   bas_rel    = <> < > <= >=
#   bas_sum    + -
#   bas_term   * / MOD
#   bas_factor unary - and NOT, parentheses, numbers, variables,
#              ABS SGN RND
# ------------------------------------------------------------

bas_eval:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   bas_rel
  nop
  move  $s5, $v0
  move  $s6, $v1
bas_eval_loop:
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_eval_done
  nop
  move  $a0, $s6
  jal   skip_spaces
  nop
  move  $s6, $v0
  move  $a0, $s6
  la    $a1, kw_and
  jal   bas_match
  nop
  bne   $v0, $zero, bas_eval_and
  nop
  move  $a0, $s6
  la    $a1, kw_or
  jal   bas_match
  nop
  bne   $v0, $zero, bas_eval_or
  nop
  b     bas_eval_done
  nop
bas_eval_and:
  move  $a0, $v1
  jal   bas_rel
  nop
  move  $s6, $v1
  move  $s4, $v0
  # Both sides are booleans in the BASIC sense: zero or not zero.
  sltu  $t0, $zero, $s5
  sltu  $t1, $zero, $s4
  and   $s5, $t0, $t1
  b     bas_eval_loop
  nop
bas_eval_or:
  move  $a0, $v1
  jal   bas_rel
  nop
  move  $s6, $v1
  move  $s4, $v0
  sltu  $t0, $zero, $s5
  sltu  $t1, $zero, $s4
  or    $s5, $t0, $t1
  b     bas_eval_loop
  nop
bas_eval_done:
  move  $v0, $s5
  move  $v1, $s6
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

bas_rel:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   bas_sum
  nop
  move  $s5, $v0
  move  $s6, $v1
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_rel_done
  nop
  move  $a0, $s6
  jal   skip_spaces
  nop
  move  $s6, $v0
  lbu   $t0, 0($s6)
  lbu   $t1, 1($s6)

  li    $t2, '<'
  bne   $t0, $t2, bas_rel_greater
  nop
  li    $t2, '>'
  beq   $t1, $t2, bas_rel_not_equal
  nop
  li    $t2, '='
  beq   $t1, $t2, bas_rel_le
  nop
  li    $s7, 1                # <
  addiu $s6, $s6, 1
  b     bas_rel_operand
  nop
bas_rel_le:
  li    $s7, 2                # <=
  addiu $s6, $s6, 2
  b     bas_rel_operand
  nop
bas_rel_not_equal:
  li    $s7, 3                # <>
  addiu $s6, $s6, 2
  b     bas_rel_operand
  nop
bas_rel_greater:
  li    $t2, '>'
  bne   $t0, $t2, bas_rel_equal
  nop
  li    $t2, '='
  beq   $t1, $t2, bas_rel_ge
  nop
  li    $s7, 4                # >
  addiu $s6, $s6, 1
  b     bas_rel_operand
  nop
bas_rel_ge:
  li    $s7, 5                # >=
  addiu $s6, $s6, 2
  b     bas_rel_operand
  nop
bas_rel_equal:
  li    $t2, '='
  bne   $t0, $t2, bas_rel_done
  nop
  li    $s7, 6                # =
  addiu $s6, $s6, 1

bas_rel_operand:
  move  $a0, $s6
  jal   bas_sum
  nop
  move  $s4, $v0
  move  $s6, $v1
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_rel_done
  nop

  li    $t0, 1
  bne   $s7, $t0, bas_rel_check_le
  nop
  slt   $s5, $s5, $s4
  b     bas_rel_done
  nop
bas_rel_check_le:
  li    $t0, 2
  bne   $s7, $t0, bas_rel_check_ne
  nop
  slt   $s5, $s4, $s5
  xori  $s5, $s5, 1
  b     bas_rel_done
  nop
bas_rel_check_ne:
  li    $t0, 3
  bne   $s7, $t0, bas_rel_check_gt
  nop
  subu  $s5, $s5, $s4
  sltu  $s5, $zero, $s5
  b     bas_rel_done
  nop
bas_rel_check_gt:
  li    $t0, 4
  bne   $s7, $t0, bas_rel_check_ge
  nop
  slt   $s5, $s4, $s5
  b     bas_rel_done
  nop
bas_rel_check_ge:
  li    $t0, 5
  bne   $s7, $t0, bas_rel_check_eq
  nop
  slt   $s5, $s5, $s4
  xori  $s5, $s5, 1
  b     bas_rel_done
  nop
bas_rel_check_eq:
  subu  $s5, $s5, $s4
  sltiu $s5, $s5, 1

bas_rel_done:
  move  $v0, $s5
  move  $v1, $s6
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

bas_sum:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   bas_term
  nop
  move  $s5, $v0
  move  $s6, $v1
bas_sum_loop:
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_sum_done
  nop
  move  $a0, $s6
  jal   skip_spaces
  nop
  move  $s6, $v0
  lbu   $s7, 0($s6)
  li    $t0, '+'
  beq   $s7, $t0, bas_sum_operand
  nop
  li    $t0, '-'
  beq   $s7, $t0, bas_sum_operand
  nop
  b     bas_sum_done
  nop
bas_sum_operand:
  addiu $a0, $s6, 1
  jal   bas_term
  nop
  move  $s4, $v0
  move  $s6, $v1
  li    $t0, '+'
  bne   $s7, $t0, bas_sum_subtract
  nop
  addu  $s5, $s5, $s4
  b     bas_sum_loop
  nop
bas_sum_subtract:
  subu  $s5, $s5, $s4
  b     bas_sum_loop
  nop
bas_sum_done:
  move  $v0, $s5
  move  $v1, $s6
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

bas_term:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   bas_factor
  nop
  move  $s5, $v0
  move  $s6, $v1
bas_term_loop:
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_term_done
  nop
  move  $a0, $s6
  jal   skip_spaces
  nop
  move  $s6, $v0
  lbu   $s7, 0($s6)
  li    $t0, '*'
  beq   $s7, $t0, bas_term_single
  nop
  li    $t0, '/'
  beq   $s7, $t0, bas_term_single
  nop
  move  $a0, $s6
  la    $a1, kw_mod
  jal   bas_match
  nop
  beq   $v0, $zero, bas_term_done
  nop
  li    $s7, '%'
  move  $a0, $v1
  b     bas_term_operand
  nop
bas_term_single:
  addiu $a0, $s6, 1
bas_term_operand:
  jal   bas_factor
  nop
  move  $s4, $v0
  move  $s6, $v1
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_term_done
  nop
  li    $t0, '*'
  bne   $s7, $t0, bas_term_divide
  nop
  mul   $s5, $s5, $s4
  b     bas_term_loop
  nop
bas_term_divide:
  bne   $s4, $zero, bas_term_divide_ok
  nop
  la    $a0, basic_err_divzero
  jal   bas_error
  nop
  b     bas_term_done
  nop
bas_term_divide_ok:
  li    $t0, '/'
  bne   $s7, $t0, bas_term_modulo
  nop
  div   $s5, $s4
  mflo  $s5
  b     bas_term_loop
  nop
bas_term_modulo:
  div   $s5, $s4
  mfhi  $s5
  b     bas_term_loop
  nop
bas_term_done:
  move  $v0, $s5
  move  $v1, $s6
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

bas_factor:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $s6, 0($s7)

  li    $t0, '-'
  bne   $s6, $t0, bas_factor_plus
  nop
  addiu $a0, $s7, 1
  jal   bas_factor
  nop
  subu  $v0, $zero, $v0
  b     bas_factor_return
  nop
bas_factor_plus:
  li    $t0, '+'
  bne   $s6, $t0, bas_factor_open
  nop
  addiu $a0, $s7, 1
  jal   bas_factor
  nop
  b     bas_factor_return
  nop
bas_factor_open:
  li    $t0, 40               # '(' - the operand parser strips parentheses
  bne   $s6, $t0, bas_factor_not
  nop
  addiu $a0, $s7, 1
  jal   bas_eval
  nop
  move  $s5, $v0
  move  $a0, $v1
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  li    $t1, 41               # ')' - the operand parser strips parentheses
  beq   $t0, $t1, bas_factor_close
  nop
  la    $a0, basic_err_syntax
  jal   bas_error
  nop
  move  $v0, $s5
  move  $v1, $s7
  b     bas_factor_return
  nop
bas_factor_close:
  addiu $v1, $s7, 1
  move  $v0, $s5
  b     bas_factor_return
  nop

bas_factor_not:
  move  $a0, $s7
  la    $a1, kw_not
  jal   bas_match
  nop
  beq   $v0, $zero, bas_factor_functions
  nop
  move  $a0, $v1
  jal   bas_factor
  nop
  sltiu $v0, $v0, 1
  b     bas_factor_return
  nop

bas_factor_functions:
  move  $a0, $s7
  la    $a1, kw_abs
  jal   bas_match
  nop
  beq   $v0, $zero, bas_factor_sgn
  nop
  move  $a0, $v1
  jal   bas_call_argument
  nop
  bgez  $v0, bas_factor_return
  nop
  subu  $v0, $zero, $v0
  b     bas_factor_return
  nop
bas_factor_sgn:
  move  $a0, $s7
  la    $a1, kw_sgn
  jal   bas_match
  nop
  beq   $v0, $zero, bas_factor_rnd
  nop
  move  $a0, $v1
  jal   bas_call_argument
  nop
  move  $t0, $v0
  slt   $t1, $zero, $t0       # 1 when positive
  slt   $t2, $t0, $zero       # 1 when negative
  subu  $v0, $t1, $t2
  b     bas_factor_return
  nop
bas_factor_rnd:
  move  $a0, $s7
  la    $a1, kw_rnd
  jal   bas_match
  nop
  beq   $v0, $zero, bas_factor_variable
  nop
  move  $a0, $v1
  jal   bas_call_argument
  nop
  move  $s5, $v1
  blez  $v0, bas_factor_rnd_zero
  nop
  move  $a1, $v0
  move  $a0, $zero
  li    $v0, 42
  syscall
  move  $v0, $a0
  move  $v1, $s5
  b     bas_factor_return
  nop
bas_factor_rnd_zero:
  move  $v0, $zero
  move  $v1, $s5
  b     bas_factor_return
  nop

bas_factor_variable:
  move  $a0, $s6
  jal   bas_is_letter
  nop
  beq   $v0, $zero, bas_factor_number
  nop
  move  $a0, $s6
  jal   char_upper
  nop
  addiu $t0, $v0, -65         # 'A'
  move  $a0, $t0
  jal   bas_var_get
  nop
  addiu $v1, $s7, 1
  b     bas_factor_return
  nop

bas_factor_number:
  move  $a0, $s7
  jal   parse_number
  nop
  bne   $a2, $zero, bas_factor_return
  nop
  la    $a0, basic_err_syntax
  jal   bas_error
  nop
  move  $v0, $zero
  move  $v1, $s7

bas_factor_return:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# Parses "(expression)" for the built-in functions.
# a0 = text after the name, v0 = value, v1 = text after the bracket.
bas_call_argument:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  li    $t1, 40               # '('
  beq   $t0, $t1, bas_call_argument_expr
  nop
  la    $a0, basic_err_syntax
  jal   bas_error
  nop
  move  $v0, $zero
  move  $v1, $s7
  b     bas_call_argument_done
  nop
bas_call_argument_expr:
  addiu $a0, $s7, 1
  jal   bas_eval
  nop
  move  $s6, $v0
  move  $a0, $v1
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  li    $t1, 41               # ')'
  beq   $t0, $t1, bas_call_argument_close
  nop
  la    $a0, basic_err_syntax
  jal   bas_error
  nop
  move  $v0, $s6
  move  $v1, $s7
  b     bas_call_argument_done
  nop
bas_call_argument_close:
  move  $v0, $s6
  addiu $v1, $s7, 1
bas_call_argument_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# Statements
#
# a0 = statement text. Sets bas_jumped when it changes the
# program counter and clears bas_running when it stops the run.
# ------------------------------------------------------------

bas_exec:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  beq   $t0, $zero, bas_exec_done
  nop

  move  $a0, $s7
  la    $a1, kw_rem
  jal   bas_match
  nop
  bne   $v0, $zero, bas_exec_done
  nop

  move  $a0, $s7
  la    $a1, kw_print
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_let
  nop
  move  $a0, $v1
  jal   bas_stmt_print
  nop
  b     bas_exec_done
  nop

bas_exec_try_let:
  move  $a0, $s7
  la    $a1, kw_let
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_input
  nop
  move  $a0, $v1
  jal   bas_stmt_let
  nop
  b     bas_exec_done
  nop

bas_exec_try_input:
  move  $a0, $s7
  la    $a1, kw_input
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_if
  nop
  move  $a0, $v1
  jal   bas_stmt_input
  nop
  b     bas_exec_done
  nop

bas_exec_try_if:
  move  $a0, $s7
  la    $a1, kw_if
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_goto
  nop
  move  $a0, $v1
  jal   bas_stmt_if
  nop
  b     bas_exec_done
  nop

bas_exec_try_goto:
  move  $a0, $s7
  la    $a1, kw_goto
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_gosub
  nop
  move  $a0, $v1
  jal   bas_stmt_goto
  nop
  b     bas_exec_done
  nop

bas_exec_try_gosub:
  move  $a0, $s7
  la    $a1, kw_gosub
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_return
  nop
  move  $a0, $v1
  jal   bas_stmt_gosub
  nop
  b     bas_exec_done
  nop

bas_exec_try_return:
  move  $a0, $s7
  la    $a1, kw_return
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_for
  nop
  jal   bas_stmt_return
  nop
  b     bas_exec_done
  nop

bas_exec_try_for:
  move  $a0, $s7
  la    $a1, kw_for
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_next
  nop
  move  $a0, $v1
  jal   bas_stmt_for
  nop
  b     bas_exec_done
  nop

bas_exec_try_next:
  move  $a0, $s7
  la    $a1, kw_next
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_end
  nop
  jal   bas_stmt_next
  nop
  b     bas_exec_done
  nop

bas_exec_try_end:
  move  $a0, $s7
  la    $a1, kw_end
  jal   bas_match
  nop
  bne   $v0, $zero, bas_exec_halt
  nop
  move  $a0, $s7
  la    $a1, kw_stop
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_try_cls
  nop
bas_exec_halt:
  sw    $zero, bas_running
  b     bas_exec_done
  nop

bas_exec_try_cls:
  move  $a0, $s7
  la    $a1, kw_cls
  jal   bas_match
  nop
  beq   $v0, $zero, bas_exec_assignment
  nop
  jal   ansi_clear_screen
  nop
  sw    $zero, bas_column
  b     bas_exec_done
  nop

bas_exec_assignment:
  # "X = 1" with the LET left out, the usual shorthand.
  lbu   $a0, 0($s7)
  jal   bas_is_letter
  nop
  beq   $v0, $zero, bas_exec_syntax
  nop
  move  $a0, $s7
  addiu $a0, $a0, 1
  jal   skip_spaces
  nop
  lbu   $t0, 0($v0)
  li    $t1, '='
  bne   $t0, $t1, bas_exec_syntax
  nop
  move  $a0, $s7
  jal   bas_stmt_let
  nop
  b     bas_exec_done
  nop

bas_exec_syntax:
  la    $a0, basic_err_syntax
  jal   bas_error
  nop
bas_exec_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

bas_stmt_print:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  li    $s6, 1                # newline pending
bas_stmt_print_loop:
  move  $a0, $s7
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  beq   $t0, $zero, bas_stmt_print_end
  nop
  li    $t1, ';'
  beq   $t0, $t1, bas_stmt_print_semicolon
  nop
  li    $t1, 44               # ',' - the operand parser strips commas
  beq   $t0, $t1, bas_stmt_print_comma
  nop
  li    $t1, '"'
  beq   $t0, $t1, bas_stmt_print_literal
  nop
  move  $a0, $s7
  jal   bas_eval
  nop
  move  $s7, $v1
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_stmt_print_return
  nop
  move  $a0, $v0
  jal   bas_put_int
  nop
  li    $s6, 1
  b     bas_stmt_print_loop
  nop
bas_stmt_print_literal:
  addiu $s7, $s7, 1
bas_stmt_print_literal_loop:
  lbu   $a0, 0($s7)
  beq   $a0, $zero, bas_stmt_print_literal_end
  nop
  li    $t1, '"'
  beq   $a0, $t1, bas_stmt_print_literal_close
  nop
  jal   bas_putc
  nop
  addiu $s7, $s7, 1
  b     bas_stmt_print_literal_loop
  nop
bas_stmt_print_literal_close:
  addiu $s7, $s7, 1
bas_stmt_print_literal_end:
  li    $s6, 1
  b     bas_stmt_print_loop
  nop
bas_stmt_print_semicolon:
  addiu $s7, $s7, 1
  move  $s6, $zero
  b     bas_stmt_print_loop
  nop
bas_stmt_print_comma:
  addiu $s7, $s7, 1
  # Commas advance to the next eight column zone.
  lw    $t0, bas_column
  andi  $t0, $t0, 7
  li    $t1, 8
  subu  $a0, $t1, $t0
  jal   bas_spaces
  nop
  move  $s6, $zero
  b     bas_stmt_print_loop
  nop
bas_stmt_print_end:
  beq   $s6, $zero, bas_stmt_print_return
  nop
  jal   bas_newline
  nop
bas_stmt_print_return:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

bas_spaces:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
bas_spaces_loop:
  blez  $s7, bas_spaces_done
  nop
  li    $a0, ' '
  jal   bas_putc
  nop
  addiu $s7, $s7, -1
  b     bas_spaces_loop
  nop
bas_spaces_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

bas_stmt_let:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $a0, 0($s7)
  jal   bas_is_letter
  nop
  beq   $v0, $zero, bas_stmt_let_syntax
  nop
  lbu   $a0, 0($s7)
  jal   char_upper
  nop
  addiu $s6, $v0, -65         # 'A'
  addiu $a0, $s7, 1
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  li    $t1, '='
  bne   $t0, $t1, bas_stmt_let_syntax
  nop
  addiu $a0, $s7, 1
  jal   bas_eval
  nop
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_stmt_let_done
  nop
  move  $a1, $v0
  move  $a0, $s6
  jal   bas_var_set
  nop
  b     bas_stmt_let_done
  nop
bas_stmt_let_syntax:
  la    $a0, basic_err_syntax
  jal   bas_error
  nop
bas_stmt_let_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

bas_stmt_input:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  li    $t1, '"'
  bne   $t0, $t1, bas_stmt_input_prompt
  nop
  # An optional literal replaces the default prompt.
  addiu $s7, $s7, 1
bas_stmt_input_literal:
  lbu   $a0, 0($s7)
  beq   $a0, $zero, bas_stmt_input_ask
  nop
  li    $t1, '"'
  beq   $a0, $t1, bas_stmt_input_literal_end
  nop
  jal   bas_putc
  nop
  addiu $s7, $s7, 1
  b     bas_stmt_input_literal
  nop
bas_stmt_input_literal_end:
  addiu $s7, $s7, 1
  move  $a0, $s7
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  li    $t1, ';'
  beq   $t0, $t1, bas_stmt_input_semicolon
  nop
  li    $t1, 44               # ','
  bne   $t0, $t1, bas_stmt_input_ask
  nop
  # A comma after the literal keeps the prompt exactly as written.
  addiu $s7, $s7, 1
  b     bas_stmt_input_ask
  nop
bas_stmt_input_semicolon:
  # A semicolon appends the question mark, as in Microsoft BASIC.
  addiu $s7, $s7, 1
  la    $a0, basic_input_prompt
  jal   bas_puts
  nop
  b     bas_stmt_input_ask
  nop
bas_stmt_input_prompt:
  la    $a0, basic_input_prompt
  jal   bas_puts
  nop
bas_stmt_input_ask:
  move  $a0, $s7
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $a0, 0($s7)
  jal   bas_is_letter
  nop
  beq   $v0, $zero, bas_stmt_input_syntax
  nop
  lbu   $a0, 0($s7)
  jal   char_upper
  nop
  addiu $s6, $v0, -65         # 'A'
bas_stmt_input_read:
  la    $a0, bas_line_buf
  li    $a1, 128
  jal   tty_read_line
  nop
  sw    $zero, bas_column
  la    $a0, bas_line_buf
  jal   parse_number
  nop
  bne   $a2, $zero, bas_stmt_input_store
  nop
  la    $a0, basic_input_again
  jal   bas_puts
  nop
  b     bas_stmt_input_read
  nop
bas_stmt_input_store:
  move  $a1, $v0
  move  $a0, $s6
  jal   bas_var_set
  nop
  b     bas_stmt_input_done
  nop
bas_stmt_input_syntax:
  la    $a0, basic_err_syntax
  jal   bas_error
  nop
bas_stmt_input_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

bas_stmt_if:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   bas_eval
  nop
  move  $s6, $v0
  move  $s7, $v1
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_stmt_if_done
  nop
  move  $a0, $s7
  la    $a1, kw_then
  jal   bas_match
  nop
  bne   $v0, $zero, bas_stmt_if_body
  nop
  # THEN may be left out, as in many BASIC dialects.
  move  $v1, $s7
bas_stmt_if_body:
  move  $s7, $v1
  beq   $s6, $zero, bas_stmt_if_done
  nop
  move  $a0, $s7
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  li    $t1, '0'
  slt   $t2, $t0, $t1
  bne   $t2, $zero, bas_stmt_if_statement
  nop
  li    $t1, ':'
  slt   $t2, $t0, $t1
  beq   $t2, $zero, bas_stmt_if_statement
  nop
  # A bare line number after THEN means GOTO.
  move  $a0, $s7
  jal   bas_stmt_goto
  nop
  b     bas_stmt_if_done
  nop
bas_stmt_if_statement:
  move  $a0, $s7
  jal   bas_exec
  nop
bas_stmt_if_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# a0 = text holding the target line number
bas_stmt_goto:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   bas_eval
  nop
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_stmt_goto_done
  nop
  move  $a0, $v0
  jal   bas_find_line
  nop
  beq   $v1, $zero, bas_stmt_goto_missing
  nop
  sw    $v0, bas_pc
  li    $t0, 1
  sw    $t0, bas_jumped
  b     bas_stmt_goto_done
  nop
bas_stmt_goto_missing:
  la    $a0, basic_err_line
  jal   bas_error
  nop
bas_stmt_goto_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

bas_stmt_gosub:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  lw    $t0, bas_gosub_sp
  li    $t1, BAS_STACK
  slt   $t2, $t0, $t1
  bne   $t2, $zero, bas_stmt_gosub_push
  nop
  la    $a0, basic_err_stack
  jal   bas_error
  nop
  b     bas_stmt_gosub_done
  nop
bas_stmt_gosub_push:
  sll   $t2, $t0, 2
  la    $t3, bas_gosub
  addu  $t3, $t3, $t2
  lw    $t4, bas_pc
  sw    $t4, 0($t3)
  addiu $t0, $t0, 1
  sw    $t0, bas_gosub_sp
  move  $a0, $s7
  jal   bas_stmt_goto
  nop
  lw    $t0, bas_err_msg
  beq   $t0, $zero, bas_stmt_gosub_done
  nop
  # The jump failed, so the return address must not stay behind.
  lw    $t0, bas_gosub_sp
  addiu $t0, $t0, -1
  sw    $t0, bas_gosub_sp
bas_stmt_gosub_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

bas_stmt_return:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  lw    $t0, bas_gosub_sp
  bgtz  $t0, bas_stmt_return_pop
  nop
  la    $a0, basic_err_return
  jal   bas_error
  nop
  b     bas_stmt_return_done
  nop
bas_stmt_return_pop:
  addiu $t0, $t0, -1
  sw    $t0, bas_gosub_sp
  sll   $t1, $t0, 2
  la    $t2, bas_gosub
  addu  $t2, $t2, $t1
  lw    $t3, 0($t2)
  addiu $t3, $t3, 1
  sw    $t3, bas_pc
  li    $t4, 1
  sw    $t4, bas_jumped
bas_stmt_return_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# FOR var = start TO limit [STEP increment]
bas_stmt_for:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $a0, 0($s7)
  jal   bas_is_letter
  nop
  beq   $v0, $zero, bas_stmt_for_syntax
  nop
  lbu   $a0, 0($s7)
  jal   char_upper
  nop
  addiu $s3, $v0, -65         # variable index
  addiu $a0, $s7, 1
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  li    $t1, '='
  bne   $t0, $t1, bas_stmt_for_syntax
  nop
  addiu $a0, $s7, 1
  jal   bas_eval
  nop
  move  $s4, $v0
  move  $s7, $v1
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_stmt_for_done
  nop
  move  $a0, $s7
  la    $a1, kw_to
  jal   bas_match
  nop
  beq   $v0, $zero, bas_stmt_for_syntax
  nop
  move  $a0, $v1
  jal   bas_eval
  nop
  move  $s5, $v0
  move  $s7, $v1
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_stmt_for_done
  nop
  li    $s6, 1
  move  $a0, $s7
  la    $a1, kw_step
  jal   bas_match
  nop
  beq   $v0, $zero, bas_stmt_for_push
  nop
  move  $a0, $v1
  jal   bas_eval
  nop
  move  $s6, $v0
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_stmt_for_done
  nop

bas_stmt_for_push:
  lw    $t0, bas_for_sp
  li    $t1, BAS_STACK
  slt   $t2, $t0, $t1
  bne   $t2, $zero, bas_stmt_for_store
  nop
  la    $a0, basic_err_stack
  jal   bas_error
  nop
  b     bas_stmt_for_done
  nop
bas_stmt_for_store:
  sll   $t2, $t0, 2
  la    $t3, bas_for_var
  addu  $t3, $t3, $t2
  sw    $s3, 0($t3)
  la    $t3, bas_for_limit
  addu  $t3, $t3, $t2
  sw    $s5, 0($t3)
  la    $t3, bas_for_step
  addu  $t3, $t3, $t2
  sw    $s6, 0($t3)
  la    $t3, bas_for_line
  addu  $t3, $t3, $t2
  lw    $t4, bas_pc
  sw    $t4, 0($t3)
  addiu $t0, $t0, 1
  sw    $t0, bas_for_sp
  move  $a0, $s3
  move  $a1, $s4
  jal   bas_var_set
  nop
  b     bas_stmt_for_done
  nop
bas_stmt_for_syntax:
  la    $a0, basic_err_syntax
  jal   bas_error
  nop
bas_stmt_for_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

bas_stmt_next:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  lw    $t0, bas_for_sp
  bgtz  $t0, bas_stmt_next_top
  nop
  la    $a0, basic_err_next
  jal   bas_error
  nop
  b     bas_stmt_next_done
  nop
bas_stmt_next_top:
  addiu $t0, $t0, -1
  sll   $t1, $t0, 2
  la    $t2, bas_for_var
  addu  $t2, $t2, $t1
  lw    $s4, 0($t2)           # variable index
  la    $t2, bas_for_limit
  addu  $t2, $t2, $t1
  lw    $s5, 0($t2)           # limit
  la    $t2, bas_for_step
  addu  $t2, $t2, $t1
  lw    $s6, 0($t2)           # increment
  la    $t2, bas_for_line
  addu  $t2, $t2, $t1
  lw    $s7, 0($t2)           # index of the FOR line

  move  $a0, $s4
  jal   bas_var_get
  nop
  addu  $t3, $v0, $s6
  move  $a0, $s4
  move  $a1, $t3
  jal   bas_var_set
  nop

  bltz  $s6, bas_stmt_next_down
  nop
  slt   $t4, $s5, $t3         # finished when value > limit
  bne   $t4, $zero, bas_stmt_next_pop
  nop
  b     bas_stmt_next_repeat
  nop
bas_stmt_next_down:
  slt   $t4, $t3, $s5         # finished when value < limit
  bne   $t4, $zero, bas_stmt_next_pop
  nop
bas_stmt_next_repeat:
  addiu $t5, $s7, 1
  sw    $t5, bas_pc
  li    $t6, 1
  sw    $t6, bas_jumped
  b     bas_stmt_next_done
  nop
bas_stmt_next_pop:
  lw    $t0, bas_for_sp
  addiu $t0, $t0, -1
  sw    $t0, bas_for_sp
bas_stmt_next_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# ------------------------------------------------------------
# The run loop
# ------------------------------------------------------------

# Polls the receiver without blocking so Ctrl-C or Escape can stop
# a runaway program; the shell has no other way back in. Anything
# else the user typed ahead is parked in the key decoder's pushback
# slot instead of being thrown away, and a full slot means the poll
# is skipped so no second byte can be swallowed.
bas_check_break:
  lw    $t0, key_pending
  bgez  $t0, bas_check_break_done
  nop
  lbu   $t0, 0($s0)
  andi  $t0, $t0, 1
  beq   $t0, $zero, bas_check_break_done
  nop
  lbu   $t1, 4($s0)
  li    $t2, 3
  beq   $t1, $t2, bas_check_break_stop
  nop
  li    $t2, 27
  beq   $t1, $t2, bas_check_break_stop
  nop
  sw    $t1, key_pending
  b     bas_check_break_done
  nop
bas_check_break_stop:
  sw    $zero, bas_running
  li    $t2, 1
  sw    $t2, bas_broke
bas_check_break_done:
  jr    $ra
  nop

bas_run:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  jal   bas_clear_error
  nop
  jal   bas_clear_vars
  nop
  sw    $zero, bas_gosub_sp
  sw    $zero, bas_for_sp
  sw    $zero, bas_pc
  sw    $zero, bas_column
  sw    $zero, bas_broke
  li    $t0, 1
  sw    $t0, bas_running

bas_run_loop:
  lw    $t0, bas_running
  beq   $t0, $zero, bas_run_finished
  nop
  lw    $t0, bas_pc
  lw    $t1, bas_count
  slt   $t2, $t0, $t1
  beq   $t2, $zero, bas_run_finished
  nop
  jal   bas_check_break
  nop
  lw    $t0, bas_running
  beq   $t0, $zero, bas_run_finished
  nop

  sw    $zero, bas_jumped
  lw    $s7, bas_pc
  move  $a0, $s7
  jal   bas_line_ptr
  nop
  move  $a0, $v0
  jal   bas_exec
  nop
  lw    $t0, bas_err_msg
  bne   $t0, $zero, bas_run_error
  nop
  lw    $t0, bas_jumped
  bne   $t0, $zero, bas_run_loop
  nop
  lw    $t0, bas_pc
  addiu $t0, $t0, 1
  sw    $t0, bas_pc
  b     bas_run_loop
  nop

bas_run_error:
  lw    $t0, bas_column
  beq   $t0, $zero, bas_run_error_report
  nop
  jal   bas_newline
  nop
bas_run_error_report:
  la    $a0, basic_err_prefix
  jal   tty_puts
  nop
  lw    $a0, bas_err_msg
  jal   tty_puts
  nop
  la    $a0, basic_err_in
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   bas_line_number
  nop
  move  $a0, $v0
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
  jal   bas_clear_error
  nop
  b     bas_run_return
  nop

bas_run_finished:
  lw    $t0, bas_column
  beq   $t0, $zero, bas_run_check_break
  nop
  jal   bas_newline
  nop
bas_run_check_break:
  lw    $t0, bas_broke
  beq   $t0, $zero, bas_run_return
  nop
  la    $a0, basic_break
  jal   tty_puts
  nop
bas_run_return:
  sw    $zero, bas_running
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# SAVE and LOAD
#
# The on disk form is the listing itself, so a program written in
# the full screen editor loads here and the other way round.
# ------------------------------------------------------------

# a0 = file name
bas_save:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s3, $a0
  lbu   $t0, 0($s3)
  beq   $t0, $zero, bas_save_name
  nop
  move  $a0, $s3
  jal   fs_open_or_create
  nop
  bltz  $v0, bas_save_full
  nop
  move  $s4, $v0
  la    $s5, bas_out
  move  $s6, $zero
  move  $s7, $zero
bas_save_loop:
  lw    $t0, bas_count
  slt   $t1, $s7, $t0
  beq   $t1, $zero, bas_save_write
  nop
  li    $t0, 1024-80
  slt   $t1, $s6, $t0
  beq   $t1, $zero, bas_save_write
  nop
  move  $a0, $s7
  jal   bas_line_number
  nop
  addu  $a0, $s5, $s6
  move  $a1, $v0
  jal   uint_to_text
  nop
  addu  $s6, $s6, $v0
  addu  $t0, $s5, $s6
  li    $t1, ' '
  sb    $t1, 0($t0)
  addiu $s6, $s6, 1
  move  $a0, $s7
  jal   bas_line_ptr
  nop
  move  $a1, $v0
  addu  $a0, $s5, $s6
  li    $a2, BAS_LINE_CAP-1
  jal   str_copy_n
  nop
  addu  $s6, $s6, $v0
  addu  $t0, $s5, $s6
  li    $t1, 10
  sb    $t1, 0($t0)
  addiu $s6, $s6, 1
  addiu $s7, $s7, 1
  b     bas_save_loop
  nop
bas_save_write:
  addu  $t0, $s5, $s6
  sb    $zero, 0($t0)
  move  $a0, $s4
  la    $a1, bas_out
  move  $a2, $s6
  jal   fs_write
  nop
  la    $a0, basic_saved
  jal   tty_puts
  nop
  move  $a0, $s3
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  b     bas_save_done
  nop
bas_save_full:
  la    $a0, msg_disk_full
  jal   tty_puts
  nop
  b     bas_save_done
  nop
bas_save_name:
  la    $a0, msg_need_name
  jal   tty_puts
  nop
bas_save_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# a0 = destination, a1 = unsigned value. v0 = characters written.
uint_to_text:
  move  $t0, $a0
  move  $t1, $a1
  la    $t2, digit_buf
  move  $t3, $zero
  bne   $t1, $zero, uint_to_text_build
  nop
  li    $t4, '0'
  sb    $t4, 0($t0)
  li    $v0, 1
  jr    $ra
  nop
uint_to_text_build:
  li    $t4, 10
  divu  $t1, $t4
  mfhi  $t5
  mflo  $t1
  addiu $t5, $t5, '0'
  sb    $t5, 0($t2)
  addiu $t2, $t2, 1
  addiu $t3, $t3, 1
  bne   $t1, $zero, uint_to_text_build
  nop
  move  $v0, $t3
  addiu $t2, $t2, -1
uint_to_text_emit:
  lbu   $t5, 0($t2)
  sb    $t5, 0($t0)
  addiu $t0, $t0, 1
  addiu $t2, $t2, -1
  addiu $t3, $t3, -1
  bgtz  $t3, uint_to_text_emit
  nop
  jr    $ra
  nop

# a0 = file name
bas_load:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s4, $a0
  lbu   $t0, 0($s4)
  beq   $t0, $zero, bas_load_name
  nop
  move  $a0, $s4
  jal   fs_require
  nop
  bltz  $v0, bas_load_done
  nop
  move  $s7, $v0
  jal   bas_new
  nop
  move  $a0, $s7
  jal   fs_size
  nop
  move  $s6, $v0
  move  $a0, $s7
  jal   fs_data_ptr
  nop
  move  $s5, $v0
  addu  $s6, $s5, $s6
bas_load_loop:
  sltu  $t0, $s5, $s6
  beq   $t0, $zero, bas_load_report
  nop
  move  $a0, $s5
  move  $a1, $s6
  la    $a2, bas_line_buf
  li    $a3, 128
  jal   line_take
  nop
  move  $s5, $v0
  la    $a0, bas_line_buf
  jal   parse_number
  nop
  beq   $a2, $zero, bas_load_loop
  nop
  move  $t8, $v0
  move  $a0, $v1
  jal   skip_spaces
  nop
  move  $a1, $v0
  move  $a0, $t8
  jal   bas_store_line
  nop
  lw    $t0, bas_err_msg
  beq   $t0, $zero, bas_load_loop
  nop
  jal   bas_clear_error
  nop
bas_load_report:
  la    $a0, basic_loaded
  jal   tty_puts
  nop
  lw    $a0, bas_count
  jal   tty_put_uint
  nop
  la    $a0, basic_loaded_tail
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  b     bas_load_done
  nop
bas_load_name:
  la    $a0, msg_need_name
  jal   tty_puts
  nop
bas_load_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# ------------------------------------------------------------
# Immediate mode
# ------------------------------------------------------------

# a0 = typed line
bas_immediate:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  jal   skip_spaces
  nop
  move  $s7, $v0

  move  $a0, $s7
  la    $a1, kw_run
  jal   bas_match
  nop
  beq   $v0, $zero, bas_immediate_list
  nop
  jal   bas_run
  nop
  b     bas_immediate_done
  nop
bas_immediate_list:
  move  $a0, $s7
  la    $a1, kw_list
  jal   bas_match
  nop
  beq   $v0, $zero, bas_immediate_new
  nop
  jal   bas_list
  nop
  b     bas_immediate_done
  nop
bas_immediate_new:
  move  $a0, $s7
  la    $a1, kw_new
  jal   bas_match
  nop
  beq   $v0, $zero, bas_immediate_save
  nop
  jal   bas_new
  nop
  jal   bas_clear_vars
  nop
  b     bas_immediate_done
  nop
bas_immediate_save:
  move  $a0, $s7
  la    $a1, kw_save
  jal   bas_match
  nop
  beq   $v0, $zero, bas_immediate_load
  nop
  move  $a0, $v1
  jal   skip_spaces
  nop
  move  $a0, $v0
  jal   bas_save
  nop
  b     bas_immediate_done
  nop
bas_immediate_load:
  move  $a0, $s7
  la    $a1, kw_load
  jal   bas_match
  nop
  beq   $v0, $zero, bas_immediate_bye
  nop
  move  $a0, $v1
  jal   skip_spaces
  nop
  move  $a0, $v0
  jal   bas_load
  nop
  b     bas_immediate_done
  nop
bas_immediate_bye:
  move  $a0, $s7
  la    $a1, kw_bye
  jal   bas_match
  nop
  beq   $v0, $zero, bas_immediate_statement
  nop
  li    $t0, 1
  sw    $t0, bas_leaving
  b     bas_immediate_done
  nop
bas_immediate_statement:
  # Anything else runs once, right now, outside the program.
  sw    $zero, bas_column
  li    $t0, 1
  sw    $t0, bas_running
  move  $a0, $s7
  jal   bas_exec
  nop
  sw    $zero, bas_running
  lw    $t0, bas_err_msg
  beq   $t0, $zero, bas_immediate_done
  nop
  lw    $t1, bas_column
  beq   $t1, $zero, bas_immediate_error
  nop
  jal   bas_newline
  nop
bas_immediate_error:
  la    $a0, basic_err_prefix
  jal   tty_puts
  nop
  lw    $a0, bas_err_msg
  jal   tty_puts
  nop
  la    $a0, basic_err_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  jal   bas_clear_error
  nop
bas_immediate_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# The shell command: basic [FILE]
# ------------------------------------------------------------

command_basic:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  sw    $zero, bas_leaving
  jal   bas_clear_error
  nop
  jal   bas_clear_vars
  nop
  la    $a0, basic_banner
  jal   tty_puts
  nop
  lbu   $t0, 0($s2)
  beq   $t0, $zero, bas_shell_ready
  nop
  move  $a0, $s2
  jal   bas_load
  nop
bas_shell_ready:
  la    $a0, basic_ready
  jal   tty_puts
  nop

bas_shell_loop:
  la    $a0, ansi_cyan
  jal   tty_puts
  nop
  la    $a0, basic_prompt
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop
  la    $a0, bas_line_buf
  li    $a1, 128
  jal   tty_read_line
  nop
  sw    $zero, bas_column
  beq   $v0, $zero, bas_shell_loop
  nop

  la    $a0, bas_line_buf
  jal   skip_spaces
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  li    $t1, '0'
  slt   $t2, $t0, $t1
  bne   $t2, $zero, bas_shell_immediate
  nop
  li    $t1, ':'
  slt   $t2, $t0, $t1
  beq   $t2, $zero, bas_shell_immediate
  nop

  # A leading number edits the program instead of running anything.
  move  $a0, $s7
  jal   parse_number
  nop
  move  $t8, $v0
  move  $a0, $v1
  jal   skip_spaces
  nop
  move  $a1, $v0
  move  $a0, $t8
  jal   bas_store_line
  nop
  lw    $t0, bas_err_msg
  beq   $t0, $zero, bas_shell_loop
  nop
  la    $a0, basic_err_prefix
  jal   tty_puts
  nop
  lw    $a0, bas_err_msg
  jal   tty_puts
  nop
  la    $a0, basic_err_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  jal   bas_clear_error
  nop
  b     bas_shell_loop
  nop

bas_shell_immediate:
  move  $a0, $s7
  jal   bas_immediate
  nop
  lw    $t0, bas_leaving
  beq   $t0, $zero, bas_shell_loop
  nop

  la    $a0, basic_bye
  jal   tty_puts
  nop
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop
