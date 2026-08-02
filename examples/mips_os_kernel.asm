# ============================================================
# MARS-OS 1.0 - boot, shell and system services
#
# This module is included by mips.asm after every other kernel
# module.  It expects the localized strings, command names and
# read-only disk templates defined there.
#
# The shell is table driven: command_table pairs a localized name
# with the address of a handler, and the dispatcher calls it with
# $s1 pointing at the verb and $s2 at the rest of the line.
# ============================================================

.data
.align 2
boot_time_low: .word 0
shell_exit_requested: .word 0

# Name/handler pairs, terminated by a null name.
command_table:
  .word cmd_help,      command_help
  .word cmd_about,     command_about
  .word cmd_clear,     command_clear
  .word cmd_echo,      command_echo
  .word cmd_sysinfo,   command_sysinfo
  .word cmd_mem,       command_mem
  .word cmd_uptime,    command_uptime
  .word cmd_clock,     command_clock
  .word cmd_date,      command_date
  .word cmd_bench,     command_bench
  .word cmd_history,   command_history
  .word cmd_color,     command_color
  .word cmd_ps,        command_ps
  .word cmd_pwd,       command_pwd
  .word cmd_ls,        command_ls
  .word cmd_cat,       command_cat
  .word cmd_touch,     command_touch
  .word cmd_rm,        command_rm
  .word cmd_cp,        command_cp
  .word cmd_mv,        command_mv
  .word cmd_write,     command_write
  .word cmd_append,    command_append
  .word cmd_wc,        command_wc
  .word cmd_head,      command_head
  .word cmd_tail,      command_tail
  .word cmd_grep,      command_grep
  .word cmd_sort,      command_sort
  .word cmd_hexdump,   command_hexdump
  .word cmd_df,        command_df
  .word cmd_edit,      command_edit
  .word cmd_sheet,     command_sheet
  .word cmd_calc,      command_calc
  .word cmd_base,      command_base
  .word cmd_ascii,     command_ascii
  .word cmd_banner,    command_banner
  .word cmd_fib,       command_fib
  .word cmd_primes,    command_primes
  .word cmd_rand,      command_rand
  .word cmd_sleep,     command_sleep
  .word cmd_life,      command_life
  .word cmd_guess,     command_guess
  .word cmd_basic,     command_basic
  .word cmd_desktop,   command_desktop
  .word cmd_exit,      command_exit
  .word cmd_reboot,    command_reboot
  .word cmd_shutdown,  command_shutdown
  .word 0, 0

.text
.globl kernel_boot

# Entered from the reset vector in mips_os_lib.asm with $s0 already
# holding the MMIO window base.
kernel_boot:
  jal   os_boot
  nop

desktop_boot_loop:
  jal   desktop_main
  nop
  b     desktop_boot_loop
  nop

# The command shell is a returning application owned by Program Manager.
shell_session:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s1, 8($sp)
  sw    $s2, 4($sp)
  sw    $s3, 0($sp)
  sw    $zero, shell_exit_requested
shell_loop:
  lw    $a0, prompt_color
  jal   tty_puts
  nop
  la    $a0, prompt_user
  jal   tty_puts
  nop
  la    $a0, prompt_host
  jal   tty_puts
  nop
  la    $a0, prompt_path
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop

  la    $a0, line_buf
  li    $a1, LINE_CAP
  jal   tty_read_line
  nop
  beq   $v0, $zero, shell_loop
  nop

  la    $a0, line_buf
  jal   history_add
  nop
  lw    $t0, command_count
  addiu $t0, $t0, 1
  sw    $t0, command_count

  la    $a0, line_buf
  jal   split_command
  nop
  move  $s1, $v0
  move  $s2, $v1
  lbu   $t0, 0($s1)
  beq   $t0, $zero, shell_loop
  nop

  la    $s3, command_table
shell_dispatch:
  lw    $t0, 0($s3)
  beq   $t0, $zero, shell_unknown
  nop
  move  $a0, $s1
  move  $a1, $t0
  jal   str_equal
  nop
  bne   $v0, $zero, shell_invoke
  nop
  addiu $s3, $s3, 8
  b     shell_dispatch
  nop
shell_invoke:
  lw    $t0, 4($s3)
  jalr  $t0
  nop
  lw    $t0, shell_exit_requested
  bne   $t0, $zero, shell_session_done
  nop
  b     shell_loop
  nop

shell_session_done:
  lw    $s3, 0($sp)
  lw    $s2, 4($sp)
  lw    $s1, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

shell_unknown:
  la    $a0, ansi_red
  jal   tty_puts
  nop
  la    $a0, msg_unknown
  jal   tty_puts
  nop
  move  $a0, $s1
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  b     shell_loop
  nop

# ------------------------------------------------------------
# Boot
# ------------------------------------------------------------

os_boot:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)

  li    $v0, 30
  syscall
  sw    $a0, boot_time_low
  li    $t0, CLOCK_PERIOD
  li    $t1, 1000
  sw    $t1, 0($t0)
  li    $t0, CLOCK_CONTROL
  li    $t1, 1
  sw    $t1, 0($t0)
  la    $t0, ansi_green
  sw    $t0, prompt_color

  jal   fs_seed
  nop
  jal   sh_clear_all
  nop

  la    $a0, esc_reset
  jal   tty_puts
  nop
  jal   ansi_clear_screen
  nop
  la    $a0, ansi_bold_cyan
  jal   tty_puts
  nop
  la    $a0, banner
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop
  la    $a0, msg_boot
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  jal   boot_report_disk
  nop
  la    $a0, esc_dim
  jal   tty_puts
  nop
  la    $a0, msg_hint
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  jal   tty_crlf
  nop

  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

boot_report_disk:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  jal   fs_usage
  nop
  move  $s6, $v0
  move  $s7, $v1
  la    $a0, msg_disk_ready
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   tty_put_uint
  nop
  la    $a0, msg_disk_files
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_uint
  nop
  la    $a0, bytes_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# System commands
# ------------------------------------------------------------

command_help:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, help_text
  jal   tty_puts
  nop
  la    $a0, desktop_help_text
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_exit:
  li    $t0, 1
  sw    $t0, shell_exit_requested
  jr    $ra
  nop

command_about:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, about_text
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_clear:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   ansi_clear_screen
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_echo:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  move  $a0, $s2
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_sysinfo:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, sysinfo_header
  jal   tty_puts
  nop
  la    $a0, sysinfo_commands
  jal   tty_puts
  nop
  lw    $a0, command_count
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
  la    $a0, sysinfo_installed
  jal   tty_puts
  nop
  jal   command_table_size
  nop
  move  $a0, $v0
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
  jal   print_uptime
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_table_size:
  la    $t0, command_table
  move  $v0, $zero
command_table_size_loop:
  lw    $t1, 0($t0)
  beq   $t1, $zero, command_table_size_done
  nop
  addiu $v0, $v0, 1
  addiu $t0, $t0, 8
  b     command_table_size_loop
  nop
command_table_size_done:
  jr    $ra
  nop

command_mem:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  move  $s6, $sp
  li    $v0, 9
  move  $a0, $zero
  syscall
  move  $s7, $v0

  la    $a0, mem_heap
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_hex32
  nop
  jal   tty_crlf
  nop

  la    $a0, mem_stack
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   tty_put_hex32
  nop
  jal   tty_crlf
  nop

  la    $a0, mem_history
  jal   tty_puts
  nop
  li    $a0, 1024
  jal   tty_put_uint
  nop
  la    $a0, bytes_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop

  la    $a0, mem_disk
  jal   tty_puts
  nop
  li    $t0, FS_MAX_FILES
  li    $t1, FS_FILE_CAP
  mul   $a0, $t0, $t1
  jal   tty_put_uint
  nop
  la    $a0, bytes_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop

  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

command_uptime:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  jal   print_uptime
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_clock:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  # Syscall 30 is the authoritative host clock.  The command therefore works
  # even when the optional System Clock tool has not been opened or connected.
  li    $v0, 30
  syscall
  move  $s6, $a0
  move  $s7, $a1

  la    $a0, clock_time_prefix
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_hex32
  nop
  la    $a0, clock_separator
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   tty_put_hex32
  nop
  jal   tty_crlf
  nop

  # The remaining registers belong to the optional MMIO clock device.  Its
  # time words are populated by the tool, so zero means that no device has
  # serviced this machine since boot.
  li    $t0, CLOCK_TIME_HIGH
  lw    $t1, 0($t0)
  li    $t0, CLOCK_TIME_LOW
  lw    $t2, 0($t0)
  or    $t1, $t1, $t2
  beq   $t1, $zero, command_clock_device_offline
  nop

  la    $a0, clock_timer_prefix
  jal   tty_puts
  nop
  li    $t0, CLOCK_COUNTER
  lw    $a0, 0($t0)
  jal   tty_put_uint
  nop
  la    $a0, clock_separator
  jal   tty_puts
  nop
  li    $t0, CLOCK_PERIOD
  lw    $a0, 0($t0)
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop

  la    $a0, clock_uptime_prefix
  jal   tty_puts
  nop
  li    $t0, CLOCK_UPTIME
  lw    $a0, 0($t0)
  jal   tty_put_uint
  nop
  la    $a0, ms_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  b     command_clock_uptime
  nop

command_clock_device_offline:
  la    $a0, clock_device_offline
  jal   tty_puts
  nop

command_clock_uptime:
  # Process uptime is also native and remains useful without the MMIO tool.
  jal   print_uptime
  nop
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

command_bench:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s3, 16($sp)
  sw    $s4, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  # Wall-clock benchmark. Detect whether branch delay slots are active so the
  # instruction total remains exact in either simulator mode.
  move  $t8, $zero
  b     bench_delay_probe_done
  addiu $t8, $t8, 1
bench_delay_probe_done:
  li    $v0, 30
  syscall
  move  $s3, $a0
  move  $s4, $zero

bench_sample_loop:
  addu  $t4, $t4, $zero
  addu  $t5, $t5, $zero
  addu  $t6, $t6, $zero
  addu  $t7, $t7, $zero
  addu  $t4, $t4, $zero
  addu  $t5, $t5, $zero
  addu  $t6, $t6, $zero
  addu  $t7, $t7, $zero
  addu  $t4, $t4, $zero
  addu  $t5, $t5, $zero
  addu  $t6, $t6, $zero
  addu  $t7, $t7, $zero
  addu  $t4, $t4, $zero
  addu  $t5, $t5, $zero
  addu  $t6, $t6, $zero
  addu  $t7, $t7, $zero
  addiu $s4, $s4, 1
  li    $v0, 30
  syscall
  subu  $s5, $a0, $s3
  sltiu $t0, $s5, 250
  bne   $t0, $zero, bench_sample_loop
  nop

  # The loop has 22 instructions without delayed branching and 23 with it.
  addiu $t0, $t8, 22
  multu $s4, $t0
  mflo  $s6
  # Scaling to seconds before dividing keeps the answer exact: dividing
  # first threw away everything below one instruction per millisecond.
  li    $t0, 1000
  multu $s6, $t0
  mfhi  $a0
  mflo  $a1
  move  $a2, $s5
  jal   div64
  nop
  move  $s7, $v1

  la    $a0, bench_result_prefix
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_uint
  nop
  la    $a0, bench_ips_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop

  la    $a0, bench_sample_prefix
  jal   tty_puts
  nop
  move  $a0, $s5
  jal   tty_put_uint
  nop
  la    $a0, bench_ms_middle
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   tty_put_uint
  nop
  la    $a0, bench_instructions_suffix
  jal   tty_puts
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

command_history:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s5, 8($sp)
  sw    $s6, 4($sp)
  sw    $s7, 0($sp)
  lw    $s5, history_count
  bne   $s5, $zero, command_history_list
  nop
  la    $a0, msg_history_empty
  jal   tty_puts
  nop
  b     command_history_done
  nop
command_history_list:
  li    $s6, HISTORY_SLOTS
  slt   $t0, $s5, $s6
  beq   $t0, $zero, command_history_walk
  nop
  move  $s6, $s5
command_history_walk:
  move  $s7, $s6
command_history_loop:
  blez  $s7, command_history_done
  nop
  subu  $t0, $s5, $s7
  addiu $a0, $t0, 1
  li    $a1, 4
  jal   tty_put_int_width
  nop
  la    $a0, history_separator
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   history_fetch
  nop
  beq   $v0, $zero, command_history_next
  nop
  move  $a0, $v0
  jal   tty_puts
  nop
command_history_next:
  jal   tty_crlf
  nop
  addiu $s7, $s7, -1
  b     command_history_loop
  nop
command_history_done:
  lw    $s7, 0($sp)
  lw    $s6, 4($sp)
  lw    $s5, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

command_color:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  move  $a0, $s2
  la    $a1, color_green_name
  jal   str_equal
  nop
  bne   $v0, $zero, color_green
  nop
  move  $a0, $s2
  la    $a1, color_cyan_name
  jal   str_equal
  nop
  bne   $v0, $zero, color_cyan
  nop
  move  $a0, $s2
  la    $a1, color_yellow_name
  jal   str_equal
  nop
  bne   $v0, $zero, color_yellow
  nop
  move  $a0, $s2
  la    $a1, color_white_name
  jal   str_equal
  nop
  bne   $v0, $zero, color_white
  nop
  move  $a0, $s2
  la    $a1, color_red_name
  jal   str_equal
  nop
  bne   $v0, $zero, color_red
  nop
  la    $a0, msg_color_usage
  jal   tty_puts
  nop
  b     command_color_done
  nop
color_green:
  la    $t0, ansi_green
  b     color_store
  nop
color_cyan:
  la    $t0, ansi_cyan
  b     color_store
  nop
color_yellow:
  la    $t0, ansi_yellow
  b     color_store
  nop
color_white:
  la    $t0, ansi_white
  b     color_store
  nop
color_red:
  la    $t0, ansi_red
color_store:
  sw    $t0, prompt_color
  la    $a0, msg_color_set
  jal   tty_puts
  nop
command_color_done:
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_ps:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, ps_text
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_pwd:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, pwd_text
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_reboot:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  sw    $zero, command_count
  sw    $zero, history_count
  jal   os_boot
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

command_shutdown:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, msg_shutdown
  jal   tty_puts
  nop
  la    $a0, esc_normal
  jal   tty_puts
  nop
  li    $v0, 10
  syscall

print_uptime:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s7, 0($sp)
  li    $v0, 30
  syscall
  lw    $t0, boot_time_low
  subu  $s7, $a0, $t0
  la    $a0, uptime_prefix
  jal   tty_puts
  nop
  move  $a0, $s7
  jal   tty_put_uint
  nop
  la    $a0, ms_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  lw    $s7, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop
