# ============================================================
# MARS-OS 1.0 - mouse driven text desktop
#
# A small window manager drawn entirely by the MIPS guest. The TTY only
# translates physical pointer events into standard xterm SGR reports.
# ============================================================

.data
.align 2
desktop_menu_open: .word 0
desktop_dialog:    .word 1
desktop_empty:     .byte 0

desktop_blue:      .byte 27,91,52,52,59,57,55,109,0
desktop_gray:      .byte 27,91,52,55,59,51,48,109,0
desktop_titlebar:  .byte 27,91,52,52,59,57,55,59,49,109,0
desktop_selected:  .byte 27,91,55,109,0
desktop_hide_cur:  .byte 27,91,63,50,53,108,0
desktop_show_cur:  .byte 27,91,63,50,53,104,0

desktop_window_top:    .asciiz "+ MARS-OS Program Manager ----------------------------------------[X]+"
desktop_window_middle: .asciiz "|                                                                      |"
desktop_window_bottom: .asciiz "+----------------------------------------------------------------------+"
desktop_menu_top:      .asciiz "+------------------------+"
desktop_menu_middle:   .asciiz "|                        |"
desktop_menu_bottom:   .asciiz "+------------------------+"
desktop_about_top:     .asciiz "+ MARS-OS ------------------------------------------------------[X]+"
desktop_about_middle:  .asciiz "|                                                                  |"
desktop_about_bottom:  .asciiz "+------------------------------------------------------------------+"
desktop_terminal_top:  .asciiz "+ MARS-OS Terminal ---------------------------------------------------+"
desktop_terminal_hint: .asciiz "| Type exit or desktop to return to Program Manager.                   |"
desktop_terminal_rule: .asciiz "+----------------------------------------------------------------------+"

.text

# Shell compatibility command: leave Terminal and return to Program Manager.
command_desktop:
  li    $t0, 1
  sw    $t0, shell_exit_requested
  jr    $ra
  nop

desktop_mouse_enable:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, esc_mouse_on
  jal   tty_puts
  nop
  la    $a0, desktop_hide_cur
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

desktop_mouse_disable:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, esc_mouse_off
  jal   tty_puts
  nop
  la    $a0, desktop_show_cur
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# Full-screen editor and spreadsheet keep mouse reporting active.
desktop_app_prepare:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, desktop_show_cur
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# a0 row, a1 column, a2 string
desktop_at_puts:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s6, $a2
  jal   ansi_goto
  nop
  move  $a0, $s6
  jal   tty_puts
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

desktop_render:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  la    $a0, desktop_blue
  jal   tty_puts
  nop
  # ED 2 clears every cell using the active blue desktop attributes.
  jal   ansi_clear_screen
  nop
desktop_render_manager:
  la    $a0, desktop_gray
  jal   tty_puts
  nop
  li    $a0, 2
  li    $a1, 4
  la    $a2, desktop_window_top
  jal   desktop_at_puts
  nop
  li    $s7, 3
desktop_render_manager_rows:
  li    $t0, 20
  beq   $s7, $t0, desktop_render_manager_bottom
  nop
  move  $a0, $s7
  li    $a1, 4
  la    $a2, desktop_window_middle
  jal   desktop_at_puts
  nop
  addiu $s7, $s7, 1
  b     desktop_render_manager_rows
  nop
desktop_render_manager_bottom:
  li    $a0, 20
  li    $a1, 4
  la    $a2, desktop_window_bottom
  jal   desktop_at_puts
  nop

  # Program icons.
  li    $a0, 5
  li    $a1, 11
  la    $a2, desktop_icon_terminal
  jal   desktop_at_puts
  nop
  li    $a0, 7
  li    $a1, 9
  la    $a2, desktop_label_terminal
  jal   desktop_at_puts
  nop
  li    $a0, 5
  li    $a1, 30
  la    $a2, desktop_icon_editor
  jal   desktop_at_puts
  nop
  li    $a0, 7
  li    $a1, 28
  la    $a2, desktop_label_editor
  jal   desktop_at_puts
  nop
  li    $a0, 5
  li    $a1, 49
  la    $a2, desktop_icon_sheet
  jal   desktop_at_puts
  nop
  li    $a0, 7
  li    $a1, 47
  la    $a2, desktop_label_sheet
  jal   desktop_at_puts
  nop
  li    $a0, 5
  li    $a1, 67
  la    $a2, desktop_icon_basic
  jal   desktop_at_puts
  nop
  li    $a0, 7
  li    $a1, 65
  la    $a2, desktop_label_basic
  jal   desktop_at_puts
  nop
  li    $a0, 12
  li    $a1, 11
  la    $a2, desktop_icon_about
  jal   desktop_at_puts
  nop
  li    $a0, 14
  li    $a1, 9
  la    $a2, desktop_label_about
  jal   desktop_at_puts
  nop
  li    $a0, 18
  li    $a1, 9
  la    $a2, desktop_hint
  jal   desktop_at_puts
  nop

  # Windows 95 style taskbar.
  li    $a0, 25
  li    $a1, 1
  jal   ansi_goto
  nop
  la    $a0, desktop_gray
  jal   tty_puts
  nop
  li    $a0, 80
  jal   tty_spaces
  nop
  li    $a0, 25
  li    $a1, 2
  la    $a2, desktop_start
  jal   desktop_at_puts
  nop
  li    $a0, 25
  li    $a1, 16
  la    $a2, desktop_task
  jal   desktop_at_puts
  nop

  lw    $t0, desktop_menu_open
  beq   $t0, $zero, desktop_render_dialog
  nop
  jal   desktop_draw_start_menu
  nop
desktop_render_dialog:
  lw    $t0, desktop_dialog
  beq   $t0, $zero, desktop_render_done
  nop
  jal   desktop_draw_about
  nop
desktop_render_done:
  la    $a0, esc_normal
  jal   tty_puts
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

desktop_draw_start_menu:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, desktop_gray
  jal   tty_puts
  nop
  li    $a0, 17
  li    $a1, 1
  la    $a2, desktop_menu_top
  jal   desktop_at_puts
  nop
  li    $a0, 18
  li    $a1, 1
  la    $a2, desktop_menu_header
  jal   desktop_at_puts
  nop
  li    $a0, 19
  li    $a1, 1
  la    $a2, desktop_menu_terminal
  jal   desktop_at_puts
  nop
  li    $a0, 20
  li    $a1, 1
  la    $a2, desktop_menu_editor
  jal   desktop_at_puts
  nop
  li    $a0, 21
  li    $a1, 1
  la    $a2, desktop_menu_sheet
  jal   desktop_at_puts
  nop
  li    $a0, 22
  li    $a1, 1
  la    $a2, desktop_menu_basic
  jal   desktop_at_puts
  nop
  li    $a0, 23
  li    $a1, 1
  la    $a2, desktop_menu_about
  jal   desktop_at_puts
  nop
  li    $a0, 24
  li    $a1, 1
  la    $a2, desktop_menu_exit
  jal   desktop_at_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

desktop_draw_about:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, desktop_gray
  jal   tty_puts
  nop
  li    $a0, 9
  li    $a1, 12
  la    $a2, desktop_about_top
  jal   desktop_at_puts
  nop
  li    $a0, 10
  li    $a1, 12
  la    $a2, desktop_about_middle
  jal   desktop_at_puts
  nop
  li    $a0, 11
  li    $a1, 12
  la    $a2, desktop_about_middle
  jal   desktop_at_puts
  nop
  li    $a0, 12
  li    $a1, 12
  la    $a2, desktop_about_middle
  jal   desktop_at_puts
  nop
  li    $a0, 13
  li    $a1, 12
  la    $a2, desktop_about_middle
  jal   desktop_at_puts
  nop
  li    $a0, 14
  li    $a1, 12
  la    $a2, desktop_about_bottom
  jal   desktop_at_puts
  nop
  li    $a0, 11
  li    $a1, 17
  la    $a2, desktop_welcome
  jal   desktop_at_puts
  nop
  li    $a0, 12
  li    $a1, 17
  la    $a2, desktop_welcome_detail
  jal   desktop_at_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# v0 action: 0 none, 1 redraw, 2 terminal, 3 editor, 4 sheet, 5 BASIC, 6 exit.
desktop_mouse_action:
  move  $v0, $zero
  lw    $t0, mouse_action
  beq   $t0, $zero, desktop_mouse_action_done
  nop
  lw    $t0, mouse_button
  sltiu $t1, $t0, 3
  beq   $t1, $zero, desktop_mouse_action_done
  nop
  lw    $t2, mouse_column
  lw    $t3, mouse_row

  # Close the About dialog.
  lw    $t0, desktop_dialog
  beq   $t0, $zero, desktop_mouse_taskbar
  nop
  li    $t0, 9
  bne   $t3, $t0, desktop_mouse_taskbar
  nop
  li    $t0, 70
  slt   $t1, $t2, $t0
  bne   $t1, $zero, desktop_mouse_taskbar
  nop
  sw    $zero, desktop_dialog
  li    $v0, 1
  jr    $ra
  nop

desktop_mouse_taskbar:
  li    $t0, 25
  bne   $t3, $t0, desktop_mouse_menu
  nop
  li    $t0, 12
  slt   $t1, $t2, $t0
  beq   $t1, $zero, desktop_mouse_action_done
  nop
  lw    $t0, desktop_menu_open
  xori  $t0, $t0, 1
  sw    $t0, desktop_menu_open
  li    $v0, 1
  jr    $ra
  nop

desktop_mouse_menu:
  lw    $t0, desktop_menu_open
  beq   $t0, $zero, desktop_mouse_icons
  nop
  li    $t0, 27
  slt   $t1, $t2, $t0
  beq   $t1, $zero, desktop_mouse_hide_menu
  nop
  li    $t0, 19
  beq   $t3, $t0, desktop_mouse_terminal
  nop
  li    $t0, 20
  beq   $t3, $t0, desktop_mouse_editor
  nop
  li    $t0, 21
  beq   $t3, $t0, desktop_mouse_sheet
  nop
  li    $t0, 22
  beq   $t3, $t0, desktop_mouse_basic
  nop
  li    $t0, 23
  beq   $t3, $t0, desktop_mouse_about
  nop
  li    $t0, 24
  beq   $t3, $t0, desktop_mouse_exit
  nop
desktop_mouse_hide_menu:
  sw    $zero, desktop_menu_open
  li    $v0, 1
  jr    $ra
  nop

desktop_mouse_icons:
  # Close Program Manager through its title bar button.
  li    $t0, 2
  bne   $t3, $t0, desktop_mouse_icon_rows
  nop
  li    $t0, 72
  slt   $t1, $t2, $t0
  beq   $t1, $zero, desktop_mouse_exit
  nop
desktop_mouse_icon_rows:
  li    $t0, 5
  slt   $t1, $t3, $t0
  bne   $t1, $zero, desktop_mouse_about_icon
  nop
  li    $t0, 9
  slt   $t1, $t3, $t0
  beq   $t1, $zero, desktop_mouse_about_icon
  nop
  li    $t0, 24
  slt   $t1, $t2, $t0
  bne   $t1, $zero, desktop_mouse_terminal
  nop
  li    $t0, 43
  slt   $t1, $t2, $t0
  bne   $t1, $zero, desktop_mouse_editor
  nop
  li    $t0, 62
  slt   $t1, $t2, $t0
  bne   $t1, $zero, desktop_mouse_sheet
  nop
  b     desktop_mouse_basic
  nop
desktop_mouse_about_icon:
  li    $t0, 11
  slt   $t1, $t3, $t0
  bne   $t1, $zero, desktop_mouse_action_done
  nop
  li    $t0, 16
  slt   $t1, $t3, $t0
  beq   $t1, $zero, desktop_mouse_action_done
  nop
  li    $t0, 25
  slt   $t1, $t2, $t0
  beq   $t1, $zero, desktop_mouse_action_done
  nop
desktop_mouse_about:
  li    $t0, 1
  sw    $t0, desktop_dialog
  sw    $zero, desktop_menu_open
  li    $v0, 1
  jr    $ra
  nop
desktop_mouse_terminal:
  li    $v0, 2
  jr    $ra
  nop
desktop_mouse_editor:
  li    $v0, 3
  jr    $ra
  nop
desktop_mouse_sheet:
  li    $v0, 4
  jr    $ra
  nop
desktop_mouse_basic:
  li    $v0, 5
  jr    $ra
  nop
desktop_mouse_exit:
  li    $v0, 6
desktop_mouse_action_done:
  jr    $ra
  nop

desktop_main:
  addiu $sp, $sp, -32
  sw    $ra, 28($sp)
  sw    $s1, 24($sp)
  sw    $s2, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  sw    $zero, desktop_menu_open
  li    $t0, 1
  sw    $t0, desktop_dialog
  jal   desktop_mouse_enable
  nop
desktop_main_redraw:
  jal   desktop_render
  nop
desktop_main_loop:
  jal   tty_getkey
  nop
  move  $s7, $v0
  li    $t0, KEY_MOUSE
  bne   $s7, $t0, desktop_main_keyboard
  nop
  jal   desktop_mouse_action
  nop
  move  $s7, $v0
  b     desktop_main_dispatch
  nop
desktop_main_keyboard:
  li    $s7, 0
  li    $t0, 's'
  beq   $v0, $t0, desktop_main_toggle_menu
  nop
  li    $t0, 't'
  beq   $v0, $t0, desktop_main_terminal
  nop
  li    $t0, 'e'
  beq   $v0, $t0, desktop_main_editor
  nop
  li    $t0, 'w'
  beq   $v0, $t0, desktop_main_sheet
  nop
  li    $t0, 'b'
  beq   $v0, $t0, desktop_main_basic
  nop
  li    $t0, 'q'
  beq   $v0, $t0, desktop_main_exit
  nop
  li    $t0, KEY_ESCAPE
  bne   $v0, $t0, desktop_main_loop
  nop
  sw    $zero, desktop_menu_open
  sw    $zero, desktop_dialog
  b     desktop_main_redraw
  nop
desktop_main_toggle_menu:
  lw    $t0, desktop_menu_open
  xori  $t0, $t0, 1
  sw    $t0, desktop_menu_open
  b     desktop_main_redraw
  nop
desktop_main_terminal:
  li    $s7, 2
  b     desktop_main_dispatch
  nop
desktop_main_editor:
  li    $s7, 3
  b     desktop_main_dispatch
  nop
desktop_main_sheet:
  li    $s7, 4
  b     desktop_main_dispatch
  nop
desktop_main_basic:
  li    $s7, 5
desktop_main_dispatch:
  li    $t0, 1
  beq   $s7, $t0, desktop_main_redraw
  nop
  li    $t0, 2
  beq   $s7, $t0, desktop_main_terminal_launch
  nop
  li    $t0, 3
  beq   $s7, $t0, desktop_main_editor_launch
  nop
  li    $t0, 4
  beq   $s7, $t0, desktop_main_sheet_launch
  nop
  li    $t0, 5
  beq   $s7, $t0, desktop_main_basic_launch
  nop
  li    $t0, 6
  beq   $s7, $t0, desktop_main_exit
  nop
  b     desktop_main_loop
  nop

desktop_main_editor_launch:
  jal   desktop_app_prepare
  nop
  la    $s2, rom_notes_name
  jal   command_edit
  nop
  jal   desktop_mouse_enable
  nop
  b     desktop_main_redraw
  nop
desktop_main_sheet_launch:
  jal   desktop_app_prepare
  nop
  la    $s2, rom_sheet_name
  jal   command_sheet
  nop
  jal   desktop_mouse_enable
  nop
  b     desktop_main_redraw
  nop
desktop_main_basic_launch:
  jal   desktop_mouse_disable
  nop
  la    $s2, desktop_empty
  jal   ansi_clear_screen
  nop
  jal   command_basic
  nop
  jal   desktop_mouse_enable
  nop
  b     desktop_main_redraw
  nop
desktop_main_terminal_launch:
  jal   desktop_mouse_disable
  nop
  jal   ansi_clear_screen
  nop
  li    $a0, 1
  li    $a1, 4
  la    $a2, desktop_terminal_top
  jal   desktop_at_puts
  nop
  li    $a0, 2
  li    $a1, 4
  la    $a2, desktop_terminal_hint
  jal   desktop_at_puts
  nop
  li    $a0, 3
  li    $a1, 4
  la    $a2, desktop_terminal_rule
  jal   desktop_at_puts
  nop
  li    $a0, 4
  li    $a1, 1
  jal   ansi_goto
  nop
  jal   shell_session
  nop
  jal   desktop_mouse_enable
  nop
  b     desktop_main_redraw
  nop

desktop_main_exit:
  jal   desktop_mouse_disable
  nop
  jal   ansi_clear_screen
  nop
desktop_main_restore:
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
