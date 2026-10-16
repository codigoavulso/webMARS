# ============================================================
# MARS-OS Mini-DAW -- a small graphical step sequencer
#
# The sequencer is intentionally self-contained: its grid is an 8 by 16
# byte pattern, so each lit cell becomes one asynchronous MIDI syscall 31
# when its column plays.  A following sleep syscall defines the beat length.
# This makes chords real (all notes in a column begin together) while the
# browser audio runtime remains entirely behind the ordinary MARS interface.
# ============================================================

.eqv DAW_ROWS       8
.eqv DAW_STEPS      16
.eqv DAW_CELLS      128
.eqv DAW_GRID_ROW   5
.eqv DAW_GRID_COL   5
.eqv DAW_STATUS_ROW 15
.eqv DAW_HELP_ROW   17

.data
.align 2
daw_pattern:    .space DAW_CELLS
daw_row:        .word 0
daw_step:       .word 0
daw_play_step:  .word -1
daw_instrument: .word 0
daw_tempo:      .word 1

# The rows are a C-major octave, highest note first, so the grid reads like a
# compact piano roll.  The labels are deliberately ASCII for the byte TTY.
daw_pitches: .byte 72, 71, 69, 67, 65, 64, 62, 60
daw_note_names: .asciiz "C5\0B4\0A4\0G4\0F4\0E4\0D4\0C4\0"
.align 2
daw_step_ms: .word 375, 250, 188
daw_bpm:     .word 80, 120, 160
daw_patches: .word 0, 24, 40, 80

cmd_daw:          .asciiz "daw"
daw_menu_label:   .asciiz "MIPS Piano / Mini-DAW"
daw_icon:         .asciiz "[~~]"
daw_title:        .asciiz " MARS-OS Mini-DAW  |  MIPS Piano step sequencer "
daw_tempo_text:   .asciiz "Tempo "
daw_bpm_text:     .asciiz " BPM | MIDI patch "
daw_playing_text: .asciiz "PLAYING"
daw_ready_text:   .asciiz "READY"
daw_help:         .asciiz "Arrows/mouse | Space note | P play | D demo | C clear | I patch | T BPM | Q"
daw_legend:       .asciiz "piano roll: X = note  . = rest   each column is one eighth-note step"

.text

# v0 = address of the two-character name for row a0.
daw_note_name:
  # Two printable bytes plus NUL: row * 3, never a word stride.
  sll   $t0, $a0, 1
  addu  $t0, $t0, $a0
  la    $v0, daw_note_names
  addu  $v0, $v0, $t0
  jr    $ra
  nop

# v0 = address of daw_pattern[row][step].  a0=row, a1=step.
daw_cell_ptr:
  sll   $t0, $a0, 4
  addu  $t0, $t0, $a1
  la    $v0, daw_pattern
  addu  $v0, $v0, $t0
  jr    $ra
  nop

daw_clear:
  la    $t0, daw_pattern
  li    $t1, DAW_CELLS
daw_clear_loop:
  beq   $t1, $zero, daw_clear_done
  nop
  sb    $zero, 0($t0)
  addiu $t0, $t0, 1
  addiu $t1, $t1, -1
  b     daw_clear_loop
  nop
daw_clear_done:
  jr    $ra
  nop

# A musical starter pattern: C major arpeggio, then a descending reply.
daw_load_demo:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   daw_clear
  nop
  # C5: steps 0 and 8
  li    $a0, 0
  li    $a1, 0
  jal   daw_cell_ptr
  nop
  li    $t0, 1
  sb    $t0, 0($v0)
  li    $a0, 0
  li    $a1, 8
  jal   daw_cell_ptr
  nop
  sb    $t0, 0($v0)
  # E4: steps 2 and 10
  li    $a0, 5
  li    $a1, 2
  jal   daw_cell_ptr
  nop
  sb    $t0, 0($v0)
  li    $a0, 5
  li    $a1, 10
  jal   daw_cell_ptr
  nop
  sb    $t0, 0($v0)
  # G4: steps 4 and 12
  li    $a0, 3
  li    $a1, 4
  jal   daw_cell_ptr
  nop
  sb    $t0, 0($v0)
  li    $a0, 3
  li    $a1, 12
  jal   daw_cell_ptr
  nop
  sb    $t0, 0($v0)
  # C4 pulse at the end of each half bar.
  li    $a0, 7
  li    $a1, 6
  jal   daw_cell_ptr
  nop
  sb    $t0, 0($v0)
  li    $a0, 7
  li    $a1, 14
  jal   daw_cell_ptr
  nop
  sb    $t0, 0($v0)
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# a0 = row.  Starts a short asynchronous preview tone.
daw_preview_row:
  sll   $t0, $a0, 0
  la    $t1, daw_pitches
  addu  $t1, $t1, $t0
  lbu   $a0, 0($t1)
  li    $a1, 180
  lw    $a2, daw_instrument
  li    $a3, 100
  li    $v0, 31
  syscall
  jr    $ra
  nop

# Redraw the complete, deliberately compact, graphical piano roll.
daw_render:
  addiu $sp, $sp, -28
  sw    $ra, 24($sp)
  sw    $s3, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  jal   ansi_clear_screen
  nop
  li    $a0, 1
  li    $a1, 1
  jal   ansi_goto
  nop
  jal   ansi_inverse
  nop
  la    $a0, daw_title
  jal   tty_puts
  nop
  jal   ansi_normal
  nop

  li    $a0, 2
  li    $a1, 1
  jal   ansi_goto
  nop
  la    $a0, daw_tempo_text
  jal   tty_puts
  nop
  lw    $t0, daw_tempo
  sll   $t0, $t0, 2
  la    $t1, daw_bpm
  addu  $t1, $t1, $t0
  lw    $a0, 0($t1)
  jal   tty_put_uint
  nop
  la    $a0, daw_bpm_text
  jal   tty_puts
  nop
  lw    $a0, daw_instrument
  jal   tty_put_uint
  nop
  jal   ansi_clear_eol
  nop

  # Column headings, 01..16.
  li    $a0, 4
  li    $a1, DAW_GRID_COL
  jal   ansi_goto
  nop
  move  $s3, $zero
daw_render_head_loop:
  li    $t0, DAW_STEPS
  beq   $s3, $t0, daw_render_head_done
  nop
  addiu $a0, $s3, 1
  li    $a1, 2
  jal   tty_put_int_width
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  addiu $s3, $s3, 1
  b     daw_render_head_loop
  nop
daw_render_head_done:

  move  $s4, $zero
daw_render_row_loop:
  li    $t0, DAW_ROWS
  beq   $s4, $t0, daw_render_footer
  nop
  addiu $a0, $s4, DAW_GRID_ROW
  li    $a1, 2
  jal   ansi_goto
  nop
  move  $a0, $s4
  jal   daw_note_name
  nop
  move  $a0, $v0
  jal   tty_puts
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  move  $s5, $zero
daw_render_cell_loop:
  li    $t0, DAW_STEPS
  beq   $s5, $t0, daw_render_next_row
  nop
  lw    $t1, daw_row
  bne   $t1, $s4, daw_render_plain
  nop
  lw    $t1, daw_step
  bne   $t1, $s5, daw_render_plain
  nop
  jal   ansi_inverse
  nop
daw_render_plain:
  # Every step is exactly three columns: leading space, note/rest, trailing
  # space.  The header uses the same width, and daw_mouse divides by three.
  li    $a0, ' '
  jal   tty_putc
  nop
  move  $a0, $s4
  move  $a1, $s5
  jal   daw_cell_ptr
  nop
  lbu   $t0, 0($v0)
  beq   $t0, $zero, daw_render_rest
  nop
  li    $a0, 'X'
  b     daw_render_cell_char
  nop
daw_render_rest:
  li    $a0, '.'
daw_render_cell_char:
  jal   tty_putc
  nop
  jal   ansi_normal
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  addiu $s5, $s5, 1
  b     daw_render_cell_loop
  nop
daw_render_next_row:
  addiu $s4, $s4, 1
  b     daw_render_row_loop
  nop

daw_render_footer:
  li    $a0, DAW_STATUS_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  lw    $t0, daw_play_step
  bltz  $t0, daw_render_ready
  nop
  la    $a0, daw_playing_text
  jal   tty_puts
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  addiu $a0, $t0, 1
  jal   tty_put_uint
  nop
  b     daw_render_status_done
  nop
daw_render_ready:
  la    $a0, daw_ready_text
  jal   tty_puts
  nop
daw_render_status_done:
  li    $a0, ' '
  jal   tty_putc
  nop
  la    $a0, daw_legend
  jal   tty_puts
  nop
  jal   ansi_clear_eol
  nop
  li    $a0, DAW_HELP_ROW
  li    $a1, 1
  jal   ansi_goto
  nop
  la    $a0, daw_help
  jal   tty_puts
  nop
  jal   ansi_clear_eol
  nop
  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $s3, 20($sp)
  lw    $ra, 24($sp)
  addiu $sp, $sp, 28
  jr    $ra
  nop

# Play exactly one 16-step bar.  All enabled rows of each column emit service
# 31 before the cooperative sleep, which is what gives the grid real chords.
daw_play_bar:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  move  $s4, $zero
daw_play_step_loop:
  li    $t0, DAW_STEPS
  beq   $s4, $t0, daw_play_done
  nop
  sw    $s4, daw_play_step
  jal   daw_render
  nop
  move  $s5, $zero
daw_play_note_loop:
  li    $t0, DAW_ROWS
  beq   $s5, $t0, daw_play_wait
  nop
  move  $a0, $s5
  move  $a1, $s4
  jal   daw_cell_ptr
  nop
  lbu   $t0, 0($v0)
  beq   $t0, $zero, daw_play_note_next
  nop
  la    $t1, daw_pitches
  addu  $t1, $t1, $s5
  lbu   $a0, 0($t1)
  lw    $t2, daw_tempo
  sll   $t2, $t2, 2
  la    $t3, daw_step_ms
  addu  $t3, $t3, $t2
  lw    $a1, 0($t3)
  addiu $a1, $a1, -15
  lw    $a2, daw_instrument
  li    $a3, 104
  li    $v0, 31
  syscall
daw_play_note_next:
  addiu $s5, $s5, 1
  b     daw_play_note_loop
  nop
daw_play_wait:
  lw    $t2, daw_tempo
  sll   $t2, $t2, 2
  la    $t3, daw_step_ms
  addu  $t3, $t3, $t2
  lw    $a0, 0($t3)
  li    $v0, 32
  syscall
  addiu $s4, $s4, 1
  b     daw_play_step_loop
  nop
daw_play_done:
  li    $t0, -1
  sw    $t0, daw_play_step
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

command_daw:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  sw    $zero, daw_row
  sw    $zero, daw_step
  sw    $zero, daw_instrument
  li    $t0, 1
  sw    $t0, daw_tempo
  li    $t0, -1
  sw    $t0, daw_play_step
  jal   daw_load_demo
  nop
  la    $a0, esc_mouse_clicks
  jal   tty_puts
  nop
daw_loop:
  jal   daw_render
  nop
  jal   tty_getkey
  nop
  move  $s7, $v0
  li    $t0, KEY_MOUSE
  beq   $s7, $t0, daw_mouse
  nop
  li    $t0, KEY_LEFT
  bne   $s7, $t0, daw_key_right
  nop
  lw    $t1, daw_step
  blez  $t1, daw_loop
  nop
  addiu $t1, $t1, -1
  sw    $t1, daw_step
  b     daw_loop
  nop
daw_key_right:
  li    $t0, KEY_RIGHT
  bne   $s7, $t0, daw_key_up
  nop
  lw    $t1, daw_step
  li    $t2, DAW_STEPS-1
  slt   $t3, $t1, $t2
  beq   $t3, $zero, daw_loop
  nop
  addiu $t1, $t1, 1
  sw    $t1, daw_step
  b     daw_loop
  nop
daw_key_up:
  li    $t0, KEY_UP
  bne   $s7, $t0, daw_key_down
  nop
  lw    $t1, daw_row
  blez  $t1, daw_loop
  nop
  addiu $t1, $t1, -1
  sw    $t1, daw_row
  b     daw_loop
  nop
daw_key_down:
  li    $t0, KEY_DOWN
  bne   $s7, $t0, daw_key_toggle
  nop
  lw    $t1, daw_row
  li    $t2, DAW_ROWS-1
  slt   $t3, $t1, $t2
  beq   $t3, $zero, daw_loop
  nop
  addiu $t1, $t1, 1
  sw    $t1, daw_row
  b     daw_loop
  nop
daw_key_toggle:
  li    $t0, ' '
  beq   $s7, $t0, daw_toggle
  nop
  li    $t0, 13
  bne   $s7, $t0, daw_key_letter
  nop
daw_toggle:
  lw    $a0, daw_row
  lw    $a1, daw_step
  jal   daw_cell_ptr
  nop
  lbu   $t0, 0($v0)
  xori  $t0, $t0, 1
  sb    $t0, 0($v0)
  lw    $a0, daw_row
  jal   daw_preview_row
  nop
  b     daw_loop
  nop
daw_key_letter:
  move  $a0, $s7
  jal   char_upper
  nop
  move  $s7, $v0
  li    $t0, 'P'
  bne   $s7, $t0, daw_key_demo
  nop
  jal   daw_play_bar
  nop
  b     daw_loop
  nop
daw_key_demo:
  li    $t0, 'D'
  bne   $s7, $t0, daw_key_clear
  nop
  jal   daw_load_demo
  nop
  b     daw_loop
  nop
daw_key_clear:
  li    $t0, 'C'
  bne   $s7, $t0, daw_key_instrument
  nop
  jal   daw_clear
  nop
  b     daw_loop
  nop
daw_key_instrument:
  li    $t0, 'I'
  bne   $s7, $t0, daw_key_tempo
  nop
  lw    $t1, daw_instrument
  li    $t2, 0
daw_find_patch:
  li    $t3, 4
  beq   $t2, $t3, daw_set_first_patch
  nop
  sll   $t4, $t2, 2
  la    $t5, daw_patches
  addu  $t5, $t5, $t4
  lw    $t6, 0($t5)
  beq   $t6, $t1, daw_next_patch
  nop
  addiu $t2, $t2, 1
  b     daw_find_patch
  nop
daw_next_patch:
  addiu $t2, $t2, 1
  li    $t3, 4
  bne   $t2, $t3, daw_load_patch
  nop
  move  $t2, $zero
daw_load_patch:
  sll   $t4, $t2, 2
  la    $t5, daw_patches
  addu  $t5, $t5, $t4
  lw    $t6, 0($t5)
  sw    $t6, daw_instrument
  lw    $a0, daw_row
  jal   daw_preview_row
  nop
  b     daw_loop
  nop
daw_set_first_patch:
  sw    $zero, daw_instrument
  b     daw_loop
  nop
daw_key_tempo:
  li    $t0, 'T'
  bne   $s7, $t0, daw_key_exit
  nop
  lw    $t1, daw_tempo
  addiu $t1, $t1, 1
  li    $t2, 3
  bne   $t1, $t2, daw_store_tempo
  nop
  move  $t1, $zero
daw_store_tempo:
  sw    $t1, daw_tempo
  b     daw_loop
  nop
daw_key_exit:
  li    $t0, 'Q'
  beq   $s7, $t0, daw_exit
  nop
  li    $t0, KEY_ESCAPE
  bne   $s7, $t0, daw_loop
  nop
daw_exit:
  la    $a0, esc_mouse_off
  jal   tty_puts
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# Mouse clicks map directly to a cell. A second action is not needed: every
# click both selects and toggles, which makes composing with the mouse quick.
daw_mouse:
  lw    $t0, mouse_action
  beq   $t0, $zero, daw_loop
  nop
  lw    $t0, mouse_row
  addiu $t0, $t0, -DAW_GRID_ROW
  bltz  $t0, daw_loop
  nop
  li    $t1, DAW_ROWS
  slt   $t2, $t0, $t1
  beq   $t2, $zero, daw_loop
  nop
  lw    $t3, mouse_column
  addiu $t3, $t3, -DAW_GRID_COL
  bltz  $t3, daw_loop
  nop
  li    $t4, 3
  divu  $t3, $t4
  mflo  $t3
  li    $t4, DAW_STEPS
  slt   $t5, $t3, $t4
  beq   $t5, $zero, daw_loop
  nop
  sw    $t0, daw_row
  sw    $t3, daw_step
  b     daw_toggle
  nop
