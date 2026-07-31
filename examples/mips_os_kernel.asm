# ============================================================
# MARS-OS 0.2 - shared TTY kernel
#
# This module is included by mips.asm. It expects the localized
# strings, command names, buffers and state words defined there.
#
# TTY MMIO:
#   0xffff0000 receiver control
#   0xffff0004 receiver data
#   0xffff0008 transmitter control
#   0xffff000c transmitter data
# ============================================================

.eqv LINE_CAP       128
.eqv HISTORY_SLOTS  8
.eqv HISTORY_SHIFT  7
.eqv CLOCK_CONTROL  0xffff0050
.eqv CLOCK_PERIOD   0xffff0058
.eqv CLOCK_COUNTER  0xffff005c
.eqv CLOCK_TIME_LOW 0xffff0060
.eqv CLOCK_TIME_HIGH 0xffff0064
.eqv CLOCK_UPTIME   0xffff0068

.text
.globl main

main:
  lui   $s0, 0xffff
  jal   os_boot
  nop

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
  la    $a0, ansi_normal
  jal   tty_puts
  nop

  la    $a0, line_buf
  li    $a1, LINE_CAP
  jal   tty_read_line
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

  move  $a0, $s1
  la    $a1, cmd_help
  jal   str_equal
  nop
  bne   $v0, $zero, command_help
  nop

  move  $a0, $s1
  la    $a1, cmd_about
  jal   str_equal
  nop
  bne   $v0, $zero, command_about
  nop

  move  $a0, $s1
  la    $a1, cmd_clear
  jal   str_equal
  nop
  bne   $v0, $zero, command_clear
  nop

  move  $a0, $s1
  la    $a1, cmd_echo
  jal   str_equal
  nop
  bne   $v0, $zero, command_echo
  nop

  move  $a0, $s1
  la    $a1, cmd_sysinfo
  jal   str_equal
  nop
  bne   $v0, $zero, command_sysinfo
  nop

  move  $a0, $s1
  la    $a1, cmd_mem
  jal   str_equal
  nop
  bne   $v0, $zero, command_mem
  nop

  move  $a0, $s1
  la    $a1, cmd_uptime
  jal   str_equal
  nop
  bne   $v0, $zero, command_uptime
  nop

  move  $a0, $s1
  la    $a1, cmd_clock
  jal   str_equal
  nop
  bne   $v0, $zero, command_clock
  nop

  move  $a0, $s1
  la    $a1, cmd_bench
  jal   str_equal
  nop
  bne   $v0, $zero, command_bench
  nop

  move  $a0, $s1
  la    $a1, cmd_calc
  jal   str_equal
  nop
  bne   $v0, $zero, command_calc
  nop

  move  $a0, $s1
  la    $a1, cmd_rand
  jal   str_equal
  nop
  bne   $v0, $zero, command_rand
  nop

  move  $a0, $s1
  la    $a1, cmd_sleep
  jal   str_equal
  nop
  bne   $v0, $zero, command_sleep
  nop

  move  $a0, $s1
  la    $a1, cmd_history
  jal   str_equal
  nop
  bne   $v0, $zero, command_history
  nop

  move  $a0, $s1
  la    $a1, cmd_ls
  jal   str_equal
  nop
  bne   $v0, $zero, command_ls
  nop

  move  $a0, $s1
  la    $a1, cmd_cat
  jal   str_equal
  nop
  bne   $v0, $zero, command_cat
  nop

  move  $a0, $s1
  la    $a1, cmd_color
  jal   str_equal
  nop
  bne   $v0, $zero, command_color
  nop

  move  $a0, $s1
  la    $a1, cmd_ps
  jal   str_equal
  nop
  bne   $v0, $zero, command_ps
  nop

  move  $a0, $s1
  la    $a1, cmd_pwd
  jal   str_equal
  nop
  bne   $v0, $zero, command_pwd
  nop

  move  $a0, $s1
  la    $a1, cmd_reboot
  jal   str_equal
  nop
  bne   $v0, $zero, command_reboot
  nop

  move  $a0, $s1
  la    $a1, cmd_shutdown
  jal   str_equal
  nop
  bne   $v0, $zero, command_shutdown
  nop

  la    $a0, ansi_red
  jal   tty_puts
  nop
  la    $a0, msg_unknown
  jal   tty_puts
  nop
  move  $a0, $s1
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  b     shell_loop
  nop

# ------------------------------------------------------------
# Boot and command handlers
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

  la    $a0, ansi_reset
  jal   tty_puts
  nop
  la    $a0, ansi_clear
  jal   tty_puts
  nop
  la    $a0, ansi_bold_cyan
  jal   tty_puts
  nop
  la    $a0, banner
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  la    $a0, msg_boot
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  la    $a0, ansi_dim
  jal   tty_puts
  nop
  la    $a0, msg_hint
  jal   tty_puts
  nop
  la    $a0, ansi_normal
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

command_help:
  la    $a0, help_text
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_about:
  la    $a0, about_text
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_clear:
  la    $a0, ansi_clear
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_echo:
  move  $a0, $s2
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  b     shell_loop
  nop

command_sysinfo:
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
  jal   print_uptime
  nop
  b     shell_loop
  nop

command_mem:
  move  $s3, $sp
  li    $v0, 9
  move  $a0, $zero
  syscall
  move  $s4, $v0

  la    $a0, mem_heap
  jal   tty_puts
  nop
  move  $a0, $s4
  jal   tty_put_hex32
  nop
  jal   tty_crlf
  nop

  la    $a0, mem_stack
  jal   tty_puts
  nop
  move  $a0, $s3
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
  b     shell_loop
  nop

command_uptime:
  jal   print_uptime
  nop
  b     shell_loop
  nop

command_clock:
  # Syscall 30 is the authoritative host clock.  The command therefore works
  # even when the optional System Clock tool has not been opened or connected.
  li    $v0, 30
  syscall
  move  $s3, $a0
  move  $s4, $a1

  la    $a0, clock_time_prefix
  jal   tty_puts
  nop
  move  $a0, $s4
  jal   tty_put_hex32
  nop
  la    $a0, clock_separator
  jal   tty_puts
  nop
  move  $a0, $s3
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
  b     shell_loop
  nop

command_bench:
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
  divu  $s6, $s5
  mflo  $s7
  li    $t0, 1000
  multu $s7, $t0
  mflo  $s7

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
  b     shell_loop
  nop

command_calc:
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
  b     shell_loop
  nop

calc_zero:
  la    $a0, msg_div_zero
  jal   tty_puts
  nop
  b     shell_loop
  nop

calc_usage:
  la    $a0, msg_calc_usage
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_rand:
  move  $a0, $s2
  jal   parse_number
  nop
  beq   $a2, $zero, rand_usage
  nop
  blez  $v0, rand_usage
  nop
  li    $t0, 1000001
  slt   $t1, $v0, $t0
  beq   $t1, $zero, rand_usage
  nop
  move  $a1, $v0
  move  $a0, $zero
  li    $v0, 42
  syscall
  move  $s3, $a0
  la    $a0, result_prefix
  jal   tty_puts
  nop
  move  $a0, $s3
  jal   tty_put_uint
  nop
  jal   tty_crlf
  nop
  b     shell_loop
  nop
rand_usage:
  la    $a0, msg_rand_usage
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_sleep:
  move  $a0, $s2
  jal   parse_number
  nop
  beq   $a2, $zero, sleep_usage
  nop
  bltz  $v0, sleep_usage
  nop
  li    $t0, 10001
  slt   $t1, $v0, $t0
  beq   $t1, $zero, sleep_usage
  nop
  move  $a0, $v0
  li    $v0, 32
  syscall
  la    $a0, msg_awake
  jal   tty_puts
  nop
  b     shell_loop
  nop
sleep_usage:
  la    $a0, msg_sleep_usage
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_history:
  jal   history_print
  nop
  b     shell_loop
  nop

command_ls:
  la    $a0, ls_text
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_cat:
  move  $a0, $s2
  la    $a1, file_readme_name
  jal   str_equal
  nop
  bne   $v0, $zero, cat_readme
  nop
  move  $a0, $s2
  la    $a1, file_motd_name
  jal   str_equal
  nop
  bne   $v0, $zero, cat_motd
  nop
  move  $a0, $s2
  la    $a1, file_commands_name
  jal   str_equal
  nop
  bne   $v0, $zero, cat_commands
  nop
  la    $a0, msg_file_missing
  jal   tty_puts
  nop
  b     shell_loop
  nop
cat_readme:
  la    $a0, file_readme_text
  jal   tty_puts
  nop
  b     shell_loop
  nop
cat_motd:
  la    $a0, file_motd_text
  jal   tty_puts
  nop
  b     shell_loop
  nop
cat_commands:
  la    $a0, help_text
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_color:
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
  b     shell_loop
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
  b     shell_loop
  nop

command_ps:
  la    $a0, ps_text
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_pwd:
  la    $a0, pwd_text
  jal   tty_puts
  nop
  b     shell_loop
  nop

command_reboot:
  sw    $zero, command_count
  sw    $zero, history_count
  jal   os_boot
  nop
  b     shell_loop
  nop

command_shutdown:
  la    $a0, msg_shutdown
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  li    $v0, 10
  syscall

# ------------------------------------------------------------
# Clock, history and parsing services
# ------------------------------------------------------------

print_uptime:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)
  sw    $s1, 0($sp)
  li    $v0, 30
  syscall
  lw    $t0, boot_time_low
  subu  $s1, $a0, $t0
  la    $a0, uptime_prefix
  jal   tty_puts
  nop
  move  $a0, $s1
  jal   tty_put_uint
  nop
  la    $a0, ms_suffix
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  lw    $s1, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

history_add:
  move  $t9, $a0
  lw    $t0, history_count
  andi  $t1, $t0, 7
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
  jr    $ra
  nop

history_print:
  addiu $sp, $sp, -28
  sw    $ra, 24($sp)
  sw    $s1, 20($sp)
  sw    $s2, 16($sp)
  sw    $s3, 12($sp)
  sw    $s4, 8($sp)
  sw    $s5, 4($sp)
  sw    $s6, 0($sp)

  lw    $s1, history_count
  bne   $s1, $zero, history_nonempty
  nop
  la    $a0, msg_history_empty
  jal   tty_puts
  nop
  b     history_print_done
  nop

history_nonempty:
  li    $s2, HISTORY_SLOTS
  slt   $t0, $s1, $s2
  beq   $t0, $zero, history_full
  nop
  move  $s2, $s1
  move  $s3, $zero
  b     history_setup
  nop
history_full:
  andi  $s3, $s1, 7
history_setup:
  subu  $s4, $s1, $s2
  addiu $s4, $s4, 1
  move  $s5, $zero
history_print_loop:
  beq   $s5, $s2, history_print_done
  nop
  addu  $s6, $s3, $s5
  andi  $s6, $s6, 7
  sll   $t0, $s6, HISTORY_SHIFT
  la    $t1, history_buf
  addu  $s6, $t1, $t0

  move  $a0, $s4
  jal   tty_put_uint
  nop
  la    $a0, history_separator
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   tty_puts
  nop
  jal   tty_crlf
  nop
  addiu $s4, $s4, 1
  addiu $s5, $s5, 1
  b     history_print_loop
  nop

history_print_done:
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

skip_spaces:
  move  $t0, $a0
skip_spaces_loop:
  lbu   $t1, 0($t0)
  li    $t2, ' '
  bne   $t1, $t2, skip_spaces_done
  nop
  addiu $t0, $t0, 1
  b     skip_spaces_loop
  nop
skip_spaces_done:
  move  $v0, $t0
  jr    $ra
  nop

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

# a0 = input pointer
# v0 = signed value, v1 = first unparsed byte, a2 = success
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
  bne   $t1, $t2, parse_number_digits
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

# ------------------------------------------------------------
# Cooperative TTY driver and numeric formatting
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

# a0 = buffer, a1 = capacity, v0 = length
tty_read_line:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $s1, 16($sp)
  sw    $s2, 12($sp)
  sw    $s3, 8($sp)
  sw    $s4, 4($sp)
  sw    $s5, 0($sp)
  move  $s1, $a0
  move  $s2, $a1
  move  $s3, $zero
tty_read_line_loop:
  jal   tty_getc
  nop
  andi  $s4, $v0, 0xff
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
  li    $t0, 32
  slt   $t1, $s4, $t0
  bne   $t1, $zero, tty_read_line_loop
  nop
  addiu $t0, $s2, -1
  slt   $t1, $s3, $t0
  beq   $t1, $zero, tty_read_line_loop
  nop
  addu  $t2, $s1, $s3
  sb    $s4, 0($t2)
  addiu $s3, $s3, 1
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
  li    $a0, 8
  jal   tty_putc
  nop
  li    $a0, ' '
  jal   tty_putc
  nop
  li    $a0, 8
  jal   tty_putc
  nop
  b     tty_read_line_loop
  nop

tty_read_line_term:
  beq   $s3, $zero, tty_read_line_loop
  nop
  addu  $t0, $s1, $s3
  sb    $zero, 0($t0)
  jal   tty_crlf
  nop
  move  $v0, $s3
  lw    $s5, 0($sp)
  lw    $s4, 4($sp)
  lw    $s3, 8($sp)
  lw    $s2, 12($sp)
  lw    $s1, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

tty_put_uint:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s1, 12($sp)
  sw    $s2, 8($sp)
  sw    $s3, 4($sp)
  sw    $s4, 0($sp)
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
  lw    $s4, 0($sp)
  lw    $s3, 4($sp)
  lw    $s2, 8($sp)
  lw    $s1, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
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
