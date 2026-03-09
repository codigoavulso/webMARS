# Digital Lab Sim test
# Tool mapping (with default MMIO base 0xFFFF0000):
#   display right digit: 0xFFFF0010
#   display left digit : 0xFFFF0011
#   keyboard ctrl      : 0xFFFF0012
#   keyboard out code  : 0xFFFF0014
#
# Click keys in the Digital Lab Sim keypad.
# Program decodes scan code and displays the pressed key value (0..f).

.data
msg0:   .asciiz "\n=== Digital Lab Sim demo ===\n"
msg1:   .asciiz "Open Tools > Digital Lab Sim and click keypad buttons.\n"
msg2:   .asciiz "Displaying pressed key value (0..f) on 7-segment.\n"
segmap: .byte 0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f,0x77,0x7c,0x39,0x5e,0x79,0x71

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $t0, 0xffff
  li $t1, 0x0f
  sb $t1, 0x12($t0)      # scan all rows

  sb $zero, 0x11($t0)    # left digit blank

wait_key:
  lbu $t2, 0x14($t0)     # keyboard scan code (col<<4 | row)
  beq $t2, $zero, wait_key

  # row bit (low nibble) and column bit (high nibble)
  andi $t3, $t2, 0x0f    # rowBit: 1,2,4,8
  srl  $t4, $t2, 4       # colBit: 1,2,4,8

  # row index = log2(rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  # col index = log2(colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  # key nibble = row*4 + col  (values 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      # show pressed key on right digit

  j wait_key

# a0: nibble 0..15
# v0: seven-segment pattern
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra