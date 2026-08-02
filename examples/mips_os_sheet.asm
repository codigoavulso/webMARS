# ============================================================
# MARS-OS 1.0 - full screen spreadsheet
#
# An 8 by 12 grid of short cells.  A cell holds literal text, a
# decimal or hexadecimal integer, or a formula introduced by '='.
# Formulas are integer only and evaluate strictly left to right,
# which keeps the parser small enough to read in one sitting:
#
#   =A1+B1*2      operands are cell references or numbers
#   =SUM(A1:A8)   rectangular range sum
#
# Values settle over three recalculation passes, so a chain of
# references resolves without a dependency graph.
#
# The file format is one "REF:text" line per non-empty cell, so a
# saved sheet is still an ordinary text file for cat and edit.
# ============================================================

.eqv SH_COLS      8
.eqv SH_ROWS      12
.eqv SH_CELLS     96
.eqv SH_TEXT_CAP  12
.eqv SH_FIELD     8
.eqv SH_GRID_ROW  4
.eqv SH_HEAD_ROW  3
.eqv SH_INFO_ROW  17
.eqv SH_INPUT_ROW 18
.eqv SH_HELP_ROW  20

.data
.align 2
sh_text:    .space 1152        # SH_CELLS * SH_TEXT_CAP
sh_value:   .space 384         # SH_CELLS words
sh_kind:    .space 96          # SH_CELLS
.align 2
sh_out:     .space 1024        # FS_FILE_CAP
sh_input:   .space 16          # SH_TEXT_CAP plus slack
sh_ref_buf: .space 8
sh_col:     .word 0
sh_row:     .word 0
sh_file:    .word 0
sh_dirty:   .word 0
sh_running: .word 0
sh_sum_low_col:  .word 0
sh_sum_high_col: .word 0

sheet_err_text: .asciiz "   #ERR"

.text

# ------------------------------------------------------------
# Cell addressing
# ------------------------------------------------------------

# a0 = column, a1 = row, v0 = linear cell index
sh_index:
  li    $t0, SH_COLS
  mul   $v0, $a1, $t0
  addu  $v0, $v0, $a0
  jr    $ra
  nop

# a0 = index, v0 = text pointer
sh_text_ptr:
  li    $t0, SH_TEXT_CAP
  mul   $t0, $a0, $t0
  la    $v0, sh_text
  addu  $v0, $v0, $t0
  jr    $ra
  nop

# a0 = index, v0 = cached value
sh_value_get:
  sll   $t0, $a0, 2
  la    $t1, sh_value
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop

# a0 = index, a1 = value
sh_value_set:
  sll   $t0, $a0, 2
  la    $t1, sh_value
  addu  $t1, $t1, $t0
  sw    $a1, 0($t1)
  jr    $ra
  nop

# a0 = index, v0 = kind (0 empty, 1 number, 2 text, 3 error)
sh_kind_get:
  la    $t1, sh_kind
  addu  $t1, $t1, $a0
  lbu   $v0, 0($t1)
  jr    $ra
  nop

# a0 = index, a1 = kind
sh_kind_set:
  la    $t1, sh_kind
  addu  $t1, $t1, $a0
  sb    $a1, 0($t1)
  jr    $ra
  nop

sh_clear_all:
  la    $t0, sh_text
  li    $t1, SH_CELLS
sh_clear_all_loop:
  blez  $t1, sh_clear_all_meta
  nop
  sb    $zero, 0($t0)
  addiu $t0, $t0, SH_TEXT_CAP
  addiu $t1, $t1, -1
  b     sh_clear_all_loop
  nop
sh_clear_all_meta:
  la    $t0, sh_value
  la    $t2, sh_kind
  li    $t1, SH_CELLS
sh_clear_all_meta_loop:
  blez  $t1, sh_clear_all_done
  nop
  sw    $zero, 0($t0)
  sb    $zero, 0($t2)
  addiu $t0, $t0, 4
  addiu $t2, $t2, 1
  addiu $t1, $t1, -1
  b     sh_clear_all_meta_loop
  nop
sh_clear_all_done:
  jr    $ra
  nop

# a0 = column, a1 = row, a2 = destination. Writes "A1" style text.
sh_write_ref:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  addiu $t0, $a0, 'A'
  sb    $t0, 0($a2)
  addiu $t1, $a1, 1
  li    $t2, 10
  slt   $t3, $t1, $t2
  beq   $t3, $zero, sh_write_ref_two
  nop
  addiu $t1, $t1, '0'
  sb    $t1, 1($a2)
  sb    $zero, 2($a2)
  b     sh_write_ref_done
  nop
sh_write_ref_two:
  li    $t2, 10
  divu  $t1, $t2
  mflo  $t3
  mfhi  $t4
  addiu $t3, $t3, '0'
  addiu $t4, $t4, '0'
  sb    $t3, 1($a2)
  sb    $t4, 2($a2)
  sb    $zero, 3($a2)
sh_write_ref_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# a0 = text pointer
# v0 = cell index or -1, v1 = pointer after the reference
sh_parse_ref:
  move  $t0, $a0
  lbu   $t1, 0($t0)
  li    $t2, 'a'
  slt   $t3, $t1, $t2
  bne   $t3, $zero, sh_parse_ref_upper
  nop
  li    $t2, 'z'
  slt   $t3, $t2, $t1
  bne   $t3, $zero, sh_parse_ref_upper
  nop
  addiu $t1, $t1, -32
sh_parse_ref_upper:
  li    $t2, 'A'
  slt   $t3, $t1, $t2
  bne   $t3, $zero, sh_parse_ref_fail
  nop
  addiu $t2, $t2, SH_COLS
  slt   $t3, $t1, $t2
  beq   $t3, $zero, sh_parse_ref_fail
  nop
  li    $t7, 'A'
  subu  $t4, $t1, $t7
  addiu $t0, $t0, 1
  move  $t5, $zero
  move  $t6, $zero
sh_parse_ref_digits:
  lbu   $t1, 0($t0)
  li    $t2, '0'
  slt   $t3, $t1, $t2
  bne   $t3, $zero, sh_parse_ref_check
  nop
  li    $t2, ':'
  slt   $t3, $t1, $t2
  beq   $t3, $zero, sh_parse_ref_check
  nop
  li    $t2, 10
  mul   $t5, $t5, $t2
  addiu $t1, $t1, -48
  addu  $t5, $t5, $t1
  addiu $t6, $t6, 1
  addiu $t0, $t0, 1
  b     sh_parse_ref_digits
  nop
sh_parse_ref_check:
  beq   $t6, $zero, sh_parse_ref_fail
  nop
  blez  $t5, sh_parse_ref_fail
  nop
  li    $t2, SH_ROWS
  slt   $t3, $t2, $t5
  bne   $t3, $zero, sh_parse_ref_fail
  nop
  addiu $t5, $t5, -1
  li    $t2, SH_COLS
  mul   $v0, $t5, $t2
  addu  $v0, $v0, $t4
  move  $v1, $t0
  jr    $ra
  nop
sh_parse_ref_fail:
  li    $v0, -1
  move  $v1, $a0
  jr    $ra
  nop

# ------------------------------------------------------------
# Formula evaluation
#
# a0 = pointer just past the '='.
# v0 = value, v1 = pointer after the expression, a2 = success.
# ------------------------------------------------------------

sh_expr:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   sh_term
  nop
  beq   $a2, $zero, sh_expr_fail
  nop
  move  $s5, $v0
  move  $s6, $v1
sh_expr_loop:
  move  $a0, $s6
  jal   skip_spaces
  nop
  move  $s6, $v0
  lbu   $s7, 0($s6)
  li    $t0, '+'
  beq   $s7, $t0, sh_expr_operator
  nop
  li    $t0, '-'
  beq   $s7, $t0, sh_expr_operator
  nop
  li    $t0, '*'
  beq   $s7, $t0, sh_expr_operator
  nop
  li    $t0, '/'
  beq   $s7, $t0, sh_expr_operator
  nop
  li    $t0, '%'
  beq   $s7, $t0, sh_expr_operator
  nop
  b     sh_expr_success
  nop
sh_expr_operator:
  addiu $s6, $s6, 1
  move  $a0, $s6
  jal   sh_term
  nop
  beq   $a2, $zero, sh_expr_fail
  nop
  move  $s4, $v0
  move  $s6, $v1
  li    $t0, '+'
  bne   $s7, $t0, sh_expr_minus
  nop
  addu  $s5, $s5, $s4
  b     sh_expr_loop
  nop
sh_expr_minus:
  li    $t0, '-'
  bne   $s7, $t0, sh_expr_times
  nop
  subu  $s5, $s5, $s4
  b     sh_expr_loop
  nop
sh_expr_times:
  li    $t0, '*'
  bne   $s7, $t0, sh_expr_divide
  nop
  mul   $s5, $s5, $s4
  b     sh_expr_loop
  nop
sh_expr_divide:
  beq   $s4, $zero, sh_expr_fail
  nop
  li    $t0, '/'
  bne   $s7, $t0, sh_expr_modulo
  nop
  div   $s5, $s4
  mflo  $s5
  b     sh_expr_loop
  nop
sh_expr_modulo:
  div   $s5, $s4
  mfhi  $s5
  b     sh_expr_loop
  nop

sh_expr_success:
  move  $v0, $s5
  move  $v1, $s6
  li    $a2, 1
  b     sh_expr_return
  nop
sh_expr_fail:
  move  $v0, $zero
  move  $v1, $s6
  move  $a2, $zero
sh_expr_return:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

sh_term:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   skip_spaces
  nop
  move  $s7, $v0

  # SUM(range)
  lbu   $t0, 0($s7)
  move  $a0, $t0
  jal   char_upper
  nop
  li    $t0, 'S'
  bne   $v0, $t0, sh_term_reference
  nop
  lbu   $t0, 1($s7)
  move  $a0, $t0
  jal   char_upper
  nop
  li    $t0, 'U'
  bne   $v0, $t0, sh_term_reference
  nop
  lbu   $t0, 2($s7)
  move  $a0, $t0
  jal   char_upper
  nop
  li    $t0, 'M'
  bne   $v0, $t0, sh_term_reference
  nop
  lbu   $t0, 3($s7)
  li    $t1, 40             # '(' - the operand parser strips parentheses
  bne   $t0, $t1, sh_term_reference
  nop
  addiu $a0, $s7, 4
  jal   sh_sum_range
  nop
  beq   $a2, $zero, sh_term_fail
  nop
  b     sh_term_return_value
  nop

sh_term_reference:
  move  $a0, $s7
  jal   sh_parse_ref
  nop
  bltz  $v0, sh_term_number
  nop
  move  $s6, $v1
  move  $a0, $v0
  jal   sh_value_get
  nop
  move  $v1, $s6
  li    $a2, 1
  b     sh_term_return_value
  nop

sh_term_number:
  move  $a0, $s7
  jal   parse_number
  nop
  beq   $a2, $zero, sh_term_fail
  nop
sh_term_return_value:
  move  $s5, $v0
  move  $s6, $v1
  li    $a2, 1
  b     sh_term_return
  nop
sh_term_fail:
  move  $s5, $zero
  move  $s6, $s7
  move  $a2, $zero
sh_term_return:
  move  $v0, $s5
  move  $v1, $s6
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# a0 = pointer just past "SUM("
sh_sum_range:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   sh_parse_ref
  nop
  bltz  $v0, sh_sum_range_fail
  nop
  move  $s4, $v0
  move  $s7, $v1
  lbu   $t0, 0($s7)
  li    $t1, ':'
  bne   $t0, $t1, sh_sum_range_fail
  nop
  addiu $a0, $s7, 1
  jal   sh_parse_ref
  nop
  bltz  $v0, sh_sum_range_fail
  nop
  move  $s5, $v0
  move  $s7, $v1
  lbu   $t0, 0($s7)
  li    $t1, 41             # ')' - the operand parser strips parentheses
  bne   $t0, $t1, sh_sum_range_fail
  nop
  addiu $s7, $s7, 1

  # Walk the rectangle spanned by the two corners.
  li    $t0, SH_COLS
  divu  $s4, $t0
  mflo  $t1
  mfhi  $t2
  divu  $s5, $t0
  mflo  $t3
  mfhi  $t4
  slt   $t5, $t3, $t1
  beq   $t5, $zero, sh_sum_rows_ordered
  nop
  move  $t6, $t1
  move  $t1, $t3
  move  $t3, $t6
sh_sum_rows_ordered:
  slt   $t5, $t4, $t2
  beq   $t5, $zero, sh_sum_cols_ordered
  nop
  move  $t6, $t2
  move  $t2, $t4
  move  $t4, $t6
sh_sum_cols_ordered:
  move  $s3, $zero
  move  $s4, $t1
  move  $s5, $t3
  sw    $t2, sh_sum_low_col
  sw    $t4, sh_sum_high_col
sh_sum_row_loop:
  slt   $t0, $s5, $s4
  bne   $t0, $zero, sh_sum_range_done
  nop
  lw    $s6, sh_sum_low_col
sh_sum_col_loop:
  lw    $t0, sh_sum_high_col
  slt   $t1, $t0, $s6
  bne   $t1, $zero, sh_sum_row_next
  nop
  move  $a0, $s6
  move  $a1, $s4
  jal   sh_index
  nop
  move  $a0, $v0
  jal   sh_value_get
  nop
  addu  $s3, $s3, $v0
  addiu $s6, $s6, 1
  b     sh_sum_col_loop
  nop
sh_sum_row_next:
  addiu $s4, $s4, 1
  b     sh_sum_row_loop
  nop

sh_sum_range_done:
  move  $v0, $s3
  move  $v1, $s7
  li    $a2, 1
  b     sh_sum_range_return
  nop
sh_sum_range_fail:
  move  $v0, $zero
  move  $v1, $a0
  move  $a2, $zero
sh_sum_range_return:
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
# Recalculation
# ------------------------------------------------------------

sh_recalc:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s5, $zero
sh_recalc_pass:
  li    $t0, 3
  beq   $s5, $t0, sh_recalc_done
  nop
  move  $s6, $zero
sh_recalc_cell:
  li    $t0, SH_CELLS
  beq   $s6, $t0, sh_recalc_pass_next
  nop
  move  $a0, $s6
  jal   sh_text_ptr
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  bne   $t0, $zero, sh_recalc_content
  nop
  move  $a0, $s6
  move  $a1, $zero
  jal   sh_kind_set
  nop
  move  $a0, $s6
  move  $a1, $zero
  jal   sh_value_set
  nop
  b     sh_recalc_cell_next
  nop
sh_recalc_content:
  li    $t1, '='
  bne   $t0, $t1, sh_recalc_literal
  nop
  addiu $a0, $s7, 1
  jal   sh_expr
  nop
  beq   $a2, $zero, sh_recalc_error
  nop
  move  $t8, $v0
  move  $a0, $s6
  move  $a1, $t8
  jal   sh_value_set
  nop
  move  $a0, $s6
  li    $a1, 1
  jal   sh_kind_set
  nop
  b     sh_recalc_cell_next
  nop
sh_recalc_error:
  move  $a0, $s6
  move  $a1, $zero
  jal   sh_value_set
  nop
  move  $a0, $s6
  li    $a1, 3
  jal   sh_kind_set
  nop
  b     sh_recalc_cell_next
  nop
sh_recalc_literal:
  move  $a0, $s7
  jal   parse_number
  nop
  beq   $a2, $zero, sh_recalc_text
  nop
  move  $t8, $v0
  move  $a0, $v1
  jal   skip_spaces
  nop
  lbu   $t0, 0($v0)
  bne   $t0, $zero, sh_recalc_text
  nop
  move  $a0, $s6
  move  $a1, $t8
  jal   sh_value_set
  nop
  move  $a0, $s6
  li    $a1, 1
  jal   sh_kind_set
  nop
  b     sh_recalc_cell_next
  nop
sh_recalc_text:
  move  $a0, $s6
  move  $a1, $zero
  jal   sh_value_set
  nop
  move  $a0, $s6
  li    $a1, 2
  jal   sh_kind_set
  nop
sh_recalc_cell_next:
  addiu $s6, $s6, 1
  b     sh_recalc_cell
  nop
sh_recalc_pass_next:
  addiu $s5, $s5, 1
  b     sh_recalc_pass
  nop
sh_recalc_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# ------------------------------------------------------------
# Rendering
# ------------------------------------------------------------

sh_render:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)

  li    $a0, 1
  li    $a1, 1
  jal   ansi_goto
  nop
  jal   ansi_inverse
  nop
  la    $a0, sheet_title
  jal   tty_puts
  nop
  lw    $a0, sh_file
  jal   fs_name_ptr
  nop
  move  $a0, $v0
  jal   tty_puts
  nop
  lw    $t0, sh_dirty
  beq   $t0, $zero, sh_render_title_end
  nop
  la    $a0, edit_modified
  jal   tty_puts
  nop
sh_render_title_end:
  jal   ansi_clear_eol
  nop
  jal   ansi_normal
  nop

  # Column header
  li    $a0, SH_HEAD_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  li    $a0, 3
  jal   tty_spaces
  nop
  move  $s4, $zero
sh_render_header:
  li    $t0, SH_COLS
  beq   $s4, $t0, sh_render_header_done
  nop
  li    $a0, 4
  jal   tty_spaces
  nop
  addiu $a0, $s4, 'A'
  jal   tty_putc
  nop
  li    $a0, 4
  jal   tty_spaces
  nop
  addiu $s4, $s4, 1
  b     sh_render_header
  nop
sh_render_header_done:
  jal   ansi_clear_eol
  nop

  # Grid
  move  $s3, $zero
sh_render_row:
  li    $t0, SH_ROWS
  beq   $s3, $t0, sh_render_info
  nop
  addiu $a0, $s3, SH_GRID_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  addiu $a0, $s3, 1
  li    $a1, 3
  jal   tty_put_int_width
  nop
  move  $s4, $zero
sh_render_col:
  li    $t0, SH_COLS
  beq   $s4, $t0, sh_render_row_next
  nop
  lw    $t0, sh_col
  lw    $t1, sh_row
  bne   $t0, $s4, sh_render_cell_plain
  nop
  bne   $t1, $s3, sh_render_cell_plain
  nop
  jal   ansi_inverse
  nop
  jal   sh_render_cell
  nop
  jal   ansi_normal
  nop
  b     sh_render_col_next
  nop
sh_render_cell_plain:
  jal   sh_render_cell
  nop
sh_render_col_next:
  li    $a0, ' '
  jal   tty_putc
  nop
  addiu $s4, $s4, 1
  b     sh_render_col
  nop
sh_render_row_next:
  jal   ansi_clear_eol
  nop
  addiu $s3, $s3, 1
  b     sh_render_row
  nop

sh_render_info:
  li    $a0, SH_INFO_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  la    $a0, sheet_cell_label
  jal   tty_puts
  nop
  lw    $a0, sh_col
  lw    $a1, sh_row
  la    $a2, sh_ref_buf
  jal   sh_write_ref
  nop
  la    $a0, sh_ref_buf
  jal   tty_puts
  nop
  la    $a0, sheet_content_label
  jal   tty_puts
  nop
  lw    $a0, sh_col
  lw    $a1, sh_row
  jal   sh_index
  nop
  move  $a0, $v0
  jal   sh_text_ptr
  nop
  move  $a0, $v0
  jal   tty_puts
  nop
  jal   ansi_clear_eol
  nop

  li    $a0, SH_HELP_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  la    $a0, sheet_keys
  jal   tty_puts
  nop
  jal   ansi_clear_eol
  nop

  li    $a0, SH_INPUT_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  jal   ansi_clear_eol
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

# Renders the cell at column $s4, row $s3 in a field of SH_FIELD.
sh_render_cell:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s4
  move  $a1, $s3
  jal   sh_index
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   sh_kind_get
  nop
  move  $s6, $v0
  beq   $s6, $zero, sh_render_cell_blank
  nop
  li    $t0, 2
  beq   $s6, $t0, sh_render_cell_text
  nop
  li    $t0, 3
  beq   $s6, $t0, sh_render_cell_error
  nop
  move  $a0, $s7
  jal   sh_value_get
  nop
  move  $a0, $v0
  li    $a1, SH_FIELD
  jal   tty_put_int_width
  nop
  b     sh_render_cell_done
  nop
sh_render_cell_blank:
  li    $a0, SH_FIELD
  jal   tty_spaces
  nop
  b     sh_render_cell_done
  nop
sh_render_cell_error:
  la    $a0, sheet_err_text
  li    $a1, SH_FIELD
  jal   tty_puts_pad
  nop
  b     sh_render_cell_done
  nop
sh_render_cell_text:
  move  $a0, $s7
  jal   sh_text_ptr
  nop
  move  $a0, $v0
  li    $a1, SH_FIELD
  jal   tty_puts_pad
  nop
sh_render_cell_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# Cell entry
#
# a0 = first character, or zero to edit the current content.
# v0 = 1 when the value was committed.
# ------------------------------------------------------------

sh_prompt:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s4, $a0
  la    $s5, sh_input
  move  $s6, $zero
  sb    $zero, 0($s5)
  bne   $s4, $zero, sh_prompt_seed
  nop
  lw    $a0, sh_col
  lw    $a1, sh_row
  jal   sh_index
  nop
  move  $a0, $v0
  jal   sh_text_ptr
  nop
  move  $a1, $v0
  la    $a0, sh_input
  li    $a2, SH_TEXT_CAP-1
  jal   str_copy_n
  nop
  move  $s6, $v0
  b     sh_prompt_draw
  nop
sh_prompt_seed:
  sb    $s4, 0($s5)
  sb    $zero, 1($s5)
  li    $s6, 1

sh_prompt_draw:
  li    $a0, SH_INPUT_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  la    $a0, sheet_input_label
  jal   tty_puts
  nop
  la    $a0, sh_input
  jal   tty_puts
  nop
  jal   ansi_clear_eol
  nop

sh_prompt_loop:
  jal   tty_getkey
  nop
  move  $s7, $v0
  li    $t0, 13
  beq   $s7, $t0, sh_prompt_commit
  nop
  li    $t0, 10
  beq   $s7, $t0, sh_prompt_commit
  nop
  li    $t0, KEY_ESCAPE
  beq   $s7, $t0, sh_prompt_cancel
  nop
  li    $t0, 8
  beq   $s7, $t0, sh_prompt_erase
  nop
  li    $t0, 127
  beq   $s7, $t0, sh_prompt_erase
  nop
  li    $t0, 32
  slt   $t1, $s7, $t0
  bne   $t1, $zero, sh_prompt_loop
  nop
  li    $t0, 127
  slt   $t1, $s7, $t0
  beq   $t1, $zero, sh_prompt_loop
  nop
  li    $t0, SH_TEXT_CAP-1
  slt   $t1, $s6, $t0
  beq   $t1, $zero, sh_prompt_loop
  nop
  addu  $t2, $s5, $s6
  sb    $s7, 0($t2)
  addiu $s6, $s6, 1
  addu  $t2, $s5, $s6
  sb    $zero, 0($t2)
  b     sh_prompt_draw
  nop
sh_prompt_erase:
  blez  $s6, sh_prompt_loop
  nop
  addiu $s6, $s6, -1
  addu  $t2, $s5, $s6
  sb    $zero, 0($t2)
  b     sh_prompt_draw
  nop

sh_prompt_commit:
  lw    $a0, sh_col
  lw    $a1, sh_row
  jal   sh_index
  nop
  move  $a0, $v0
  jal   sh_text_ptr
  nop
  move  $a0, $v0
  la    $a1, sh_input
  li    $a2, SH_TEXT_CAP-1
  jal   str_copy_n
  nop
  li    $t0, 1
  sw    $t0, sh_dirty
  jal   sh_recalc
  nop
  li    $v0, 1
  b     sh_prompt_done
  nop
sh_prompt_cancel:
  move  $v0, $zero
sh_prompt_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# ------------------------------------------------------------
# Persistence
# ------------------------------------------------------------

sh_save:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  la    $s5, sh_out
  move  $s6, $zero
  move  $s7, $zero
sh_save_loop:
  li    $t0, SH_CELLS
  beq   $s7, $t0, sh_save_write
  nop
  move  $a0, $s7
  jal   sh_text_ptr
  nop
  move  $s4, $v0
  lbu   $t0, 0($s4)
  beq   $t0, $zero, sh_save_next
  nop
  # "REF=text" plus the newline must still fit.
  li    $t0, FS_FILE_CAP-24
  slt   $t1, $s6, $t0
  beq   $t1, $zero, sh_save_write
  nop
  li    $t0, SH_COLS
  divu  $s7, $t0
  mflo  $a1
  mfhi  $a0
  la    $a2, sh_ref_buf
  jal   sh_write_ref
  nop
  addu  $a0, $s5, $s6
  la    $a1, sh_ref_buf
  li    $a2, 8
  jal   str_copy_n
  nop
  addu  $s6, $s6, $v0
  addu  $t0, $s5, $s6
  li    $t1, ':'
  sb    $t1, 0($t0)
  addiu $s6, $s6, 1
  addu  $a0, $s5, $s6
  move  $a1, $s4
  li    $a2, SH_TEXT_CAP-1
  jal   str_copy_n
  nop
  addu  $s6, $s6, $v0
  addu  $t0, $s5, $s6
  li    $t1, 10
  sb    $t1, 0($t0)
  addiu $s6, $s6, 1
sh_save_next:
  addiu $s7, $s7, 1
  b     sh_save_loop
  nop
sh_save_write:
  addu  $t0, $s5, $s6
  sb    $zero, 0($t0)
  lw    $a0, sh_file
  la    $a1, sh_out
  move  $a2, $s6
  jal   fs_write
  nop
  sw    $zero, sh_dirty
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# a0 = file index
sh_load:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s3, $a0
  jal   sh_clear_all
  nop
  move  $a0, $s3
  jal   fs_size
  nop
  move  $s6, $v0
  move  $a0, $s3
  jal   fs_data_ptr
  nop
  move  $s5, $v0
  addu  $s6, $s5, $s6
sh_load_loop:
  sltu  $t0, $s5, $s6
  beq   $t0, $zero, sh_load_done
  nop
  move  $a0, $s5
  move  $a1, $s6
  la    $a2, scratch_buf
  li    $a3, LINE_CAP
  jal   line_take
  nop
  move  $s5, $v0
  la    $a0, scratch_buf
  jal   sh_parse_ref
  nop
  bltz  $v0, sh_load_loop
  nop
  move  $s4, $v0
  move  $s7, $v1
  lbu   $t0, 0($s7)
  li    $t1, ':'
  bne   $t0, $t1, sh_load_loop
  nop
  addiu $s7, $s7, 1
  move  $a0, $s4
  jal   sh_text_ptr
  nop
  move  $a0, $v0
  move  $a1, $s7
  li    $a2, SH_TEXT_CAP-1
  jal   str_copy_n
  nop
  b     sh_load_loop
  nop
sh_load_done:
  jal   sh_recalc
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

# ------------------------------------------------------------
# The spreadsheet command: sheet FILE
# ------------------------------------------------------------

command_sheet:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  lbu   $t0, 0($s2)
  beq   $t0, $zero, command_sheet_usage
  nop
  move  $a0, $s2
  jal   fs_open_or_create
  nop
  bltz  $v0, command_sheet_full
  nop
  sw    $v0, sh_file
  move  $a0, $v0
  jal   sh_load
  nop
  sw    $zero, sh_col
  sw    $zero, sh_row
  sw    $zero, sh_dirty
  li    $t0, 1
  sw    $t0, sh_running
  jal   ansi_clear_screen
  nop

command_sheet_loop:
  jal   sh_render
  nop
  jal   tty_getkey
  nop
  move  $s7, $v0

  li    $t0, KEY_MOUSE
  beq   $s7, $t0, command_sheet_mouse
  nop

  li    $t0, KEY_LEFT
  bne   $s7, $t0, command_sheet_right
  nop
  lw    $t1, sh_col
  blez  $t1, command_sheet_loop
  nop
  addiu $t1, $t1, -1
  sw    $t1, sh_col
  b     command_sheet_loop
  nop

# A click selects a grid cell; clicking the selected cell again edits it.
command_sheet_mouse:
  lw    $t0, mouse_action
  beq   $t0, $zero, command_sheet_loop
  nop
  lw    $t0, mouse_button
  sltiu $t1, $t0, 3
  beq   $t1, $zero, command_sheet_loop
  nop
  lw    $t2, mouse_row
  addiu $t2, $t2, -SH_GRID_ROW
  bltz  $t2, command_sheet_loop
  nop
  li    $t0, SH_ROWS
  slt   $t1, $t2, $t0
  beq   $t1, $zero, command_sheet_loop
  nop
  lw    $t3, mouse_column
  addiu $t3, $t3, -4
  bltz  $t3, command_sheet_loop
  nop
  li    $t0, 9
  divu  $t3, $t0
  mflo  $t3
  li    $t0, SH_COLS
  slt   $t1, $t3, $t0
  beq   $t1, $zero, command_sheet_loop
  nop
  lw    $t0, sh_col
  bne   $t0, $t3, command_sheet_mouse_select
  nop
  lw    $t0, sh_row
  bne   $t0, $t2, command_sheet_mouse_select
  nop
  b     command_sheet_edit_cell
  nop
command_sheet_mouse_select:
  sw    $t3, sh_col
  sw    $t2, sh_row
  b     command_sheet_loop
  nop
command_sheet_right:
  li    $t0, KEY_RIGHT
  bne   $s7, $t0, command_sheet_up
  nop
  lw    $t1, sh_col
  li    $t2, SH_COLS-1
  slt   $t3, $t1, $t2
  beq   $t3, $zero, command_sheet_loop
  nop
  addiu $t1, $t1, 1
  sw    $t1, sh_col
  b     command_sheet_loop
  nop
command_sheet_up:
  li    $t0, KEY_UP
  bne   $s7, $t0, command_sheet_down
  nop
  lw    $t1, sh_row
  blez  $t1, command_sheet_loop
  nop
  addiu $t1, $t1, -1
  sw    $t1, sh_row
  b     command_sheet_loop
  nop
command_sheet_down:
  li    $t0, KEY_DOWN
  bne   $s7, $t0, command_sheet_escape
  nop
  lw    $t1, sh_row
  li    $t2, SH_ROWS-1
  slt   $t3, $t1, $t2
  beq   $t3, $zero, command_sheet_loop
  nop
  addiu $t1, $t1, 1
  sw    $t1, sh_row
  b     command_sheet_loop
  nop
command_sheet_escape:
  li    $t0, KEY_ESCAPE
  bne   $s7, $t0, command_sheet_enter
  nop
  jal   sh_menu
  nop
  lw    $t0, sh_running
  bne   $t0, $zero, command_sheet_loop
  nop
  b     command_sheet_exit
  nop
command_sheet_enter:
  li    $t0, 13
  beq   $s7, $t0, command_sheet_edit_cell
  nop
  li    $t0, 10
  bne   $s7, $t0, command_sheet_erase
  nop
command_sheet_edit_cell:
  move  $a0, $zero
  jal   sh_prompt
  nop
  b     command_sheet_loop
  nop
command_sheet_erase:
  li    $t0, 8
  beq   $s7, $t0, command_sheet_clear_cell
  nop
  li    $t0, 127
  bne   $s7, $t0, command_sheet_ctrl_s
  nop
command_sheet_clear_cell:
  jal   sh_clear_cell
  nop
  b     command_sheet_loop
  nop
command_sheet_ctrl_s:
  li    $t0, 19
  bne   $s7, $t0, command_sheet_ctrl_q
  nop
  jal   sh_save
  nop
  b     command_sheet_loop
  nop
command_sheet_ctrl_q:
  li    $t0, 17
  bne   $s7, $t0, command_sheet_ctrl_x
  nop
  b     command_sheet_exit
  nop
command_sheet_ctrl_x:
  li    $t0, 24
  bne   $s7, $t0, command_sheet_typing
  nop
  jal   sh_save
  nop
  b     command_sheet_exit
  nop
command_sheet_typing:
  li    $t0, 32
  slt   $t1, $s7, $t0
  bne   $t1, $zero, command_sheet_loop
  nop
  li    $t0, 127
  slt   $t1, $s7, $t0
  beq   $t1, $zero, command_sheet_loop
  nop
  move  $a0, $s7
  jal   sh_prompt
  nop
  b     command_sheet_loop
  nop

command_sheet_exit:
  jal   ansi_clear_screen
  nop
  jal   ansi_normal
  nop
  la    $a0, sheet_closed
  jal   tty_puts
  nop
  lw    $a0, sh_file
  jal   fs_name_ptr
  nop
  move  $a0, $v0
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  b     command_sheet_done
  nop
command_sheet_full:
  la    $a0, msg_disk_full
  jal   tty_puts
  nop
  b     command_sheet_done
  nop
command_sheet_usage:
  la    $a0, msg_sheet_usage
  jal   tty_puts
  nop
command_sheet_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

sh_clear_cell:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  lw    $a0, sh_col
  lw    $a1, sh_row
  jal   sh_index
  nop
  move  $a0, $v0
  jal   sh_text_ptr
  nop
  sb    $zero, 0($v0)
  li    $t0, 1
  sw    $t0, sh_dirty
  jal   sh_recalc
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

sh_menu:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  li    $a0, SH_INPUT_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  jal   ansi_inverse
  nop
  la    $a0, sheet_menu
  jal   tty_puts
  nop
  jal   ansi_clear_eol
  nop
  jal   ansi_normal
  nop
  jal   tty_getkey
  nop
  move  $a0, $v0
  jal   char_upper_key
  nop
  move  $s7, $v0

  li    $t0, 'S'
  bne   $s7, $t0, sh_menu_quit
  nop
  jal   sh_save
  nop
  b     sh_menu_done
  nop
sh_menu_quit:
  li    $t0, 'Q'
  bne   $s7, $t0, sh_menu_exit
  nop
  sw    $zero, sh_running
  b     sh_menu_done
  nop
sh_menu_exit:
  li    $t0, 'X'
  bne   $s7, $t0, sh_menu_clear
  nop
  jal   sh_save
  nop
  sw    $zero, sh_running
  b     sh_menu_done
  nop
sh_menu_clear:
  li    $t0, 'C'
  bne   $s7, $t0, sh_menu_recalc
  nop
  jal   sh_clear_cell
  nop
  b     sh_menu_done
  nop
sh_menu_recalc:
  li    $t0, 'R'
  bne   $s7, $t0, sh_menu_done
  nop
  jal   sh_recalc
  nop
sh_menu_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop
