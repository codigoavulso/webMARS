# ============================================================
# MARS-OS 1.0 - full screen text editor
#
# The document is a single flat byte buffer with bare newline
# separators; there is no line table, so an insertion is just a
# memmove.  Redrawing touches only the twenty visible rows and
# ends each of them with an erase-to-end-of-line, which keeps the
# byte traffic to the TTY low enough to stay responsive.
#
# Keys: arrows, Enter, Backspace, Tab, Ctrl-S/Q/X/K/A/E and the
# Escape menu (s save, q quit, x save and exit, d delete line,
# t top, b bottom).
# ============================================================

.eqv EDIT_CAP       1024
.eqv EDIT_ROWS      20
.eqv EDIT_COLS      78
.eqv EDIT_FIRST_ROW 2
.eqv EDIT_STATUS_ROW 23
.eqv EDIT_HELP_ROW  24

.data
.align 2
ed_buf:      .space 1026       # EDIT_CAP plus the terminator
ed_len:      .word 0
ed_cur:      .word 0
ed_top:      .word 0
ed_file:     .word 0
ed_dirty:    .word 0
ed_running:  .word 0

.text

# ------------------------------------------------------------
# Document geometry
# ------------------------------------------------------------

# v0 = line index of the cursor, v1 = column
ed_locate:
  lw    $t0, ed_cur
  la    $t1, ed_buf
  move  $t2, $zero
  move  $v0, $zero
  move  $v1, $zero
ed_locate_loop:
  beq   $t2, $t0, ed_locate_done
  nop
  addu  $t3, $t1, $t2
  lbu   $t4, 0($t3)
  addiu $t2, $t2, 1
  li    $t5, 10
  beq   $t4, $t5, ed_locate_newline
  nop
  addiu $v1, $v1, 1
  b     ed_locate_loop
  nop
ed_locate_newline:
  addiu $v0, $v0, 1
  move  $v1, $zero
  b     ed_locate_loop
  nop
ed_locate_done:
  jr    $ra
  nop

# a0 = line index, v0 = byte offset of that line
ed_line_start:
  lw    $t0, ed_len
  la    $t1, ed_buf
  move  $t2, $zero
  move  $t3, $zero
ed_line_start_loop:
  beq   $t3, $a0, ed_line_start_done
  nop
  slt   $t4, $t2, $t0
  beq   $t4, $zero, ed_line_start_done
  nop
  addu  $t5, $t1, $t2
  lbu   $t6, 0($t5)
  addiu $t2, $t2, 1
  li    $t7, 10
  bne   $t6, $t7, ed_line_start_loop
  nop
  addiu $t3, $t3, 1
  b     ed_line_start_loop
  nop
ed_line_start_done:
  move  $v0, $t2
  jr    $ra
  nop

# a0 = offset, v0 = offset of the newline that closes the line
ed_line_end:
  lw    $t0, ed_len
  la    $t1, ed_buf
  move  $v0, $a0
ed_line_end_loop:
  slt   $t2, $v0, $t0
  beq   $t2, $zero, ed_line_end_done
  nop
  addu  $t3, $t1, $v0
  lbu   $t4, 0($t3)
  li    $t5, 10
  beq   $t4, $t5, ed_line_end_done
  nop
  addiu $v0, $v0, 1
  b     ed_line_end_loop
  nop
ed_line_end_done:
  jr    $ra
  nop

# v0 = number of lines, counting the trailing empty one
ed_total_lines:
  lw    $t0, ed_len
  la    $t1, ed_buf
  move  $t2, $zero
  li    $v0, 1
ed_total_lines_loop:
  slt   $t3, $t2, $t0
  beq   $t3, $zero, ed_total_lines_done
  nop
  addu  $t4, $t1, $t2
  lbu   $t5, 0($t4)
  addiu $t2, $t2, 1
  li    $t6, 10
  bne   $t5, $t6, ed_total_lines_loop
  nop
  addiu $v0, $v0, 1
  b     ed_total_lines_loop
  nop
ed_total_lines_done:
  jr    $ra
  nop

# ------------------------------------------------------------
# Editing primitives
# ------------------------------------------------------------

# a0 = byte to insert at the cursor
ed_insert:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  lw    $t0, ed_len
  li    $t1, EDIT_CAP-1
  slt   $t2, $t0, $t1
  beq   $t2, $zero, ed_insert_done
  nop
  lw    $t3, ed_cur
  subu  $a2, $t0, $t3
  la    $t4, ed_buf
  addu  $a1, $t4, $t3
  addiu $a0, $a1, 1
  jal   mem_move
  nop
  lw    $t3, ed_cur
  la    $t4, ed_buf
  addu  $t4, $t4, $t3
  sb    $s7, 0($t4)
  lw    $t0, ed_len
  addiu $t0, $t0, 1
  sw    $t0, ed_len
  addiu $t3, $t3, 1
  sw    $t3, ed_cur
  la    $t4, ed_buf
  addu  $t4, $t4, $t0
  sb    $zero, 0($t4)
  li    $t5, 1
  sw    $t5, ed_dirty
ed_insert_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# a0 = offset of the byte to remove
ed_delete_at:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  lw    $t0, ed_len
  slt   $t1, $a0, $t0
  beq   $t1, $zero, ed_delete_at_done
  nop
  bltz  $a0, ed_delete_at_done
  nop
  move  $t2, $a0
  la    $t3, ed_buf
  addu  $a0, $t3, $t2
  addiu $a1, $a0, 1
  addiu $t4, $t2, 1
  subu  $a2, $t0, $t4
  jal   mem_move
  nop
  lw    $t0, ed_len
  addiu $t0, $t0, -1
  sw    $t0, ed_len
  la    $t3, ed_buf
  addu  $t3, $t3, $t0
  sb    $zero, 0($t3)
  li    $t5, 1
  sw    $t5, ed_dirty
ed_delete_at_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# ------------------------------------------------------------
# Rendering
# ------------------------------------------------------------

ed_scroll:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  jal   ed_locate
  nop
  move  $s7, $v0
  lw    $t0, ed_top
  slt   $t1, $s7, $t0
  beq   $t1, $zero, ed_scroll_bottom
  nop
  sw    $s7, ed_top
  b     ed_scroll_done
  nop
ed_scroll_bottom:
  li    $t3, EDIT_ROWS-1
  addu  $t2, $t0, $t3
  slt   $t1, $t2, $s7
  beq   $t1, $zero, ed_scroll_done
  nop
  subu  $t2, $s7, $t3
  sw    $t2, ed_top
ed_scroll_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

ed_render:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   ed_scroll
  nop

  # Title bar
  li    $a0, 1
  li    $a1, 1
  jal   ansi_goto
  nop
  jal   ansi_inverse
  nop
  la    $a0, edit_title
  jal   tty_puts
  nop
  lw    $a0, ed_file
  jal   fs_name_ptr
  nop
  move  $a0, $v0
  jal   tty_puts
  nop
  lw    $t0, ed_dirty
  beq   $t0, $zero, ed_render_title_pad
  nop
  la    $a0, edit_modified
  jal   tty_puts
  nop
ed_render_title_pad:
  jal   ansi_clear_eol
  nop
  jal   ansi_normal
  nop

  # Text rows
  lw    $s3, ed_top
  move  $s4, $zero
ed_render_rows:
  li    $t0, EDIT_ROWS
  beq   $s4, $t0, ed_render_status
  nop
  addiu $a0, $s4, EDIT_FIRST_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  addu  $s7, $s3, $s4
  jal   ed_total_lines
  nop
  slt   $t1, $s7, $v0
  bne   $t1, $zero, ed_render_line
  nop
  # Past the last line: leave the row blank.
  jal   ansi_clear_eol
  nop
  b     ed_render_rows_next
  nop
ed_render_line:
  move  $a0, $s7
  jal   ed_line_start
  nop
  move  $s5, $v0
  move  $a0, $s5
  jal   ed_line_end
  nop
  move  $s6, $v0
  subu  $s6, $s6, $s5
  li    $t0, EDIT_COLS
  slt   $t1, $t0, $s6
  beq   $t1, $zero, ed_render_emit
  nop
  move  $s6, $t0
ed_render_emit:
  la    $s7, ed_buf
  addu  $s7, $s7, $s5
ed_render_emit_loop:
  blez  $s6, ed_render_emit_done
  nop
  lbu   $a0, 0($s7)
  jal   tty_putc
  nop
  addiu $s7, $s7, 1
  addiu $s6, $s6, -1
  b     ed_render_emit_loop
  nop
ed_render_emit_done:
  jal   ansi_clear_eol
  nop
ed_render_rows_next:
  addiu $s4, $s4, 1
  b     ed_render_rows
  nop

ed_render_status:
  li    $a0, EDIT_STATUS_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  jal   ed_locate
  nop
  move  $s5, $v0
  move  $s6, $v1
  la    $a0, edit_line_label
  jal   tty_puts
  nop
  addiu $a0, $s5, 1
  jal   tty_put_uint
  nop
  la    $a0, edit_col_label
  jal   tty_puts
  nop
  addiu $a0, $s6, 1
  jal   tty_put_uint
  nop
  la    $a0, edit_bytes_label
  jal   tty_puts
  nop
  lw    $a0, ed_len
  jal   tty_put_uint
  nop
  la    $a0, edit_slash
  jal   tty_puts
  nop
  li    $a0, EDIT_CAP-1
  jal   tty_put_uint
  nop
  jal   ansi_clear_eol
  nop

  li    $a0, EDIT_HELP_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  la    $a0, edit_keys
  jal   tty_puts
  nop
  jal   ansi_clear_eol
  nop

  # Park the hardware cursor on the editing position.
  lw    $t0, ed_top
  subu  $t1, $s5, $t0
  addiu $a0, $t1, EDIT_FIRST_ROW
  li    $t2, EDIT_COLS
  slt   $t3, $t2, $s6
  beq   $t3, $zero, ed_render_cursor
  nop
  move  $s6, $t2
ed_render_cursor:
  addiu $a1, $s6, 1
  jal   ansi_goto
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
# Cursor movement
# ------------------------------------------------------------

ed_move_left:
  lw    $t0, ed_cur
  blez  $t0, ed_move_left_done
  nop
  addiu $t0, $t0, -1
  sw    $t0, ed_cur
ed_move_left_done:
  jr    $ra
  nop

ed_move_right:
  lw    $t0, ed_cur
  lw    $t1, ed_len
  slt   $t2, $t0, $t1
  beq   $t2, $zero, ed_move_right_done
  nop
  addiu $t0, $t0, 1
  sw    $t0, ed_cur
ed_move_right_done:
  jr    $ra
  nop

# a0 = -1 for the previous line, +1 for the next one
ed_move_vertical:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s4, $a0
  jal   ed_locate
  nop
  move  $s5, $v0
  move  $s6, $v1
  addu  $s5, $s5, $s4
  bltz  $s5, ed_move_vertical_done
  nop
  jal   ed_total_lines
  nop
  slt   $t0, $s5, $v0
  beq   $t0, $zero, ed_move_vertical_done
  nop
  move  $a0, $s5
  jal   ed_line_start
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   ed_line_end
  nop
  subu  $t0, $v0, $s7
  slt   $t1, $t0, $s6
  beq   $t1, $zero, ed_move_vertical_apply
  nop
  move  $s6, $t0
ed_move_vertical_apply:
  addu  $t0, $s7, $s6
  sw    $t0, ed_cur
ed_move_vertical_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

ed_home:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   ed_locate
  nop
  move  $a0, $v0
  jal   ed_line_start
  nop
  sw    $v0, ed_cur
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

ed_end:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  lw    $a0, ed_cur
  jal   ed_line_end
  nop
  sw    $v0, ed_cur
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

ed_kill_to_eol:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
ed_kill_to_eol_loop:
  lw    $s7, ed_cur
  move  $a0, $s7
  jal   ed_line_end
  nop
  beq   $v0, $s7, ed_kill_to_eol_done
  nop
  move  $a0, $s7
  jal   ed_delete_at
  nop
  b     ed_kill_to_eol_loop
  nop
ed_kill_to_eol_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# Removes the whole line, including the newline that closes it.
ed_delete_line:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   ed_home
  nop
  jal   ed_kill_to_eol
  nop
  lw    $t0, ed_cur
  lw    $t1, ed_len
  slt   $t2, $t0, $t1
  beq   $t2, $zero, ed_delete_line_done
  nop
  move  $a0, $t0
  jal   ed_delete_at
  nop
ed_delete_line_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

ed_backspace:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  lw    $t0, ed_cur
  blez  $t0, ed_backspace_done
  nop
  addiu $t0, $t0, -1
  sw    $t0, ed_cur
  move  $a0, $t0
  jal   ed_delete_at
  nop
ed_backspace_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# ------------------------------------------------------------
# Save
# ------------------------------------------------------------

ed_save:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  lw    $a0, ed_file
  la    $a1, ed_buf
  lw    $a2, ed_len
  jal   fs_write
  nop
  sw    $zero, ed_dirty
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# ------------------------------------------------------------
# The editor command: edit FILE
# ------------------------------------------------------------

command_edit:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  lbu   $t0, 0($s2)
  beq   $t0, $zero, command_edit_usage
  nop
  move  $a0, $s2
  jal   fs_open_or_create
  nop
  bltz  $v0, command_edit_full
  nop
  sw    $v0, ed_file
  move  $s7, $v0

  # Load the file into the working buffer.
  move  $a0, $s7
  jal   fs_size
  nop
  move  $s6, $v0
  li    $t0, EDIT_CAP-1
  slt   $t1, $t0, $s6
  beq   $t1, $zero, command_edit_copy
  nop
  move  $s6, $t0
command_edit_copy:
  move  $a0, $s7
  jal   fs_data_ptr
  nop
  move  $a1, $v0
  la    $a0, ed_buf
  move  $a2, $s6
  jal   mem_move
  nop
  la    $t0, ed_buf
  addu  $t0, $t0, $s6
  sb    $zero, 0($t0)
  sw    $s6, ed_len
  sw    $zero, ed_cur
  sw    $zero, ed_top
  sw    $zero, ed_dirty
  li    $t0, 1
  sw    $t0, ed_running

  jal   ansi_clear_screen
  nop

command_edit_loop:
  jal   ed_render
  nop
  jal   tty_getkey
  nop
  move  $s6, $v0

  li    $t0, KEY_MOUSE
  beq   $s6, $t0, command_edit_mouse
  nop

  li    $t0, KEY_LEFT
  bne   $s6, $t0, command_edit_key_right
  nop
  jal   ed_move_left
  nop
  b     command_edit_loop
  nop

# A left click positions the insertion cursor on a visible text cell.
command_edit_mouse:
  lw    $t0, mouse_action
  beq   $t0, $zero, command_edit_loop
  nop
  lw    $t0, mouse_button
  sltiu $t1, $t0, 3
  beq   $t1, $zero, command_edit_loop
  nop
  lw    $t0, mouse_row
  addiu $t0, $t0, -EDIT_FIRST_ROW
  bltz  $t0, command_edit_loop
  nop
  li    $t1, EDIT_ROWS
  slt   $t2, $t0, $t1
  beq   $t2, $zero, command_edit_loop
  nop
  lw    $t1, ed_top
  addu  $s6, $t1, $t0
  jal   ed_total_lines
  nop
  slt   $t0, $s6, $v0
  beq   $t0, $zero, command_edit_loop
  nop
  move  $a0, $s6
  jal   ed_line_start
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   ed_line_end
  nop
  subu  $s5, $v0, $s7
  lw    $t0, mouse_column
  addiu $t0, $t0, -1
  slt   $t1, $s5, $t0
  beq   $t1, $zero, command_edit_mouse_store
  nop
  move  $t0, $s5
command_edit_mouse_store:
  addu  $t0, $s7, $t0
  sw    $t0, ed_cur
  b     command_edit_loop
  nop
command_edit_key_right:
  li    $t0, KEY_RIGHT
  bne   $s6, $t0, command_edit_key_up
  nop
  jal   ed_move_right
  nop
  b     command_edit_loop
  nop
command_edit_key_up:
  li    $t0, KEY_UP
  bne   $s6, $t0, command_edit_key_down
  nop
  li    $a0, -1
  jal   ed_move_vertical
  nop
  b     command_edit_loop
  nop
command_edit_key_down:
  li    $t0, KEY_DOWN
  bne   $s6, $t0, command_edit_key_escape
  nop
  li    $a0, 1
  jal   ed_move_vertical
  nop
  b     command_edit_loop
  nop
command_edit_key_escape:
  li    $t0, KEY_ESCAPE
  bne   $s6, $t0, command_edit_key_enter
  nop
  jal   ed_menu
  nop
  lw    $t0, ed_running
  bne   $t0, $zero, command_edit_loop
  nop
  b     command_edit_exit
  nop
command_edit_key_enter:
  li    $t0, 13
  beq   $s6, $t0, command_edit_newline
  nop
  li    $t0, 10
  bne   $s6, $t0, command_edit_key_backspace
  nop
command_edit_newline:
  li    $a0, 10
  jal   ed_insert
  nop
  b     command_edit_loop
  nop
command_edit_key_backspace:
  li    $t0, 8
  beq   $s6, $t0, command_edit_backspace
  nop
  li    $t0, 127
  bne   $s6, $t0, command_edit_key_tab
  nop
command_edit_backspace:
  jal   ed_backspace
  nop
  b     command_edit_loop
  nop
command_edit_key_tab:
  li    $t0, 9
  bne   $s6, $t0, command_edit_key_ctrl_a
  nop
  li    $a0, ' '
  jal   ed_insert
  nop
  li    $a0, ' '
  jal   ed_insert
  nop
  b     command_edit_loop
  nop
command_edit_key_ctrl_a:
  li    $t0, 1
  bne   $s6, $t0, command_edit_key_ctrl_e
  nop
  jal   ed_home
  nop
  b     command_edit_loop
  nop
command_edit_key_ctrl_e:
  li    $t0, 5
  bne   $s6, $t0, command_edit_key_ctrl_d
  nop
  jal   ed_end
  nop
  b     command_edit_loop
  nop
command_edit_key_ctrl_d:
  li    $t0, 4
  bne   $s6, $t0, command_edit_key_ctrl_k
  nop
  lw    $a0, ed_cur
  jal   ed_delete_at
  nop
  b     command_edit_loop
  nop
command_edit_key_ctrl_k:
  li    $t0, 11
  bne   $s6, $t0, command_edit_key_ctrl_s
  nop
  jal   ed_kill_to_eol
  nop
  b     command_edit_loop
  nop
command_edit_key_ctrl_s:
  li    $t0, 19
  bne   $s6, $t0, command_edit_key_ctrl_q
  nop
  jal   ed_save
  nop
  b     command_edit_loop
  nop
command_edit_key_ctrl_q:
  li    $t0, 17
  bne   $s6, $t0, command_edit_key_ctrl_x
  nop
  b     command_edit_exit
  nop
command_edit_key_ctrl_x:
  li    $t0, 24
  bne   $s6, $t0, command_edit_key_printable
  nop
  jal   ed_save
  nop
  b     command_edit_exit
  nop
command_edit_key_printable:
  li    $t0, 32
  slt   $t1, $s6, $t0
  bne   $t1, $zero, command_edit_loop
  nop
  li    $t0, 127
  slt   $t1, $s6, $t0
  beq   $t1, $zero, command_edit_loop
  nop
  move  $a0, $s6
  jal   ed_insert
  nop
  b     command_edit_loop
  nop

command_edit_exit:
  jal   ansi_clear_screen
  nop
  jal   ansi_normal
  nop
  la    $a0, edit_closed
  jal   tty_puts
  nop
  lw    $a0, ed_file
  jal   fs_name_ptr
  nop
  move  $a0, $v0
  jal   tty_puts
  nop
  la    $a0, edit_closed_tail
  jal   tty_puts
  nop
  lw    $a0, ed_len
  jal   tty_put_uint
  nop
  la    $a0, bytes_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  b     command_edit_done
  nop

command_edit_full:
  la    $a0, msg_disk_full
  jal   tty_puts
  nop
  b     command_edit_done
  nop
command_edit_usage:
  la    $a0, msg_edit_usage
  jal   tty_puts
  nop
command_edit_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# The Escape menu: one prompt line, one keystroke.
ed_menu:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  li    $a0, EDIT_STATUS_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  jal   ansi_inverse
  nop
  la    $a0, edit_menu
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
  bne   $s7, $t0, ed_menu_quit
  nop
  jal   ed_save
  nop
  b     ed_menu_done
  nop
ed_menu_quit:
  li    $t0, 'Q'
  bne   $s7, $t0, ed_menu_exit
  nop
  sw    $zero, ed_running
  b     ed_menu_done
  nop
ed_menu_exit:
  li    $t0, 'X'
  bne   $s7, $t0, ed_menu_delete
  nop
  jal   ed_save
  nop
  sw    $zero, ed_running
  b     ed_menu_done
  nop
ed_menu_delete:
  li    $t0, 'D'
  bne   $s7, $t0, ed_menu_top
  nop
  jal   ed_delete_line
  nop
  b     ed_menu_done
  nop
ed_menu_top:
  li    $t0, 'T'
  bne   $s7, $t0, ed_menu_bottom
  nop
  sw    $zero, ed_cur
  sw    $zero, ed_top
  b     ed_menu_done
  nop
ed_menu_bottom:
  li    $t0, 'B'
  bne   $s7, $t0, ed_menu_done
  nop
  lw    $t1, ed_len
  sw    $t1, ed_cur
ed_menu_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# Uppercases only real characters, leaving the KEY_* codes alone.
char_upper_key:
  move  $v0, $a0
  li    $t0, 256
  slt   $t1, $v0, $t0
  beq   $t1, $zero, char_upper_key_done
  nop
  li    $t0, 'a'
  slt   $t1, $v0, $t0
  bne   $t1, $zero, char_upper_key_done
  nop
  li    $t0, 'z'
  slt   $t1, $t0, $v0
  bne   $t1, $zero, char_upper_key_done
  nop
  addiu $v0, $v0, -32
char_upper_key_done:
  jr    $ra
  nop
