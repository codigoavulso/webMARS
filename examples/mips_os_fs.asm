# ============================================================
# MARS-OS 1.0 - writable RAM filesystem
#
# The disk is a flat directory of fixed size slots carved out of
# the data segment.  Nothing is persisted to the host: the disk is
# rebuilt from read-only templates at every boot, and everything
# written afterwards lives in simulated RAM until the machine is
# reset.  Text is stored with bare newlines and translated to CRLF
# only on the way out to the terminal.
# ============================================================

.eqv FS_MAX_FILES   16
.eqv FS_NAME_CAP    20
.eqv FS_FILE_CAP    1024
.eqv SORT_MAX_LINES 48
.eqv SORT_LINE_CAP  64

.data
.align 2
fs_names:  .space 320          # FS_MAX_FILES * FS_NAME_CAP
fs_sizes:  .space 64           # FS_MAX_FILES words
fs_data:   .space 16384        # FS_MAX_FILES * FS_FILE_CAP
sort_buf:  .space 3072         # SORT_MAX_LINES * SORT_LINE_CAP
sort_swap: .space 64           # SORT_LINE_CAP

.text

# ------------------------------------------------------------
# Slot arithmetic
# ------------------------------------------------------------

# a0 = index, v0 = name pointer
fs_name_ptr:
  li    $t0, FS_NAME_CAP
  mul   $t0, $a0, $t0
  la    $v0, fs_names
  addu  $v0, $v0, $t0
  jr    $ra
  nop

# a0 = index, v0 = data pointer
fs_data_ptr:
  li    $t0, FS_FILE_CAP
  mul   $t0, $a0, $t0
  la    $v0, fs_data
  addu  $v0, $v0, $t0
  jr    $ra
  nop

# a0 = index, v0 = size in bytes
fs_size:
  sll   $t0, $a0, 2
  la    $t1, fs_sizes
  addu  $t1, $t1, $t0
  lw    $v0, 0($t1)
  jr    $ra
  nop

# a0 = index, a1 = size
fs_set_size:
  sll   $t0, $a0, 2
  la    $t1, fs_sizes
  addu  $t1, $t1, $t0
  sw    $a1, 0($t1)
  jr    $ra
  nop

# a0 = index, v0 = 1 when the slot holds a file
fs_slot_used:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   fs_name_ptr
  nop
  lbu   $v0, 0($v0)
  beq   $v0, $zero, fs_slot_used_done
  nop
  li    $v0, 1
fs_slot_used_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

fs_reset:
  la    $t0, fs_names
  li    $t1, FS_MAX_FILES
fs_reset_loop:
  blez  $t1, fs_reset_done
  nop
  sb    $zero, 0($t0)
  addiu $t0, $t0, FS_NAME_CAP
  addiu $t1, $t1, -1
  b     fs_reset_loop
  nop
fs_reset_done:
  la    $t0, fs_sizes
  li    $t1, FS_MAX_FILES
fs_reset_sizes:
  blez  $t1, fs_reset_return
  nop
  sw    $zero, 0($t0)
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  b     fs_reset_sizes
  nop
fs_reset_return:
  jr    $ra
  nop

# a0 = name, v0 = index or -1
fs_find:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s5, $a0
  move  $s6, $zero
fs_find_loop:
  li    $t0, FS_MAX_FILES
  beq   $s6, $t0, fs_find_missing
  nop
  move  $a0, $s6
  jal   fs_name_ptr
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  beq   $t0, $zero, fs_find_next
  nop
  move  $a0, $s5
  move  $a1, $s7
  jal   str_equal
  nop
  bne   $v0, $zero, fs_find_hit
  nop
fs_find_next:
  addiu $s6, $s6, 1
  b     fs_find_loop
  nop
fs_find_hit:
  move  $v0, $s6
  b     fs_find_done
  nop
fs_find_missing:
  li    $v0, -1
fs_find_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# a0 = name, v0 = new index or -1 when the disk is full
fs_alloc:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s5, $a0
  move  $s6, $zero
fs_alloc_loop:
  li    $t0, FS_MAX_FILES
  beq   $s6, $t0, fs_alloc_full
  nop
  move  $a0, $s6
  jal   fs_name_ptr
  nop
  move  $s7, $v0
  lbu   $t0, 0($s7)
  beq   $t0, $zero, fs_alloc_claim
  nop
  addiu $s6, $s6, 1
  b     fs_alloc_loop
  nop
fs_alloc_claim:
  move  $a0, $s7
  move  $a1, $s5
  li    $a2, FS_NAME_CAP-1
  jal   str_copy_n
  nop
  move  $a0, $s6
  move  $a1, $zero
  jal   fs_set_size
  nop
  move  $a0, $s6
  jal   fs_data_ptr
  nop
  sb    $zero, 0($v0)
  move  $v0, $s6
  b     fs_alloc_done
  nop
fs_alloc_full:
  li    $v0, -1
fs_alloc_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# a0 = name, v0 = index of an existing or freshly created file, or -1
fs_open_or_create:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  jal   fs_find
  nop
  bgez  $v0, fs_open_or_create_done
  nop
  move  $a0, $s7
  jal   fs_alloc
  nop
fs_open_or_create_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# a0 = index
fs_remove:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  jal   fs_name_ptr
  nop
  sb    $zero, 0($v0)
  move  $a0, $s7
  move  $a1, $zero
  jal   fs_set_size
  nop
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# a0 = index, a1 = source bytes, a2 = length. v0 = stored length.
fs_write:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s5, $a0
  move  $s6, $a1
  move  $s7, $a2
  li    $t0, FS_FILE_CAP-1
  slt   $t1, $t0, $s7
  beq   $t1, $zero, fs_write_store
  nop
  move  $s7, $t0
fs_write_store:
  move  $a0, $s5
  jal   fs_data_ptr
  nop
  move  $a0, $v0
  move  $a1, $s6
  move  $a2, $s7
  jal   mem_move
  nop
  move  $a0, $s5
  jal   fs_data_ptr
  nop
  addu  $t0, $v0, $s7
  sb    $zero, 0($t0)
  move  $a0, $s5
  move  $a1, $s7
  jal   fs_set_size
  nop
  move  $v0, $s7
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# a0 = index, a1 = source bytes, a2 = length. v0 = bytes actually appended.
fs_append:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s4, 16($sp)
  sw    $s5, 12($sp)
  sw    $s6, 8($sp)
  sw    $s7, 4($sp)
  move  $s5, $a0
  move  $s6, $a1
  move  $s7, $a2
  move  $a0, $s5
  jal   fs_size
  nop
  move  $s4, $v0
  li    $t0, FS_FILE_CAP-1
  subu  $t0, $t0, $s4
  slt   $t1, $t0, $s7
  beq   $t1, $zero, fs_append_store
  nop
  move  $s7, $t0
fs_append_store:
  blez  $s7, fs_append_none
  nop
  move  $a0, $s5
  jal   fs_data_ptr
  nop
  addu  $a0, $v0, $s4
  move  $a1, $s6
  move  $a2, $s7
  jal   mem_move
  nop
  addu  $t0, $s4, $s7
  move  $a0, $s5
  move  $a1, $t0
  jal   fs_set_size
  nop
  move  $a0, $s5
  jal   fs_data_ptr
  nop
  addu  $t0, $s4, $s7
  addu  $t0, $v0, $t0
  sb    $zero, 0($t0)
  move  $v0, $s7
  b     fs_append_done
  nop
fs_append_none:
  move  $v0, $zero
fs_append_done:
  lw    $s7, 4($sp)
  lw    $s6, 8($sp)
  lw    $s5, 12($sp)
  lw    $s4, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# v0 = files in use, v1 = bytes in use
fs_usage:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s5, $zero
  move  $s6, $zero
  move  $s7, $zero
fs_usage_loop:
  li    $t0, FS_MAX_FILES
  beq   $s7, $t0, fs_usage_done
  nop
  move  $a0, $s7
  jal   fs_slot_used
  nop
  beq   $v0, $zero, fs_usage_next
  nop
  addiu $s5, $s5, 1
  move  $a0, $s7
  jal   fs_size
  nop
  addu  $s6, $s6, $v0
fs_usage_next:
  addiu $s7, $s7, 1
  b     fs_usage_loop
  nop
fs_usage_done:
  move  $v0, $s5
  move  $v1, $s6
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# a0 = byte pointer, a1 = length. Prints the block with CRLF endings.
fs_print_block:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s5, $a0
  move  $s6, $a1
  move  $s7, $zero
fs_print_block_loop:
  beq   $s7, $s6, fs_print_block_done
  nop
  addu  $t0, $s5, $s7
  lbu   $a0, 0($t0)
  beq   $a0, $zero, fs_print_block_done
  nop
  li    $t1, 10
  bne   $a0, $t1, fs_print_block_emit
  nop
  jal   tty_crlf
  nop
  b     fs_print_block_next
  nop
fs_print_block_emit:
  jal   tty_putc
  nop
fs_print_block_next:
  addiu $s7, $s7, 1
  b     fs_print_block_loop
  nop
fs_print_block_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# ------------------------------------------------------------
# Line iteration
#
# a0 = cursor, a1 = end of buffer, a2 = destination, a3 = capacity
# v0 = cursor after the newline, v1 = copied length, a2 preserved.
# ------------------------------------------------------------

line_take:
  move  $t0, $a0
  move  $t1, $a2
  move  $v1, $zero
line_take_loop:
  sltu  $t2, $t0, $a1
  beq   $t2, $zero, line_take_end
  nop
  lbu   $t3, 0($t0)
  beq   $t3, $zero, line_take_end
  nop
  addiu $t0, $t0, 1
  li    $t4, 10
  beq   $t3, $t4, line_take_done
  nop
  addiu $t4, $a3, -1
  slt   $t5, $v1, $t4
  beq   $t5, $zero, line_take_loop
  nop
  sb    $t3, 0($t1)
  addiu $t1, $t1, 1
  addiu $v1, $v1, 1
  b     line_take_loop
  nop
line_take_end:
  move  $t0, $a1
line_take_done:
  sb    $zero, 0($t1)
  move  $v0, $t0
  jr    $ra
  nop

# a0 = buffer, a1 = length, v0 = line count
line_count:
  move  $t0, $a0
  addu  $t1, $a0, $a1
  move  $v0, $zero
  beq   $a1, $zero, line_count_done
  nop
line_count_loop:
  sltu  $t2, $t0, $t1
  beq   $t2, $zero, line_count_tail
  nop
  lbu   $t3, 0($t0)
  addiu $t0, $t0, 1
  li    $t4, 10
  bne   $t3, $t4, line_count_loop
  nop
  addiu $v0, $v0, 1
  b     line_count_loop
  nop
line_count_tail:
  addiu $t2, $a1, -1
  addu  $t2, $a0, $t2
  lbu   $t3, 0($t2)
  li    $t4, 10
  beq   $t3, $t4, line_count_done
  nop
  addiu $v0, $v0, 1
line_count_done:
  jr    $ra
  nop

# ------------------------------------------------------------
# Filesystem commands
# ------------------------------------------------------------

command_ls:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  la    $a0, ls_header
  jal   tty_puts
  nop
  move  $s6, $zero
  move  $s7, $zero
command_ls_loop:
  li    $t0, FS_MAX_FILES
  beq   $s7, $t0, command_ls_done
  nop
  move  $a0, $s7
  jal   fs_slot_used
  nop
  beq   $v0, $zero, command_ls_next
  nop
  addiu $s6, $s6, 1
  move  $a0, $s7
  jal   fs_name_ptr
  nop
  move  $a0, $v0
  li    $a1, FS_NAME_CAP
  jal   tty_puts_pad
  nop
  move  $a0, $s7
  jal   fs_size
  nop
  move  $s5, $v0
  move  $a0, $s5
  li    $a1, 6
  jal   tty_put_int_width
  nop
  move  $a0, $s7
  jal   fs_data_ptr
  nop
  move  $a0, $v0
  move  $a1, $s5
  jal   line_count
  nop
  move  $a0, $v0
  li    $a1, 7
  jal   tty_put_int_width
  nop
  jal   tty_crlf
  nop
command_ls_next:
  addiu $s7, $s7, 1
  b     command_ls_loop
  nop
command_ls_done:
  bne   $s6, $zero, command_ls_return
  nop
  la    $a0, ls_empty
  jal   tty_puts
  nop
command_ls_return:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

command_cat:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   fs_require
  nop
  bltz  $v0, command_cat_done
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   fs_size
  nop
  move  $s6, $v0
  move  $a0, $s7
  jal   fs_data_ptr
  nop
  move  $a0, $v0
  move  $a1, $s6
  jal   fs_print_block
  nop
  jal   tty_crlf
  nop
command_cat_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

command_touch:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  lbu   $t0, 0($s2)
  beq   $t0, $zero, command_touch_usage
  nop
  move  $a0, $s2
  jal   fs_open_or_create
  nop
  bltz  $v0, command_touch_full
  nop
  la    $a0, msg_ok
  jal   tty_puts
  nop
  b     command_touch_done
  nop
command_touch_full:
  la    $a0, msg_disk_full
  jal   tty_puts
  nop
  b     command_touch_done
  nop
command_touch_usage:
  la    $a0, msg_need_name
  jal   tty_puts
  nop
command_touch_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_rm:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  move  $a0, $s2
  jal   fs_require
  nop
  bltz  $v0, command_rm_done
  nop
  move  $a0, $v0
  jal   fs_remove
  nop
  la    $a0, msg_ok
  jal   tty_puts
  nop
command_rm_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_cp:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   split_command
  nop
  move  $s5, $v0
  move  $s6, $v1
  lbu   $t0, 0($s6)
  beq   $t0, $zero, command_cp_usage
  nop
  move  $a0, $s5
  jal   fs_require
  nop
  bltz  $v0, command_cp_done
  nop
  move  $s5, $v0
  move  $a0, $s6
  jal   fs_open_or_create
  nop
  bltz  $v0, command_cp_full
  nop
  move  $s7, $v0
  move  $a0, $s5
  jal   fs_size
  nop
  move  $s6, $v0
  move  $a0, $s5
  jal   fs_data_ptr
  nop
  move  $a1, $v0
  move  $a0, $s7
  move  $a2, $s6
  jal   fs_write
  nop
  la    $a0, msg_ok
  jal   tty_puts
  nop
  b     command_cp_done
  nop
command_cp_full:
  la    $a0, msg_disk_full
  jal   tty_puts
  nop
  b     command_cp_done
  nop
command_cp_usage:
  la    $a0, msg_copy_usage
  jal   tty_puts
  nop
command_cp_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

command_mv:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   split_command
  nop
  move  $s5, $v0
  move  $s6, $v1
  lbu   $t0, 0($s6)
  beq   $t0, $zero, command_mv_usage
  nop
  move  $a0, $s5
  jal   fs_require
  nop
  bltz  $v0, command_mv_done
  nop
  move  $s7, $v0
  move  $a0, $s6
  jal   fs_find
  nop
  bltz  $v0, command_mv_rename
  nop
  la    $a0, msg_exists
  jal   tty_puts
  nop
  b     command_mv_done
  nop
command_mv_rename:
  move  $a0, $s7
  jal   fs_name_ptr
  nop
  move  $a0, $v0
  move  $a1, $s6
  li    $a2, FS_NAME_CAP-1
  jal   str_copy_n
  nop
  la    $a0, msg_ok
  jal   tty_puts
  nop
  b     command_mv_done
  nop
command_mv_usage:
  la    $a0, msg_move_usage
  jal   tty_puts
  nop
command_mv_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

command_write:
  li    $t8, 0
  b     write_common
  nop

command_append:
  li    $t8, 1

write_common:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s4, $t8
  move  $a0, $s2
  jal   split_command
  nop
  move  $s5, $v0
  move  $s6, $v1
  lbu   $t0, 0($s5)
  beq   $t0, $zero, write_usage
  nop
  move  $a0, $s5
  jal   fs_open_or_create
  nop
  bltz  $v0, write_full
  nop
  move  $s7, $v0
  move  $a0, $s6
  jal   str_len
  nop
  move  $a2, $v0
  move  $a1, $s6
  move  $a0, $s7
  bne   $s4, $zero, write_append_call
  nop
  jal   fs_write
  nop
  b     write_newline
  nop
write_append_call:
  jal   fs_append
  nop
write_newline:
  li    $t0, 10
  la    $t1, scratch_buf
  sb    $t0, 0($t1)
  sb    $zero, 1($t1)
  move  $a0, $s7
  la    $a1, scratch_buf
  li    $a2, 1
  jal   fs_append
  nop
  la    $a0, msg_ok
  jal   tty_puts
  nop
  b     write_done
  nop
write_full:
  la    $a0, msg_disk_full
  jal   tty_puts
  nop
  b     write_done
  nop
write_usage:
  la    $a0, msg_write_usage
  jal   tty_puts
  nop
write_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

command_wc:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   fs_require
  nop
  bltz  $v0, command_wc_done
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   fs_size
  nop
  move  $s6, $v0
  move  $a0, $s7
  jal   fs_data_ptr
  nop
  move  $s5, $v0
  move  $a0, $s5
  move  $a1, $s6
  jal   line_count
  nop
  move  $s4, $v0

  la    $a0, wc_lines
  jal   tty_puts
  nop
  move  $a0, $s4
  jal   tty_put_uint
  nop
  la    $a0, wc_words
  jal   tty_puts
  nop
  move  $a0, $s5
  move  $a1, $s6
  jal   word_count
  nop
  move  $a0, $v0
  jal   tty_put_uint
  nop
  la    $a0, wc_bytes
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
command_wc_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# a0 = buffer, a1 = length, v0 = whitespace separated word count
word_count:
  move  $t0, $a0
  addu  $t1, $a0, $a1
  move  $v0, $zero
  move  $t5, $zero
word_count_loop:
  sltu  $t2, $t0, $t1
  beq   $t2, $zero, word_count_done
  nop
  lbu   $t3, 0($t0)
  addiu $t0, $t0, 1
  li    $t4, ' '
  beq   $t3, $t4, word_count_space
  nop
  li    $t4, 10
  beq   $t3, $t4, word_count_space
  nop
  li    $t4, 13
  beq   $t3, $t4, word_count_space
  nop
  li    $t4, 9
  beq   $t3, $t4, word_count_space
  nop
  bne   $t5, $zero, word_count_loop
  nop
  li    $t5, 1
  addiu $v0, $v0, 1
  b     word_count_loop
  nop
word_count_space:
  move  $t5, $zero
  b     word_count_loop
  nop
word_count_done:
  jr    $ra
  nop

command_head:
  li    $t8, 0
  b     head_tail_common
  nop
command_tail:
  li    $t8, 1
head_tail_common:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s3, $t8
  move  $a0, $s2
  jal   fs_require
  nop
  bltz  $v0, head_tail_done
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   fs_size
  nop
  move  $s6, $v0
  move  $a0, $s7
  jal   fs_data_ptr
  nop
  move  $s5, $v0
  move  $a0, $s5
  move  $a1, $s6
  jal   line_count
  nop
  move  $s4, $v0
  # head keeps the first five lines, tail keeps the last five.
  beq   $s3, $zero, head_tail_scan
  nop
  addiu $t0, $s4, -5
  bgez  $t0, head_tail_skip_ready
  nop
  move  $t0, $zero
head_tail_skip_ready:
  move  $s3, $t0
  b     head_tail_scan
  nop
head_tail_scan:
  addu  $s6, $s5, $s6
  move  $s4, $zero
head_tail_loop:
  sltu  $t0, $s5, $s6
  beq   $t0, $zero, head_tail_done
  nop
  move  $a0, $s5
  move  $a1, $s6
  la    $a2, scratch_buf
  li    $a3, LINE_CAP
  jal   line_take
  nop
  move  $s5, $v0
  slt   $t0, $s4, $s3
  bne   $t0, $zero, head_tail_next
  nop
  addiu $t0, $s3, 5
  slt   $t1, $s4, $t0
  beq   $t1, $zero, head_tail_done
  nop
  la    $a0, scratch_buf
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
head_tail_next:
  addiu $s4, $s4, 1
  b     head_tail_loop
  nop
head_tail_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

command_grep:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   split_command
  nop
  move  $s3, $v0
  move  $s4, $v1
  lbu   $t0, 0($s3)
  beq   $t0, $zero, command_grep_usage
  nop
  lbu   $t0, 0($s4)
  beq   $t0, $zero, command_grep_usage
  nop
  move  $a0, $s4
  jal   fs_require
  nop
  bltz  $v0, command_grep_done
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   fs_size
  nop
  move  $s6, $v0
  move  $a0, $s7
  jal   fs_data_ptr
  nop
  move  $s5, $v0
  addu  $s6, $s5, $s6
  move  $s7, $zero
command_grep_loop:
  sltu  $t0, $s5, $s6
  beq   $t0, $zero, command_grep_report
  nop
  move  $a0, $s5
  move  $a1, $s6
  la    $a2, scratch_buf
  li    $a3, LINE_CAP
  jal   line_take
  nop
  move  $s5, $v0
  addiu $s7, $s7, 1
  la    $a0, scratch_buf
  move  $a1, $s3
  jal   str_contains
  nop
  beq   $v0, $zero, command_grep_loop
  nop
  move  $a0, $s7
  li    $a1, 4
  jal   tty_put_int_width
  nop
  la    $a0, grep_separator
  jal   tty_puts
  nop
  la    $a0, scratch_buf
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  b     command_grep_loop
  nop
command_grep_report:
  b     command_grep_done
  nop
command_grep_usage:
  la    $a0, msg_grep_usage
  jal   tty_puts
  nop
command_grep_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

command_sort:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   fs_require
  nop
  bltz  $v0, command_sort_done
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   fs_size
  nop
  move  $s6, $v0
  move  $a0, $s7
  jal   fs_data_ptr
  nop
  move  $s5, $v0
  addu  $s6, $s5, $s6
  move  $s4, $zero
command_sort_load:
  sltu  $t0, $s5, $s6
  beq   $t0, $zero, command_sort_run
  nop
  li    $t0, SORT_MAX_LINES
  beq   $s4, $t0, command_sort_run
  nop
  li    $t0, SORT_LINE_CAP
  mul   $t0, $s4, $t0
  la    $t1, sort_buf
  addu  $a2, $t1, $t0
  move  $a0, $s5
  move  $a1, $s6
  li    $a3, SORT_LINE_CAP
  jal   line_take
  nop
  move  $s5, $v0
  addiu $s4, $s4, 1
  b     command_sort_load
  nop

command_sort_run:
  move  $s3, $zero
command_sort_outer:
  addiu $t0, $s4, -1
  slt   $t1, $s3, $t0
  beq   $t1, $zero, command_sort_print
  nop
  addiu $s5, $s3, 1
command_sort_inner:
  slt   $t1, $s5, $s4
  beq   $t1, $zero, command_sort_outer_next
  nop
  li    $t0, SORT_LINE_CAP
  mul   $t1, $s3, $t0
  la    $t2, sort_buf
  addu  $s6, $t2, $t1
  mul   $t1, $s5, $t0
  addu  $s7, $t2, $t1
  move  $a0, $s6
  move  $a1, $s7
  jal   str_compare
  nop
  blez  $v0, command_sort_inner_next
  nop
  la    $a0, sort_swap
  move  $a1, $s6
  li    $a2, SORT_LINE_CAP
  jal   mem_move
  nop
  move  $a0, $s6
  move  $a1, $s7
  li    $a2, SORT_LINE_CAP
  jal   mem_move
  nop
  move  $a0, $s7
  la    $a1, sort_swap
  li    $a2, SORT_LINE_CAP
  jal   mem_move
  nop
command_sort_inner_next:
  addiu $s5, $s5, 1
  b     command_sort_inner
  nop
command_sort_outer_next:
  addiu $s3, $s3, 1
  b     command_sort_outer
  nop

command_sort_print:
  move  $s3, $zero
command_sort_print_loop:
  slt   $t0, $s3, $s4
  beq   $t0, $zero, command_sort_done
  nop
  li    $t0, SORT_LINE_CAP
  mul   $t0, $s3, $t0
  la    $t1, sort_buf
  addu  $a0, $t1, $t0
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  addiu $s3, $s3, 1
  b     command_sort_print_loop
  nop
command_sort_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

command_hexdump:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $a0, $s2
  jal   fs_require
  nop
  bltz  $v0, command_hexdump_done
  nop
  move  $s7, $v0
  move  $a0, $s7
  jal   fs_size
  nop
  move  $s6, $v0
  move  $a0, $s7
  jal   fs_data_ptr
  nop
  move  $s5, $v0
  move  $s4, $zero
command_hexdump_row:
  slt   $t0, $s4, $s6
  beq   $t0, $zero, command_hexdump_done
  nop
  move  $a0, $s4
  li    $a1, 4
  jal   tty_put_hex_digits
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  move  $s3, $zero
command_hexdump_bytes:
  li    $t0, 16
  beq   $s3, $t0, command_hexdump_text
  nop
  addu  $t0, $s4, $s3
  slt   $t1, $t0, $s6
  beq   $t1, $zero, command_hexdump_pad
  nop
  addu  $t1, $s5, $t0
  lbu   $a0, 0($t1)
  li    $a1, 2
  jal   tty_put_hex_digits
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  b     command_hexdump_bytes_next
  nop
command_hexdump_pad:
  li    $a0, 3
  jal   tty_spaces
  nop
command_hexdump_bytes_next:
  addiu $s3, $s3, 1
  b     command_hexdump_bytes
  nop
command_hexdump_text:
  li    $a0, '|'
  jal   tty_putc
  nop
  move  $s3, $zero
command_hexdump_chars:
  li    $t0, 16
  beq   $s3, $t0, command_hexdump_endrow
  nop
  addu  $t0, $s4, $s3
  slt   $t1, $t0, $s6
  beq   $t1, $zero, command_hexdump_chars_next
  nop
  addu  $t1, $s5, $t0
  lbu   $a0, 0($t1)
  li    $t2, 32
  slt   $t3, $a0, $t2
  bne   $t3, $zero, command_hexdump_dot
  nop
  li    $t2, 127
  slt   $t3, $a0, $t2
  bne   $t3, $zero, command_hexdump_emit
  nop
command_hexdump_dot:
  li    $a0, '.'
command_hexdump_emit:
  jal   tty_putc
  nop
command_hexdump_chars_next:
  addiu $s3, $s3, 1
  b     command_hexdump_chars
  nop
command_hexdump_endrow:
  li    $a0, '|'
  jal   tty_putc
  nop
  jal   tty_crlf
  nop
  addiu $s4, $s4, 16
  b     command_hexdump_row
  nop
command_hexdump_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $s4, 12($sp)
  lw    $s3, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

command_df:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   fs_usage
  nop
  move  $s6, $v0
  move  $s7, $v1
  la    $a0, df_files
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   tty_put_uint
  nop
  la    $a0, df_of
  jal   tty_puts
  nop
  li    $a0, FS_MAX_FILES
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
  la    $a0, df_bytes
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_uint
  nop
  la    $a0, df_of
  jal   tty_puts
  nop
  li    $t0, FS_MAX_FILES
  li    $t1, FS_FILE_CAP
  mul   $a0, $t0, $t1
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
  la    $a0, df_per_file
  jal   tty_puts
  nop
  li    $a0, FS_FILE_CAP
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# a0 = name. Reports the failure and returns -1 when it is missing.
fs_require:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  move  $s7, $a0
  lbu   $t0, 0($s7)
  beq   $t0, $zero, fs_require_missing_name
  nop
  move  $a0, $s7
  jal   fs_find
  nop
  bgez  $v0, fs_require_done
  nop
  la    $a0, msg_file_missing
  jal   tty_puts
  nop
  li    $v0, -1
  b     fs_require_done
  nop
fs_require_missing_name:
  la    $a0, msg_need_name
  jal   tty_puts
  nop
  li    $v0, -1
fs_require_done:
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# Boot time disk image
#
# rom_table holds name/content pairs defined by the localized
# string module, so the seeded files follow the shell language.
# ------------------------------------------------------------

fs_seed:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   fs_reset
  nop
  la    $s5, rom_table
fs_seed_loop:
  lw    $s6, 0($s5)
  beq   $s6, $zero, fs_seed_done
  nop
  lw    $s7, 4($s5)
  addiu $s5, $s5, 8
  move  $a0, $s6
  jal   fs_alloc
  nop
  bltz  $v0, fs_seed_done
  nop
  move  $s6, $v0
  move  $a0, $s7
  jal   str_len
  nop
  move  $a2, $v0
  move  $a0, $s6
  move  $a1, $s7
  jal   fs_write
  nop
  b     fs_seed_loop
  nop
fs_seed_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop
