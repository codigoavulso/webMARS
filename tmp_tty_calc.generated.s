# Mini-C C0 phase 5 generated MIPS
# source: tty_calculator.c
# subset: S4
# abi: o32
.text
.globl main

main:
  addiu $sp, $sp, -312
  sw $fp, 304($sp)
  sw $ra, 308($sp)
  move $fp, $sp
  sw $zero, 0($fp)
  sw $zero, 4($fp)
  sw $zero, 8($fp)
  sw $zero, 12($fp)
  sw $zero, 16($fp)
  sw $zero, 20($fp)
  sw $zero, 24($fp)
  sw $zero, 28($fp)
  sw $zero, 32($fp)
  sw $zero, 36($fp)
  sw $zero, 40($fp)
  sw $zero, 44($fp)
  sw $zero, 48($fp)
  sw $zero, 52($fp)
  sw $zero, 56($fp)
  sw $zero, 60($fp)
  sw $zero, 64($fp)
  sw $zero, 68($fp)
  sw $zero, 72($fp)
  sw $zero, 76($fp)
  sw $zero, 80($fp)
  sw $zero, 84($fp)
  sw $zero, 88($fp)
  sw $zero, 92($fp)
  sw $zero, 96($fp)
  sw $zero, 100($fp)
  sw $zero, 104($fp)
  sw $zero, 108($fp)
  sw $zero, 112($fp)
  sw $zero, 116($fp)
  sw $zero, 120($fp)
  sw $zero, 124($fp)
  sw $zero, 128($fp)
  sw $zero, 132($fp)
  sw $zero, 136($fp)
  sw $zero, 140($fp)
  sw $zero, 144($fp)
  sw $zero, 148($fp)
  sw $zero, 152($fp)
  sw $zero, 156($fp)
  sw $zero, 160($fp)
  sw $zero, 164($fp)
  sw $zero, 168($fp)
  sw $zero, 172($fp)
  sw $zero, 176($fp)
  sw $zero, 180($fp)
  sw $zero, 184($fp)
  sw $zero, 188($fp)
  sw $zero, 192($fp)
  sw $zero, 196($fp)
  sw $zero, 200($fp)
  sw $zero, 204($fp)
  sw $zero, 208($fp)
  sw $zero, 212($fp)
  sw $zero, 216($fp)
  sw $zero, 220($fp)
  sw $zero, 224($fp)
  sw $zero, 228($fp)
  sw $zero, 232($fp)
  sw $zero, 236($fp)
  sw $zero, 240($fp)
  sw $zero, 244($fp)
  sw $zero, 248($fp)
  sw $zero, 252($fp)
  li $t0, 0
  sw $t0, 0($fp)
  sw $zero, 256($fp)
  li $t0, 0
  sw $t0, 256($fp)
  sw $zero, 260($fp)
  li $t0, 0
  sw $t0, 260($fp)
  sw $zero, 264($fp)
  li $t0, 0
  sw $t0, 264($fp)
  la $t0, __str_0
  sw $t0, 272($fp)
  lw $a0, 272($fp)
  jal tty_puts
  nop
  move $t0, $v0
  jal tty_newline
  nop
  move $t0, $v0
  la $t0, __str_1
  sw $t0, 272($fp)
  lw $a0, 272($fp)
  jal tty_puts
  nop
  move $t0, $v0
  jal tty_newline
  nop
  move $t0, $v0
  jal tty_newline
  nop
  move $t0, $v0
while_start_0:
  li $t0, 1
  beq $t0, $zero, while_end_1
  nop
  la $t0, __str_2
  sw $t0, 272($fp)
  lw $a0, 272($fp)
  jal tty_puts
  nop
  move $t0, $v0
  addiu $t0, $fp, 0
  li $t1, 64
  sw $t0, 272($fp)
  sw $t1, 276($fp)
  li $t0, 64
  sw $t0, 280($fp)
  lw $a0, 272($fp)
  lw $a1, 276($fp)
  lw $a2, 280($fp)
  jal read_line
  nop
  move $t0, $v0
  sw $t0, 268($fp)
  lw $t0, 268($fp)
  sw $t0, 272($fp)
  li $t0, 1
  lw $t1, 272($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, and_false_5
  nop
  addiu $t0, $fp, 0
  li $t2, 0
  slt $t4, $t2, $zero
  beq $t4, $zero, idx_ok_7
  nop
  li $v0, 10
  syscall
idx_ok_7:
  li $t3, 64
  slt $t4, $t2, $t3
  bne $t4, $zero, idx_upper_ok_8
  nop
  li $v0, 10
  syscall
idx_upper_ok_8:
  sll $t2, $t2, 2
  addu $t0, $t0, $t2
  lw $t2, 0($t0)
  sw $t2, 272($fp)
  li $t0, 113
  lw $t2, 272($fp)
  xor $t2, $t2, $t0
  sltiu $t2, $t2, 1
  bne $t2, $zero, or_true_9
  nop
  addiu $t0, $fp, 0
  li $t3, 0
  slt $t5, $t3, $zero
  beq $t5, $zero, idx_ok_12
  nop
  li $v0, 10
  syscall
idx_ok_12:
  li $t4, 64
  slt $t5, $t3, $t4
  bne $t5, $zero, idx_upper_ok_13
  nop
  li $v0, 10
  syscall
idx_upper_ok_13:
  sll $t3, $t3, 2
  addu $t0, $t0, $t3
  lw $t3, 0($t0)
  sw $t3, 272($fp)
  li $t0, 81
  lw $t3, 272($fp)
  xor $t3, $t3, $t0
  sltiu $t3, $t3, 1
  bne $t3, $zero, or_true_9
  nop
  move $t2, $zero
  b or_end_11
  nop
or_true_9:
  li $t2, 1
or_end_11:
  beq $t2, $zero, and_false_5
  nop
and_true_4:
  li $t1, 1
  b and_end_6
  nop
and_false_5:
  move $t1, $zero
and_end_6:
  beq $t1, $zero, if_else_2
  nop
  la $t0, __str_3
  sw $t0, 272($fp)
  lw $a0, 272($fp)
  jal tty_puts
  nop
  move $t0, $v0
  jal tty_newline
  nop
  move $t0, $v0
  li $t0, 0
  move $v0, $t0
  b __ret_main
  nop
  b if_end_3
  nop
if_else_2:
if_end_3:
  addiu $t0, $fp, 0
  li $t1, 64
  sw $t0, 272($fp)
  sw $t1, 276($fp)
  addiu $t0, $fp, 256
  li $t1, 1
  sw $t0, 280($fp)
  sw $t1, 284($fp)
  addiu $t0, $fp, 260
  li $t1, 1
  sw $t0, 288($fp)
  sw $t1, 292($fp)
  addiu $t0, $fp, 264
  li $t1, 1
  sw $t0, 296($fp)
  sw $t1, 300($fp)
  lw $a0, 272($fp)
  lw $a1, 276($fp)
  lw $a2, 280($fp)
  lw $a3, 284($fp)
  addiu $sp, $sp, -16
  lw $t0, 288($fp)
  sw $t0, 0($sp)
  lw $t0, 292($fp)
  sw $t0, 4($sp)
  lw $t0, 296($fp)
  sw $t0, 8($sp)
  lw $t0, 300($fp)
  sw $t0, 12($sp)
  jal parse_expression
  nop
  addiu $sp, $sp, 16
  move $t0, $v0
  sltu $t0, $zero, $t0
  xori $t0, $t0, 1
  beq $t0, $zero, if_else_14
  nop
  la $t0, __str_4
  sw $t0, 272($fp)
  lw $a0, 272($fp)
  jal tty_puts
  nop
  move $t0, $v0
  jal tty_newline
  nop
  move $t0, $v0
  b while_start_0
  nop
  b if_end_15
  nop
if_else_14:
if_end_15:
  addiu $t0, $fp, 260
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_18
  nop
  li $v0, 10
  syscall
idx_ok_18:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_19
  nop
  li $v0, 10
  syscall
idx_upper_ok_19:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 272($fp)
  li $t0, 47
  lw $t1, 272($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, and_false_21
  nop
  addiu $t0, $fp, 264
  li $t2, 0
  slt $t4, $t2, $zero
  beq $t4, $zero, idx_ok_23
  nop
  li $v0, 10
  syscall
idx_ok_23:
  li $t3, 1
  slt $t4, $t2, $t3
  bne $t4, $zero, idx_upper_ok_24
  nop
  li $v0, 10
  syscall
idx_upper_ok_24:
  sll $t2, $t2, 2
  addu $t0, $t0, $t2
  lw $t2, 0($t0)
  sw $t2, 272($fp)
  li $t0, 0
  lw $t2, 272($fp)
  xor $t2, $t2, $t0
  sltiu $t2, $t2, 1
  beq $t2, $zero, and_false_21
  nop
and_true_20:
  li $t1, 1
  b and_end_22
  nop
and_false_21:
  move $t1, $zero
and_end_22:
  beq $t1, $zero, if_else_16
  nop
  la $t0, __str_5
  sw $t0, 272($fp)
  lw $a0, 272($fp)
  jal tty_puts
  nop
  move $t0, $v0
  jal tty_newline
  nop
  move $t0, $v0
  b while_start_0
  nop
  b if_end_17
  nop
if_else_16:
if_end_17:
  addiu $t0, $fp, 260
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_27
  nop
  li $v0, 10
  syscall
idx_ok_27:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_28
  nop
  li $v0, 10
  syscall
idx_upper_ok_28:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 272($fp)
  li $t0, 43
  lw $t1, 272($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, if_else_25
  nop
  addiu $t0, $fp, 256
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_29
  nop
  li $v0, 10
  syscall
idx_ok_29:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_30
  nop
  li $v0, 10
  syscall
idx_upper_ok_30:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 272($fp)
  addiu $t0, $fp, 260
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_31
  nop
  li $v0, 10
  syscall
idx_ok_31:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_32
  nop
  li $v0, 10
  syscall
idx_upper_ok_32:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 276($fp)
  addiu $t0, $fp, 264
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_33
  nop
  li $v0, 10
  syscall
idx_ok_33:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_34
  nop
  li $v0, 10
  syscall
idx_upper_ok_34:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 280($fp)
  addiu $t0, $fp, 256
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_35
  nop
  li $v0, 10
  syscall
idx_ok_35:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_36
  nop
  li $v0, 10
  syscall
idx_upper_ok_36:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 284($fp)
  addiu $t0, $fp, 264
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_37
  nop
  li $v0, 10
  syscall
idx_ok_37:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_38
  nop
  li $v0, 10
  syscall
idx_upper_ok_38:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  lw $t0, 284($fp)
  addu $t0, $t0, $t1
  sw $t0, 284($fp)
  lw $a0, 272($fp)
  lw $a1, 276($fp)
  lw $a2, 280($fp)
  lw $a3, 284($fp)
  jal print_expression_result
  nop
  move $t0, $v0
  b if_end_26
  nop
if_else_25:
  addiu $t0, $fp, 260
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_41
  nop
  li $v0, 10
  syscall
idx_ok_41:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_42
  nop
  li $v0, 10
  syscall
idx_upper_ok_42:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 272($fp)
  li $t0, 45
  lw $t1, 272($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, if_else_39
  nop
  addiu $t0, $fp, 256
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_43
  nop
  li $v0, 10
  syscall
idx_ok_43:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_44
  nop
  li $v0, 10
  syscall
idx_upper_ok_44:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 272($fp)
  addiu $t0, $fp, 260
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_45
  nop
  li $v0, 10
  syscall
idx_ok_45:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_46
  nop
  li $v0, 10
  syscall
idx_upper_ok_46:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 276($fp)
  addiu $t0, $fp, 264
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_47
  nop
  li $v0, 10
  syscall
idx_ok_47:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_48
  nop
  li $v0, 10
  syscall
idx_upper_ok_48:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 280($fp)
  addiu $t0, $fp, 256
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_49
  nop
  li $v0, 10
  syscall
idx_ok_49:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_50
  nop
  li $v0, 10
  syscall
idx_upper_ok_50:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 284($fp)
  addiu $t0, $fp, 264
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_51
  nop
  li $v0, 10
  syscall
idx_ok_51:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_52
  nop
  li $v0, 10
  syscall
idx_upper_ok_52:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  lw $t0, 284($fp)
  subu $t0, $t0, $t1
  sw $t0, 284($fp)
  lw $a0, 272($fp)
  lw $a1, 276($fp)
  lw $a2, 280($fp)
  lw $a3, 284($fp)
  jal print_expression_result
  nop
  move $t0, $v0
  b if_end_40
  nop
if_else_39:
  addiu $t0, $fp, 260
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_55
  nop
  li $v0, 10
  syscall
idx_ok_55:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_56
  nop
  li $v0, 10
  syscall
idx_upper_ok_56:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 272($fp)
  li $t0, 42
  lw $t1, 272($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, if_else_53
  nop
  addiu $t0, $fp, 256
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_57
  nop
  li $v0, 10
  syscall
idx_ok_57:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_58
  nop
  li $v0, 10
  syscall
idx_upper_ok_58:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 272($fp)
  addiu $t0, $fp, 260
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_59
  nop
  li $v0, 10
  syscall
idx_ok_59:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_60
  nop
  li $v0, 10
  syscall
idx_upper_ok_60:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 276($fp)
  addiu $t0, $fp, 264
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_61
  nop
  li $v0, 10
  syscall
idx_ok_61:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_62
  nop
  li $v0, 10
  syscall
idx_upper_ok_62:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 280($fp)
  addiu $t0, $fp, 256
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_63
  nop
  li $v0, 10
  syscall
idx_ok_63:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_64
  nop
  li $v0, 10
  syscall
idx_upper_ok_64:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 284($fp)
  addiu $t0, $fp, 264
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_65
  nop
  li $v0, 10
  syscall
idx_ok_65:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_66
  nop
  li $v0, 10
  syscall
idx_upper_ok_66:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  lw $t0, 284($fp)
  mul $t0, $t0, $t1
  sw $t0, 284($fp)
  lw $a0, 272($fp)
  lw $a1, 276($fp)
  lw $a2, 280($fp)
  lw $a3, 284($fp)
  jal print_expression_result
  nop
  move $t0, $v0
  b if_end_54
  nop
if_else_53:
  addiu $t0, $fp, 256
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_67
  nop
  li $v0, 10
  syscall
idx_ok_67:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_68
  nop
  li $v0, 10
  syscall
idx_upper_ok_68:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 272($fp)
  addiu $t0, $fp, 260
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_69
  nop
  li $v0, 10
  syscall
idx_ok_69:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_70
  nop
  li $v0, 10
  syscall
idx_upper_ok_70:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 276($fp)
  addiu $t0, $fp, 264
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_71
  nop
  li $v0, 10
  syscall
idx_ok_71:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_72
  nop
  li $v0, 10
  syscall
idx_upper_ok_72:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 280($fp)
  addiu $t0, $fp, 256
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_73
  nop
  li $v0, 10
  syscall
idx_ok_73:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_74
  nop
  li $v0, 10
  syscall
idx_upper_ok_74:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 284($fp)
  addiu $t0, $fp, 264
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_75
  nop
  li $v0, 10
  syscall
idx_ok_75:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_76
  nop
  li $v0, 10
  syscall
idx_upper_ok_76:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  lw $t0, 284($fp)
  bne $t1, $zero, div_safe_77
  nop
  break 7
div_safe_77:
  li $t8, -1
  bne $t1, $t8, div_overflow_safe_78
  nop
  li $t8, -2147483648
  bne $t0, $t8, div_overflow_safe_78
  nop
  break 6
div_overflow_safe_78:
  div $t0, $t1
  mflo $t0
  sw $t0, 284($fp)
  lw $a0, 272($fp)
  lw $a1, 276($fp)
  lw $a2, 280($fp)
  lw $a3, 284($fp)
  jal print_expression_result
  nop
  move $t0, $v0
if_end_54:
if_end_40:
if_end_26:
  b while_start_0
  nop
while_end_1:
  li $t0, 0
  move $v0, $t0
  b __ret_main
  nop
  b __ret_main
  nop
__ret_main:
  li $v0, 10
  syscall

char_chr:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  li $t0, 0
  sw $t0, 4($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  slt $t1, $t0, $t1
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_80
  nop
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 127
  lw $t2, 4($fp)
  slt $t2, $t0, $t2
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_80
  nop
and_true_79:
  li $t1, 1
  b and_end_81
  nop
and_false_80:
  move $t1, $zero
and_end_81:
  bne $t1, $zero, require_ok_82
  nop
  li $v0, 10
  syscall
require_ok_82:
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  li $v0, 85
  syscall
  move $t0, $v0
  move $v0, $t0
  b __ret_char_chr
  nop
  b __ret_char_chr
  nop
__ret_char_chr:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

char_ord:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  move $v0, $t0
  b __ret_char_ord
  nop
  move $v0, $zero
  b __ret_char_ord
  nop
__ret_char_ord:
  sw $v0, 4($fp)
  li $t0, 0
  sw $t0, 8($fp)
  lw $t0, 4($fp)
  lw $t1, 8($fp)
  slt $t1, $t0, $t1
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_84
  nop
  lw $t0, 4($fp)
  sw $t0, 8($fp)
  li $t0, 127
  lw $t2, 8($fp)
  slt $t2, $t0, $t2
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_84
  nop
and_true_83:
  li $t1, 1
  b and_end_85
  nop
and_false_84:
  move $t1, $zero
and_end_85:
  bne $t1, $zero, ensure_ok_86
  nop
  li $v0, 10
  syscall
ensure_ok_86:
  lw $v0, 4($fp)
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

is_digit:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 48
  lw $t1, 4($fp)
  slt $t1, $t1, $t0
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_88
  nop
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 57
  lw $t2, 4($fp)
  slt $t2, $t0, $t2
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_88
  nop
and_true_87:
  li $t1, 1
  b and_end_89
  nop
and_false_88:
  move $t1, $zero
and_end_89:
  move $v0, $t1
  b __ret_is_digit
  nop
  b __ret_is_digit
  nop
__ret_is_digit:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

is_space:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 32
  lw $t1, 4($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  bne $t1, $zero, or_true_90
  nop
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 9
  lw $t2, 4($fp)
  xor $t2, $t2, $t0
  sltiu $t2, $t2, 1
  bne $t2, $zero, or_true_90
  nop
  move $t1, $zero
  b or_end_92
  nop
or_true_90:
  li $t1, 1
or_end_92:
  move $v0, $t1
  b __ret_is_space
  nop
  b __ret_is_space
  nop
__ret_is_space:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

is_supported_op:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 43
  lw $t1, 4($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  bne $t1, $zero, or_true_93
  nop
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 45
  lw $t2, 4($fp)
  xor $t2, $t2, $t0
  sltiu $t2, $t2, 1
  bne $t2, $zero, or_true_93
  nop
  move $t1, $zero
  b or_end_95
  nop
or_true_93:
  li $t1, 1
or_end_95:
  bne $t1, $zero, or_true_96
  nop
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 42
  lw $t2, 4($fp)
  xor $t2, $t2, $t0
  sltiu $t2, $t2, 1
  bne $t2, $zero, or_true_96
  nop
  move $t1, $zero
  b or_end_98
  nop
or_true_96:
  li $t1, 1
or_end_98:
  bne $t1, $zero, or_true_99
  nop
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 47
  lw $t2, 4($fp)
  xor $t2, $t2, $t0
  sltiu $t2, $t2, 1
  bne $t2, $zero, or_true_99
  nop
  move $t1, $zero
  b or_end_101
  nop
or_true_99:
  li $t1, 1
or_end_101:
  move $v0, $t1
  b __ret_is_supported_op
  nop
  b __ret_is_supported_op
  nop
__ret_is_supported_op:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

parse_expression:
  addiu $sp, $sp, -80
  sw $fp, 72($sp)
  sw $ra, 76($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  sw $a2, 8($fp)
  sw $a3, 12($fp)
  lw $t0, 80($sp)
  sw $t0, 16($fp)
  lw $t0, 84($sp)
  sw $t0, 20($fp)
  lw $t0, 88($sp)
  sw $t0, 24($fp)
  lw $t0, 92($sp)
  sw $t0, 28($fp)
  sw $zero, 32($fp)
  li $t0, 0
  sw $t0, 32($fp)
  li $t0, 0
  sw $t0, 36($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  sw $t0, 40($fp)
  sw $t1, 44($fp)
  lw $t0, 36($fp)
  sw $t0, 48($fp)
  lw $t0, 8($fp)
  lw $t1, 12($fp)
  sw $t0, 52($fp)
  sw $t1, 56($fp)
  addiu $t0, $fp, 32
  li $t1, 1
  sw $t0, 60($fp)
  sw $t1, 64($fp)
  lw $a0, 40($fp)
  lw $a1, 44($fp)
  lw $a2, 48($fp)
  lw $a3, 52($fp)
  addiu $sp, $sp, -12
  lw $t0, 56($fp)
  sw $t0, 0($sp)
  lw $t0, 60($fp)
  sw $t0, 4($sp)
  lw $t0, 64($fp)
  sw $t0, 8($sp)
  jal parse_int_at
  nop
  addiu $sp, $sp, 12
  move $t0, $v0
  sltu $t0, $zero, $t0
  xori $t0, $t0, 1
  beq $t0, $zero, if_else_102
  nop
  li $t0, 0
  move $v0, $t0
  b __ret_parse_expression
  nop
  b if_end_103
  nop
if_else_102:
if_end_103:
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  sw $t0, 40($fp)
  sw $t1, 44($fp)
  addiu $t0, $fp, 32
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_104
  nop
  li $v0, 10
  syscall
idx_ok_104:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_105
  nop
  li $v0, 10
  syscall
idx_upper_ok_105:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 48($fp)
  lw $a0, 40($fp)
  lw $a1, 44($fp)
  lw $a2, 48($fp)
  jal skip_spaces
  nop
  move $t0, $v0
  sw $t0, 36($fp)
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_108
  nop
  li $v0, 10
  syscall
idx_ptr_ok_108:
  lw $t1, 36($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_109
  nop
  li $v0, 10
  syscall
idx_ok_109:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_110
  nop
  li $v0, 10
  syscall
idx_upper_ok_110:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 40($fp)
  lw $a0, 40($fp)
  jal is_supported_op
  nop
  move $t0, $v0
  sltu $t0, $zero, $t0
  xori $t0, $t0, 1
  beq $t0, $zero, if_else_106
  nop
  li $t0, 0
  move $v0, $t0
  b __ret_parse_expression
  nop
  b if_end_107
  nop
if_else_106:
if_end_107:
  lw $t0, 16($fp)
  bne $t0, $zero, idx_ptr_ok_111
  nop
  li $v0, 10
  syscall
idx_ptr_ok_111:
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_112
  nop
  li $v0, 10
  syscall
idx_ok_112:
  lw $t2, 20($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_113
  nop
  li $v0, 10
  syscall
idx_upper_ok_113:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  sw $t0, 40($fp)
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_114
  nop
  li $v0, 10
  syscall
idx_ptr_ok_114:
  lw $t1, 36($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_115
  nop
  li $v0, 10
  syscall
idx_ok_115:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_116
  nop
  li $v0, 10
  syscall
idx_upper_ok_116:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  lw $t0, 40($fp)
  sw $t1, 0($t0)
  lw $t1, 36($fp)
  move $t0, $t1
  addiu $t1, $t1, 1
  sw $t1, 36($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  sw $t0, 40($fp)
  sw $t1, 44($fp)
  lw $t0, 36($fp)
  sw $t0, 48($fp)
  lw $t0, 24($fp)
  lw $t1, 28($fp)
  sw $t0, 52($fp)
  sw $t1, 56($fp)
  addiu $t0, $fp, 32
  li $t1, 1
  sw $t0, 60($fp)
  sw $t1, 64($fp)
  lw $a0, 40($fp)
  lw $a1, 44($fp)
  lw $a2, 48($fp)
  lw $a3, 52($fp)
  addiu $sp, $sp, -12
  lw $t0, 56($fp)
  sw $t0, 0($sp)
  lw $t0, 60($fp)
  sw $t0, 4($sp)
  lw $t0, 64($fp)
  sw $t0, 8($sp)
  jal parse_int_at
  nop
  addiu $sp, $sp, 12
  move $t0, $v0
  sltu $t0, $zero, $t0
  xori $t0, $t0, 1
  beq $t0, $zero, if_else_117
  nop
  li $t0, 0
  move $v0, $t0
  b __ret_parse_expression
  nop
  b if_end_118
  nop
if_else_117:
if_end_118:
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  sw $t0, 40($fp)
  sw $t1, 44($fp)
  addiu $t0, $fp, 32
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_119
  nop
  li $v0, 10
  syscall
idx_ok_119:
  li $t2, 1
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_120
  nop
  li $v0, 10
  syscall
idx_upper_ok_120:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 48($fp)
  lw $a0, 40($fp)
  lw $a1, 44($fp)
  lw $a2, 48($fp)
  jal skip_spaces
  nop
  move $t0, $v0
  sw $t0, 36($fp)
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_121
  nop
  li $v0, 10
  syscall
idx_ptr_ok_121:
  lw $t1, 36($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_122
  nop
  li $v0, 10
  syscall
idx_ok_122:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_123
  nop
  li $v0, 10
  syscall
idx_upper_ok_123:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 40($fp)
  li $t0, 0
  lw $t1, 40($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  move $v0, $t1
  b __ret_parse_expression
  nop
  b __ret_parse_expression
  nop
__ret_parse_expression:
  move $sp, $fp
  lw $fp, 72($sp)
  lw $ra, 76($sp)
  addiu $sp, $sp, 80
  jr $ra
  nop

parse_int_at:
  addiu $sp, $sp, -88
  sw $fp, 76($sp)
  sw $ra, 80($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  sw $a2, 8($fp)
  sw $a3, 12($fp)
  lw $t0, 88($sp)
  sw $t0, 16($fp)
  lw $t0, 92($sp)
  sw $t0, 20($fp)
  lw $t0, 96($sp)
  sw $t0, 24($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  sw $t0, 44($fp)
  sw $t1, 48($fp)
  lw $t0, 8($fp)
  sw $t0, 52($fp)
  lw $a0, 44($fp)
  lw $a1, 48($fp)
  lw $a2, 52($fp)
  jal skip_spaces
  nop
  move $t0, $v0
  sw $t0, 28($fp)
  li $t0, 1
  sw $t0, 32($fp)
  li $t0, 0
  sw $t0, 36($fp)
  li $t0, 0
  sw $t0, 40($fp)
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_126
  nop
  li $v0, 10
  syscall
idx_ptr_ok_126:
  lw $t1, 28($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_127
  nop
  li $v0, 10
  syscall
idx_ok_127:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_128
  nop
  li $v0, 10
  syscall
idx_upper_ok_128:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 44($fp)
  li $t0, 45
  lw $t1, 44($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, if_else_124
  nop
  li $t0, 1
  subu $t0, $zero, $t0
  sw $t0, 32($fp)
  lw $t1, 28($fp)
  move $t0, $t1
  addiu $t1, $t1, 1
  sw $t1, 28($fp)
  b if_end_125
  nop
if_else_124:
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_131
  nop
  li $v0, 10
  syscall
idx_ptr_ok_131:
  lw $t1, 28($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_132
  nop
  li $v0, 10
  syscall
idx_ok_132:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_133
  nop
  li $v0, 10
  syscall
idx_upper_ok_133:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 44($fp)
  li $t0, 43
  lw $t1, 44($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, if_else_129
  nop
  lw $t1, 28($fp)
  move $t0, $t1
  addiu $t1, $t1, 1
  sw $t1, 28($fp)
  b if_end_130
  nop
if_else_129:
if_end_130:
if_end_125:
while_start_134:
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_136
  nop
  li $v0, 10
  syscall
idx_ptr_ok_136:
  lw $t1, 28($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_137
  nop
  li $v0, 10
  syscall
idx_ok_137:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_138
  nop
  li $v0, 10
  syscall
idx_upper_ok_138:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 44($fp)
  lw $a0, 44($fp)
  jal is_digit
  nop
  move $t0, $v0
  beq $t0, $zero, while_end_135
  nop
  lw $t0, 36($fp)
  sw $t0, 44($fp)
  li $t0, 10
  lw $t1, 44($fp)
  mul $t1, $t1, $t0
  sw $t1, 44($fp)
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_139
  nop
  li $v0, 10
  syscall
idx_ptr_ok_139:
  lw $t1, 28($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_140
  nop
  li $v0, 10
  syscall
idx_ok_140:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_141
  nop
  li $v0, 10
  syscall
idx_upper_ok_141:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 48($fp)
  li $t0, 48
  lw $t1, 48($fp)
  subu $t1, $t1, $t0
  lw $t0, 44($fp)
  addu $t0, $t0, $t1
  sw $t0, 36($fp)
  lw $t1, 40($fp)
  move $t0, $t1
  addiu $t1, $t1, 1
  sw $t1, 40($fp)
  lw $t1, 28($fp)
  move $t0, $t1
  addiu $t1, $t1, 1
  sw $t1, 28($fp)
  b while_start_134
  nop
while_end_135:
  lw $t0, 40($fp)
  sw $t0, 44($fp)
  li $t0, 0
  lw $t1, 44($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, if_else_142
  nop
  li $t0, 0
  move $v0, $t0
  b __ret_parse_int_at
  nop
  b if_end_143
  nop
if_else_142:
if_end_143:
  lw $t0, 12($fp)
  bne $t0, $zero, idx_ptr_ok_144
  nop
  li $v0, 10
  syscall
idx_ptr_ok_144:
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_145
  nop
  li $v0, 10
  syscall
idx_ok_145:
  lw $t2, 16($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_146
  nop
  li $v0, 10
  syscall
idx_upper_ok_146:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  sw $t0, 44($fp)
  lw $t0, 36($fp)
  sw $t0, 48($fp)
  lw $t0, 32($fp)
  lw $t1, 48($fp)
  mul $t1, $t1, $t0
  lw $t0, 44($fp)
  sw $t1, 0($t0)
  lw $t0, 20($fp)
  bne $t0, $zero, idx_ptr_ok_147
  nop
  li $v0, 10
  syscall
idx_ptr_ok_147:
  li $t1, 0
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_148
  nop
  li $v0, 10
  syscall
idx_ok_148:
  lw $t2, 24($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_149
  nop
  li $v0, 10
  syscall
idx_upper_ok_149:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  sw $t0, 44($fp)
  lw $t0, 28($fp)
  lw $t1, 44($fp)
  sw $t0, 0($t1)
  li $t0, 1
  move $v0, $t0
  b __ret_parse_int_at
  nop
  b __ret_parse_int_at
  nop
__ret_parse_int_at:
  move $sp, $fp
  lw $fp, 76($sp)
  lw $ra, 80($sp)
  addiu $sp, $sp, 88
  jr $ra
  nop

print_expression_result:
  addiu $sp, $sp, -56
  sw $fp, 48($sp)
  sw $ra, 52($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  sw $a2, 8($fp)
  sw $a3, 12($fp)
  lw $t0, 0($fp)
  sw $t0, 16($fp)
  lw $a0, 16($fp)
  jal tty_putint
  nop
  move $t0, $v0
  li $t0, 32
  sw $t0, 16($fp)
  lw $a0, 16($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  lw $t0, 4($fp)
  sw $t0, 16($fp)
  lw $a0, 16($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  li $t0, 32
  sw $t0, 16($fp)
  lw $a0, 16($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  lw $t0, 8($fp)
  sw $t0, 16($fp)
  lw $a0, 16($fp)
  jal tty_putint
  nop
  move $t0, $v0
  la $t0, __str_6
  sw $t0, 16($fp)
  lw $a0, 16($fp)
  jal tty_puts
  nop
  move $t0, $v0
  lw $t0, 12($fp)
  sw $t0, 16($fp)
  lw $a0, 16($fp)
  jal tty_putint
  nop
  move $t0, $v0
  jal tty_newline
  nop
  move $t0, $v0
  b __ret_print_expression_result
  nop
__ret_print_expression_result:
  move $sp, $fp
  lw $fp, 48($sp)
  lw $ra, 52($sp)
  addiu $sp, $sp, 56
  jr $ra
  nop

read_line:
  addiu $sp, $sp, -64
  sw $fp, 52($sp)
  sw $ra, 56($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  sw $a2, 8($fp)
  li $t0, 0
  sw $t0, 12($fp)
while_start_150:
  li $t0, 1
  beq $t0, $zero, while_end_151
  nop
  jal tty_get_byte
  nop
  move $t0, $v0
  sw $t0, 16($fp)
  lw $t0, 16($fp)
  sw $t0, 20($fp)
  li $t0, 13
  lw $t1, 20($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  bne $t1, $zero, or_true_154
  nop
  lw $t0, 16($fp)
  sw $t0, 20($fp)
  li $t0, 10
  lw $t2, 20($fp)
  xor $t2, $t2, $t0
  sltiu $t2, $t2, 1
  bne $t2, $zero, or_true_154
  nop
  move $t1, $zero
  b or_end_156
  nop
or_true_154:
  li $t1, 1
or_end_156:
  beq $t1, $zero, if_else_152
  nop
  lw $t0, 12($fp)
  sw $t0, 20($fp)
  li $t0, 0
  lw $t1, 20($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, if_else_157
  nop
  b while_start_150
  nop
  b if_end_158
  nop
if_else_157:
if_end_158:
  jal tty_newline
  nop
  move $t0, $v0
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_159
  nop
  li $v0, 10
  syscall
idx_ptr_ok_159:
  lw $t1, 12($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_160
  nop
  li $v0, 10
  syscall
idx_ok_160:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_161
  nop
  li $v0, 10
  syscall
idx_upper_ok_161:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  sw $t0, 20($fp)
  li $t0, 0
  lw $t1, 20($fp)
  sw $t0, 0($t1)
  lw $t0, 12($fp)
  move $v0, $t0
  b __ret_read_line
  nop
  b if_end_153
  nop
if_else_152:
if_end_153:
  lw $t0, 16($fp)
  sw $t0, 20($fp)
  li $t0, 8
  lw $t1, 20($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  beq $t1, $zero, if_else_162
  nop
  lw $t0, 12($fp)
  sw $t0, 20($fp)
  li $t0, 0
  lw $t1, 20($fp)
  slt $t1, $t0, $t1
  beq $t1, $zero, if_else_164
  nop
  lw $t1, 12($fp)
  move $t0, $t1
  addiu $t1, $t1, -1
  sw $t1, 12($fp)
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_166
  nop
  li $v0, 10
  syscall
idx_ptr_ok_166:
  lw $t1, 12($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_167
  nop
  li $v0, 10
  syscall
idx_ok_167:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_168
  nop
  li $v0, 10
  syscall
idx_upper_ok_168:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  sw $t0, 20($fp)
  li $t0, 0
  lw $t1, 20($fp)
  sw $t0, 0($t1)
  jal tty_backspace
  nop
  move $t0, $v0
  b if_end_165
  nop
if_else_164:
if_end_165:
  b while_start_150
  nop
  b if_end_163
  nop
if_else_162:
if_end_163:
  lw $t0, 16($fp)
  sw $t0, 20($fp)
  li $t0, 32
  lw $t1, 20($fp)
  slt $t1, $t1, $t0
  beq $t1, $zero, if_else_169
  nop
  b while_start_150
  nop
  b if_end_170
  nop
if_else_169:
if_end_170:
  lw $t0, 12($fp)
  sw $t0, 20($fp)
  lw $t0, 8($fp)
  sw $t0, 24($fp)
  li $t0, 1
  lw $t1, 24($fp)
  subu $t1, $t1, $t0
  lw $t0, 20($fp)
  slt $t0, $t0, $t1
  xori $t0, $t0, 1
  beq $t0, $zero, if_else_171
  nop
  b while_start_150
  nop
  b if_end_172
  nop
if_else_171:
if_end_172:
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_173
  nop
  li $v0, 10
  syscall
idx_ptr_ok_173:
  lw $t1, 12($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_174
  nop
  li $v0, 10
  syscall
idx_ok_174:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_175
  nop
  li $v0, 10
  syscall
idx_upper_ok_175:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  sw $t0, 20($fp)
  lw $t0, 16($fp)
  lw $t1, 20($fp)
  sw $t0, 0($t1)
  lw $t1, 12($fp)
  move $t0, $t1
  addiu $t1, $t1, 1
  sw $t1, 12($fp)
  lw $t0, 16($fp)
  sw $t0, 20($fp)
  lw $a0, 20($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b while_start_150
  nop
while_end_151:
  lw $t0, 12($fp)
  move $v0, $t0
  b __ret_read_line
  nop
  move $v0, $zero
  b __ret_read_line
  nop
__ret_read_line:
  move $sp, $fp
  lw $fp, 52($sp)
  lw $ra, 56($sp)
  addiu $sp, $sp, 64
  jr $ra
  nop

skip_spaces:
  addiu $sp, $sp, -56
  sw $fp, 44($sp)
  sw $ra, 48($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  sw $a2, 8($fp)
while_start_176:
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_178
  nop
  li $v0, 10
  syscall
idx_ptr_ok_178:
  lw $t1, 8($fp)
  slt $t3, $t1, $zero
  beq $t3, $zero, idx_ok_179
  nop
  li $v0, 10
  syscall
idx_ok_179:
  lw $t2, 4($fp)
  slt $t3, $t1, $t2
  bne $t3, $zero, idx_upper_ok_180
  nop
  li $v0, 10
  syscall
idx_upper_ok_180:
  sll $t1, $t1, 2
  addu $t0, $t0, $t1
  lw $t1, 0($t0)
  sw $t1, 12($fp)
  li $t0, 0
  lw $t1, 12($fp)
  xor $t1, $t1, $t0
  sltu $t1, $zero, $t1
  beq $t1, $zero, and_false_182
  nop
  lw $t0, 0($fp)
  bne $t0, $zero, idx_ptr_ok_184
  nop
  li $v0, 10
  syscall
idx_ptr_ok_184:
  lw $t2, 8($fp)
  slt $t4, $t2, $zero
  beq $t4, $zero, idx_ok_185
  nop
  li $v0, 10
  syscall
idx_ok_185:
  lw $t3, 4($fp)
  slt $t4, $t2, $t3
  bne $t4, $zero, idx_upper_ok_186
  nop
  li $v0, 10
  syscall
idx_upper_ok_186:
  sll $t2, $t2, 2
  addu $t0, $t0, $t2
  lw $t2, 0($t0)
  sw $t2, 12($fp)
  lw $a0, 12($fp)
  jal is_space
  nop
  move $t0, $v0
  beq $t0, $zero, and_false_182
  nop
and_true_181:
  li $t1, 1
  b and_end_183
  nop
and_false_182:
  move $t1, $zero
and_end_183:
  beq $t1, $zero, while_end_177
  nop
  lw $t1, 8($fp)
  move $t0, $t1
  addiu $t1, $t1, 1
  sw $t1, 8($fp)
  b while_start_176
  nop
while_end_177:
  lw $t0, 8($fp)
  move $v0, $t0
  b __ret_skip_spaces
  nop
  move $v0, $zero
  b __ret_skip_spaces
  nop
__ret_skip_spaces:
  move $sp, $fp
  lw $fp, 44($sp)
  lw $ra, 48($sp)
  addiu $sp, $sp, 56
  jr $ra
  nop

string_charat:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  li $t0, 0
  sw $t0, 8($fp)
  lw $t0, 4($fp)
  lw $t1, 8($fp)
  slt $t1, $t0, $t1
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_188
  nop
  lw $t0, 4($fp)
  sw $t0, 8($fp)
  lw $t0, 0($fp)
  sw $t0, 12($fp)
  lw $a0, 12($fp)
  jal string_length
  nop
  move $t0, $v0
  lw $t2, 8($fp)
  slt $t2, $t2, $t0
  beq $t2, $zero, and_false_188
  nop
and_true_187:
  li $t1, 1
  b and_end_189
  nop
and_false_188:
  move $t1, $zero
and_end_189:
  bne $t1, $zero, require_ok_190
  nop
  li $v0, 10
  syscall
require_ok_190:
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  lw $t0, 4($fp)
  sw $t0, 12($fp)
  lw $a0, 8($fp)
  lw $a1, 12($fp)
  li $v0, 75
  syscall
  move $t0, $v0
  move $v0, $t0
  b __ret_string_charat
  nop
  b __ret_string_charat
  nop
__ret_string_charat:
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_compare:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  lw $t0, 4($fp)
  sw $t0, 12($fp)
  lw $a0, 8($fp)
  lw $a1, 12($fp)
  li $v0, 78
  syscall
  move $t0, $v0
  move $v0, $t0
  b __ret_string_compare
  nop
  move $v0, $zero
  b __ret_string_compare
  nop
__ret_string_compare:
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_equal:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  lw $t0, 4($fp)
  sw $t0, 12($fp)
  lw $a0, 8($fp)
  lw $a1, 12($fp)
  li $v0, 78
  syscall
  move $t0, $v0
  sw $t0, 8($fp)
  li $t0, 0
  lw $t1, 8($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  move $v0, $t1
  b __ret_string_equal
  nop
  b __ret_string_equal
  nop
__ret_string_equal:
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_from_chararray:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  lw $t1, 0($fp)
  lw $t0, -4($t1)
  sw $t0, 12($fp)
  lw $a0, 8($fp)
  lw $a1, 12($fp)
  jal string_terminated
  nop
  move $t0, $v0
  bne $t0, $zero, require_ok_191
  nop
  li $v0, 10
  syscall
require_ok_191:
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  lw $a0, 8($fp)
  li $v0, 84
  syscall
  move $t0, $v0
  sw $t0, 4($fp)
  move $v0, $t0
  b __ret_string_from_chararray
  nop
  b __ret_string_from_chararray
  nop
__ret_string_from_chararray:
  sw $v0, 4($fp)
  lw $t0, 4($fp)
  sw $t0, 8($fp)
  lw $a0, 8($fp)
  jal string_length
  nop
  move $t0, $v0
  sw $t0, 8($fp)
  li $t0, 1
  lw $t1, 8($fp)
  addu $t1, $t1, $t0
  sw $t1, 8($fp)
  lw $t1, 0($fp)
  lw $t0, -4($t1)
  lw $t1, 8($fp)
  slt $t1, $t0, $t1
  xori $t1, $t1, 1
  bne $t1, $zero, ensure_ok_192
  nop
  li $v0, 10
  syscall
ensure_ok_192:
  lw $v0, 4($fp)
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_frombool:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  beq $t0, $zero, if_else_193
  nop
  la $t0, __str_7
  move $v0, $t0
  b __ret_string_frombool
  nop
  b if_end_194
  nop
if_else_193:
if_end_194:
  la $t0, __str_8
  move $v0, $t0
  b __ret_string_frombool
  nop
  b __ret_string_frombool
  nop
__ret_string_frombool:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_fromchar:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  li $t0, 0
  lw $t1, 8($fp)
  xor $t1, $t1, $t0
  sltu $t1, $zero, $t1
  bne $t1, $zero, require_ok_195
  nop
  li $v0, 10
  syscall
require_ok_195:
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  lw $a0, 8($fp)
  li $v0, 80
  syscall
  move $t0, $v0
  sw $t0, 4($fp)
  move $v0, $t0
  b __ret_string_fromchar
  nop
  b __ret_string_fromchar
  nop
__ret_string_fromchar:
  sw $v0, 4($fp)
  lw $t0, 4($fp)
  sw $t0, 8($fp)
  lw $a0, 8($fp)
  jal string_length
  nop
  move $t0, $v0
  sw $t0, 8($fp)
  li $t0, 1
  lw $t1, 8($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  bne $t1, $zero, ensure_ok_196
  nop
  li $v0, 10
  syscall
ensure_ok_196:
  lw $t0, 4($fp)
  sw $t0, 8($fp)
  li $t0, 0
  sw $t0, 12($fp)
  lw $a0, 8($fp)
  lw $a1, 12($fp)
  jal string_charat
  nop
  move $t0, $v0
  sw $t0, 8($fp)
  lw $t0, 0($fp)
  lw $t1, 8($fp)
  xor $t1, $t1, $t0
  sltiu $t1, $t1, 1
  bne $t1, $zero, ensure_ok_197
  nop
  li $v0, 10
  syscall
ensure_ok_197:
  lw $v0, 4($fp)
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_fromint:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  li $v0, 79
  syscall
  move $t0, $v0
  move $v0, $t0
  b __ret_string_fromint
  nop
  b __ret_string_fromint
  nop
__ret_string_fromint:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_join:
  addiu $sp, $sp, -56
  sw $fp, 44($sp)
  sw $ra, 48($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  lw $t0, 0($fp)
  sw $t0, 12($fp)
  lw $t0, 4($fp)
  sw $t0, 16($fp)
  lw $a0, 12($fp)
  lw $a1, 16($fp)
  li $v0, 76
  syscall
  move $t0, $v0
  sw $t0, 8($fp)
  move $v0, $t0
  b __ret_string_join
  nop
  b __ret_string_join
  nop
__ret_string_join:
  sw $v0, 8($fp)
  lw $t0, 8($fp)
  sw $t0, 12($fp)
  lw $a0, 12($fp)
  jal string_length
  nop
  move $t0, $v0
  sw $t0, 12($fp)
  lw $t0, 0($fp)
  sw $t0, 16($fp)
  lw $a0, 16($fp)
  jal string_length
  nop
  move $t0, $v0
  sw $t0, 16($fp)
  lw $t0, 4($fp)
  sw $t0, 20($fp)
  lw $a0, 20($fp)
  jal string_length
  nop
  move $t0, $v0
  lw $t1, 16($fp)
  addu $t1, $t1, $t0
  lw $t0, 12($fp)
  xor $t0, $t0, $t1
  sltiu $t0, $t0, 1
  bne $t0, $zero, ensure_ok_198
  nop
  li $v0, 10
  syscall
ensure_ok_198:
  lw $v0, 8($fp)
  move $sp, $fp
  lw $fp, 44($sp)
  lw $ra, 48($sp)
  addiu $sp, $sp, 56
  jr $ra
  nop

string_length:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  li $v0, 74
  syscall
  move $t0, $v0
  move $v0, $t0
  b __ret_string_length
  nop
  move $v0, $zero
  b __ret_string_length
  nop
__ret_string_length:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_sub:
  addiu $sp, $sp, -56
  sw $fp, 48($sp)
  sw $ra, 52($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  sw $a2, 8($fp)
  li $t0, 0
  sw $t0, 16($fp)
  lw $t0, 4($fp)
  lw $t1, 16($fp)
  slt $t1, $t0, $t1
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_200
  nop
  lw $t0, 4($fp)
  sw $t0, 16($fp)
  lw $t0, 8($fp)
  lw $t2, 16($fp)
  slt $t2, $t0, $t2
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_200
  nop
and_true_199:
  li $t1, 1
  b and_end_201
  nop
and_false_200:
  move $t1, $zero
and_end_201:
  beq $t1, $zero, and_false_203
  nop
  lw $t0, 8($fp)
  sw $t0, 16($fp)
  lw $t0, 0($fp)
  sw $t0, 20($fp)
  lw $a0, 20($fp)
  jal string_length
  nop
  move $t0, $v0
  lw $t2, 16($fp)
  slt $t2, $t0, $t2
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_203
  nop
and_true_202:
  li $t1, 1
  b and_end_204
  nop
and_false_203:
  move $t1, $zero
and_end_204:
  bne $t1, $zero, require_ok_205
  nop
  li $v0, 10
  syscall
require_ok_205:
  lw $t0, 0($fp)
  sw $t0, 16($fp)
  lw $t0, 4($fp)
  sw $t0, 20($fp)
  lw $t0, 8($fp)
  sw $t0, 24($fp)
  lw $a0, 16($fp)
  lw $a1, 20($fp)
  lw $a2, 24($fp)
  li $v0, 77
  syscall
  move $t0, $v0
  sw $t0, 12($fp)
  move $v0, $t0
  b __ret_string_sub
  nop
  b __ret_string_sub
  nop
__ret_string_sub:
  sw $v0, 12($fp)
  lw $t0, 12($fp)
  sw $t0, 16($fp)
  lw $a0, 16($fp)
  jal string_length
  nop
  move $t0, $v0
  sw $t0, 16($fp)
  lw $t0, 8($fp)
  sw $t0, 20($fp)
  lw $t0, 4($fp)
  lw $t1, 20($fp)
  subu $t1, $t1, $t0
  lw $t0, 16($fp)
  xor $t0, $t0, $t1
  sltiu $t0, $t0, 1
  bne $t0, $zero, ensure_ok_206
  nop
  li $v0, 10
  syscall
ensure_ok_206:
  lw $v0, 12($fp)
  move $sp, $fp
  lw $fp, 48($sp)
  lw $ra, 52($sp)
  addiu $sp, $sp, 56
  jr $ra
  nop

string_terminated:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  li $t0, 0
  sw $t0, 8($fp)
  lw $t0, 4($fp)
  lw $t1, 8($fp)
  slt $t1, $t0, $t1
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_208
  nop
  lw $t0, 4($fp)
  sw $t0, 8($fp)
  lw $t2, 0($fp)
  lw $t0, -4($t2)
  lw $t2, 8($fp)
  slt $t2, $t0, $t2
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_208
  nop
and_true_207:
  li $t1, 1
  b and_end_209
  nop
and_false_208:
  move $t1, $zero
and_end_209:
  bne $t1, $zero, require_ok_210
  nop
  li $v0, 10
  syscall
require_ok_210:
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  lw $t0, 4($fp)
  sw $t0, 12($fp)
  lw $a0, 8($fp)
  lw $a1, 12($fp)
  li $v0, 82
  syscall
  move $t0, $v0
  move $v0, $t0
  b __ret_string_terminated
  nop
  b __ret_string_terminated
  nop
__ret_string_terminated:
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_to_chararray:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  lw $a0, 8($fp)
  li $v0, 83
  syscall
  move $t0, $v0
  sw $t0, 4($fp)
  move $v0, $t0
  b __ret_string_to_chararray
  nop
  b __ret_string_to_chararray
  nop
__ret_string_to_chararray:
  sw $v0, 4($fp)
  lw $t1, 4($fp)
  lw $t0, -4($t1)
  sw $t0, 8($fp)
  lw $t0, 0($fp)
  sw $t0, 12($fp)
  lw $a0, 12($fp)
  jal string_length
  nop
  move $t0, $v0
  sw $t0, 12($fp)
  li $t0, 1
  lw $t1, 12($fp)
  addu $t1, $t1, $t0
  lw $t0, 8($fp)
  slt $t0, $t0, $t1
  xori $t0, $t0, 1
  bne $t0, $zero, ensure_ok_211
  nop
  li $v0, 10
  syscall
ensure_ok_211:
  lw $t0, 4($fp)
  sw $t0, 8($fp)
  lw $t0, 0($fp)
  sw $t0, 12($fp)
  lw $a0, 12($fp)
  jal string_length
  nop
  move $t0, $v0
  sw $t0, 12($fp)
  li $t0, 1
  lw $t1, 12($fp)
  addu $t1, $t1, $t0
  sw $t1, 12($fp)
  lw $a0, 8($fp)
  lw $a1, 12($fp)
  jal string_terminated
  nop
  move $t0, $v0
  bne $t0, $zero, ensure_ok_212
  nop
  li $v0, 10
  syscall
ensure_ok_212:
  lw $v0, 4($fp)
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

string_tolower:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  li $v0, 81
  syscall
  move $t0, $v0
  move $v0, $t0
  b __ret_string_tolower
  nop
  b __ret_string_tolower
  nop
__ret_string_tolower:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_backspace:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  li $t0, 8
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  li $t0, 32
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  li $t0, 8
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b __ret_tty_backspace
  nop
__ret_tty_backspace:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_box_off:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_escape
  nop
  move $t0, $v0
  li $t0, 40
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  li $t0, 66
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b __ret_tty_box_off
  nop
__ret_tty_box_off:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_box_on:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_escape
  nop
  move $t0, $v0
  li $t0, 40
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  li $t0, 48
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b __ret_tty_box_on
  nop
__ret_tty_box_on:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_clear:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_csi
  nop
  move $t0, $v0
  la $t0, __str_9
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_puts
  nop
  move $t0, $v0
  jal tty_home
  nop
  move $t0, $v0
  b __ret_tty_clear
  nop
__ret_tty_clear:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_csi:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_escape
  nop
  move $t0, $v0
  li $t0, 91
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b __ret_tty_csi
  nop
__ret_tty_csi:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_escape:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  li $t0, 27
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b __ret_tty_escape
  nop
__ret_tty_escape:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_get_byte:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  jal tty_receiver_data_addr
  nop
  move $t0, $v0
  sw $t0, 0($fp)
while_start_213:
  jal tty_key_ready
  nop
  move $t0, $v0
  sltu $t0, $zero, $t0
  xori $t0, $t0, 1
  beq $t0, $zero, while_end_214
  nop
  b while_start_213
  nop
while_end_214:
  lw $t0, 0($fp)
  bne $t0, $zero, deref_ok_215
  nop
  li $v0, 10
  syscall
deref_ok_215:
  lw $t1, 0($t0)
  sw $t1, 4($fp)
  li $t0, 255
  lw $t1, 4($fp)
  and $t1, $t1, $t0
  move $v0, $t1
  b __ret_tty_get_byte
  nop
  move $v0, $zero
  b __ret_tty_get_byte
  nop
__ret_tty_get_byte:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_getchar:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_get_byte
  nop
  move $t0, $v0
  sw $t0, 0($fp)
  li $t0, 127
  lw $t1, 0($fp)
  and $t1, $t1, $t0
  sw $t1, 0($fp)
  lw $a0, 0($fp)
  jal char_chr
  nop
  move $t0, $v0
  move $v0, $t0
  b __ret_tty_getchar
  nop
  b __ret_tty_getchar
  nop
__ret_tty_getchar:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_home:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_csi
  nop
  move $t0, $v0
  li $t0, 72
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_putc
  nop
  move $t0, $v0
  b __ret_tty_home
  nop
__ret_tty_home:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_key_ready:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  jal tty_receiver_control_addr
  nop
  move $t0, $v0
  sw $t0, 0($fp)
  lw $t0, 0($fp)
  bne $t0, $zero, deref_ok_216
  nop
  li $v0, 10
  syscall
deref_ok_216:
  lw $t1, 0($t0)
  sw $t1, 4($fp)
  li $t0, 1
  lw $t1, 4($fp)
  and $t1, $t1, $t0
  sw $t1, 4($fp)
  li $t0, 0
  lw $t1, 4($fp)
  xor $t1, $t1, $t0
  sltu $t1, $zero, $t1
  move $v0, $t1
  b __ret_tty_key_ready
  nop
  b __ret_tty_key_ready
  nop
__ret_tty_key_ready:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_mmio_base:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  li $t0, 65536
  subu $t0, $zero, $t0
  move $v0, $t0
  b __ret_tty_mmio_base
  nop
  move $v0, $zero
  b __ret_tty_mmio_base
  nop
__ret_tty_mmio_base:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_move:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  sw $a1, 4($fp)
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  li $t0, 1
  lw $t1, 8($fp)
  slt $t1, $t1, $t0
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_218
  nop
  lw $t0, 4($fp)
  sw $t0, 8($fp)
  li $t0, 1
  lw $t2, 8($fp)
  slt $t2, $t2, $t0
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_218
  nop
and_true_217:
  li $t1, 1
  b and_end_219
  nop
and_false_218:
  move $t1, $zero
and_end_219:
  bne $t1, $zero, require_ok_220
  nop
  li $v0, 10
  syscall
require_ok_220:
  jal tty_csi
  nop
  move $t0, $v0
  lw $t0, 0($fp)
  sw $t0, 8($fp)
  lw $a0, 8($fp)
  jal tty_putint
  nop
  move $t0, $v0
  li $t0, 59
  sw $t0, 8($fp)
  lw $a0, 8($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  lw $t0, 4($fp)
  sw $t0, 8($fp)
  lw $a0, 8($fp)
  jal tty_putint
  nop
  move $t0, $v0
  li $t0, 72
  sw $t0, 8($fp)
  lw $a0, 8($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b __ret_tty_move
  nop
__ret_tty_move:
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_newline:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  li $t0, 13
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  li $t0, 10
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b __ret_tty_newline
  nop
__ret_tty_newline:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_put_byte:
  addiu $sp, $sp, -48
  sw $fp, 40($sp)
  sw $ra, 44($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  jal tty_transmitter_data_addr
  nop
  move $t0, $v0
  sw $t0, 4($fp)
while_start_221:
  jal tty_tx_ready
  nop
  move $t0, $v0
  sltu $t0, $zero, $t0
  xori $t0, $t0, 1
  beq $t0, $zero, while_end_222
  nop
  b while_start_221
  nop
while_end_222:
  lw $t0, 4($fp)
  bne $t0, $zero, assign_ptr_ok_223
  nop
  li $v0, 10
  syscall
assign_ptr_ok_223:
  sw $t0, 8($fp)
  lw $t0, 0($fp)
  sw $t0, 12($fp)
  li $t0, 255
  lw $t1, 12($fp)
  and $t1, $t1, $t0
  lw $t0, 8($fp)
  sw $t1, 0($t0)
  b __ret_tty_put_byte
  nop
__ret_tty_put_byte:
  move $sp, $fp
  lw $fp, 40($sp)
  lw $ra, 44($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_putc:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b __ret_tty_putc
  nop
__ret_tty_putc:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_putint:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  jal string_fromint
  nop
  move $t0, $v0
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  jal tty_puts
  nop
  move $t0, $v0
  b __ret_tty_putint
  nop
__ret_tty_putint:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_puts:
  addiu $sp, $sp, -56
  sw $fp, 44($sp)
  sw $ra, 48($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  li $t0, 0
  sw $t0, 4($fp)
  lw $t0, 0($fp)
  sw $t0, 12($fp)
  lw $a0, 12($fp)
  jal string_length
  nop
  move $t0, $v0
  sw $t0, 8($fp)
while_start_224:
  lw $t0, 4($fp)
  sw $t0, 12($fp)
  lw $t0, 8($fp)
  lw $t1, 12($fp)
  slt $t1, $t1, $t0
  beq $t1, $zero, while_end_225
  nop
  lw $t0, 0($fp)
  sw $t0, 12($fp)
  lw $t0, 4($fp)
  sw $t0, 16($fp)
  lw $a0, 12($fp)
  lw $a1, 16($fp)
  jal string_charat
  nop
  move $t0, $v0
  sw $t0, 12($fp)
  lw $a0, 12($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  lw $t1, 4($fp)
  move $t0, $t1
  addiu $t1, $t1, 1
  sw $t1, 4($fp)
  b while_start_224
  nop
while_end_225:
  b __ret_tty_puts
  nop
__ret_tty_puts:
  move $sp, $fp
  lw $fp, 44($sp)
  lw $ra, 48($sp)
  addiu $sp, $sp, 56
  jr $ra
  nop

tty_receiver_control_addr:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_mmio_base
  nop
  move $t0, $v0
  move $v0, $t0
  b __ret_tty_receiver_control_addr
  nop
  move $v0, $zero
  b __ret_tty_receiver_control_addr
  nop
__ret_tty_receiver_control_addr:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_receiver_data_addr:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_mmio_base
  nop
  move $t0, $v0
  sw $t0, 0($fp)
  li $t0, 4
  lw $t1, 0($fp)
  addu $t1, $t1, $t0
  move $v0, $t1
  b __ret_tty_receiver_data_addr
  nop
  move $v0, $zero
  b __ret_tty_receiver_data_addr
  nop
__ret_tty_receiver_data_addr:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_reset:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_escape
  nop
  move $t0, $v0
  li $t0, 99
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_put_byte
  nop
  move $t0, $v0
  b __ret_tty_reset
  nop
__ret_tty_reset:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_set_bg:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  li $t0, 0
  sw $t0, 4($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  slt $t1, $t0, $t1
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_227
  nop
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 7
  lw $t2, 4($fp)
  slt $t2, $t0, $t2
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_227
  nop
and_true_226:
  li $t1, 1
  b and_end_228
  nop
and_false_227:
  move $t1, $zero
and_end_228:
  bne $t1, $zero, require_ok_229
  nop
  li $v0, 10
  syscall
require_ok_229:
  jal tty_csi
  nop
  move $t0, $v0
  li $t0, 40
  sw $t0, 4($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  addu $t1, $t1, $t0
  sw $t1, 4($fp)
  lw $a0, 4($fp)
  jal tty_putint
  nop
  move $t0, $v0
  li $t0, 109
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  jal tty_putc
  nop
  move $t0, $v0
  b __ret_tty_set_bg
  nop
__ret_tty_set_bg:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_set_bright_fg:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  li $t0, 0
  sw $t0, 4($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  slt $t1, $t0, $t1
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_231
  nop
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 7
  lw $t2, 4($fp)
  slt $t2, $t0, $t2
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_231
  nop
and_true_230:
  li $t1, 1
  b and_end_232
  nop
and_false_231:
  move $t1, $zero
and_end_232:
  bne $t1, $zero, require_ok_233
  nop
  li $v0, 10
  syscall
require_ok_233:
  jal tty_csi
  nop
  move $t0, $v0
  li $t0, 90
  sw $t0, 4($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  addu $t1, $t1, $t0
  sw $t1, 4($fp)
  lw $a0, 4($fp)
  jal tty_putint
  nop
  move $t0, $v0
  li $t0, 109
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  jal tty_putc
  nop
  move $t0, $v0
  b __ret_tty_set_bright_fg
  nop
__ret_tty_set_bright_fg:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_set_fg:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  sw $a0, 0($fp)
  li $t0, 0
  sw $t0, 4($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  slt $t1, $t0, $t1
  xori $t1, $t1, 1
  beq $t1, $zero, and_false_235
  nop
  lw $t0, 0($fp)
  sw $t0, 4($fp)
  li $t0, 7
  lw $t2, 4($fp)
  slt $t2, $t0, $t2
  xori $t2, $t2, 1
  beq $t2, $zero, and_false_235
  nop
and_true_234:
  li $t1, 1
  b and_end_236
  nop
and_false_235:
  move $t1, $zero
and_end_236:
  bne $t1, $zero, require_ok_237
  nop
  li $v0, 10
  syscall
require_ok_237:
  jal tty_csi
  nop
  move $t0, $v0
  li $t0, 30
  sw $t0, 4($fp)
  lw $t0, 0($fp)
  lw $t1, 4($fp)
  addu $t1, $t1, $t0
  sw $t1, 4($fp)
  lw $a0, 4($fp)
  jal tty_putint
  nop
  move $t0, $v0
  li $t0, 109
  sw $t0, 4($fp)
  lw $a0, 4($fp)
  jal tty_putc
  nop
  move $t0, $v0
  b __ret_tty_set_fg
  nop
__ret_tty_set_fg:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop

tty_style_reset:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_csi
  nop
  move $t0, $v0
  la $t0, __str_10
  sw $t0, 0($fp)
  lw $a0, 0($fp)
  jal tty_puts
  nop
  move $t0, $v0
  b __ret_tty_style_reset
  nop
__ret_tty_style_reset:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_transmitter_control_addr:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_mmio_base
  nop
  move $t0, $v0
  sw $t0, 0($fp)
  li $t0, 8
  lw $t1, 0($fp)
  addu $t1, $t1, $t0
  move $v0, $t1
  b __ret_tty_transmitter_control_addr
  nop
  move $v0, $zero
  b __ret_tty_transmitter_control_addr
  nop
__ret_tty_transmitter_control_addr:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_transmitter_data_addr:
  addiu $sp, $sp, -40
  sw $fp, 32($sp)
  sw $ra, 36($sp)
  move $fp, $sp
  jal tty_mmio_base
  nop
  move $t0, $v0
  sw $t0, 0($fp)
  li $t0, 12
  lw $t1, 0($fp)
  addu $t1, $t1, $t0
  move $v0, $t1
  b __ret_tty_transmitter_data_addr
  nop
  move $v0, $zero
  b __ret_tty_transmitter_data_addr
  nop
__ret_tty_transmitter_data_addr:
  move $sp, $fp
  lw $fp, 32($sp)
  lw $ra, 36($sp)
  addiu $sp, $sp, 40
  jr $ra
  nop

tty_tx_ready:
  addiu $sp, $sp, -48
  sw $fp, 36($sp)
  sw $ra, 40($sp)
  move $fp, $sp
  jal tty_transmitter_control_addr
  nop
  move $t0, $v0
  sw $t0, 0($fp)
  lw $t0, 0($fp)
  bne $t0, $zero, deref_ok_238
  nop
  li $v0, 10
  syscall
deref_ok_238:
  lw $t1, 0($t0)
  sw $t1, 4($fp)
  li $t0, 1
  lw $t1, 4($fp)
  and $t1, $t1, $t0
  sw $t1, 4($fp)
  li $t0, 0
  lw $t1, 4($fp)
  xor $t1, $t1, $t0
  sltu $t1, $zero, $t1
  move $v0, $t1
  b __ret_tty_tx_ready
  nop
  b __ret_tty_tx_ready
  nop
__ret_tty_tx_ready:
  move $sp, $fp
  lw $fp, 36($sp)
  lw $ra, 40($sp)
  addiu $sp, $sp, 48
  jr $ra
  nop


.data
  .align 2
__str_0: .byte 84, 84, 89, 32, 99, 97, 108, 99, 117, 108, 97, 116, 111, 114, 32, 114, 101, 97, 100, 121, 46, 0
  .align 2
__str_1: .byte 85, 115, 101, 32, 43, 44, 32, 45, 44, 32, 42, 44, 32, 47, 32, 32, 32, 124, 32, 32, 32, 113, 32, 113, 117, 105, 116, 115, 0
  .align 2
__str_2: .byte 99, 97, 108, 99, 62, 32, 0
  .align 2
__str_3: .byte 66, 121, 101, 46, 0
  .align 2
__str_4: .byte 73, 110, 118, 97, 108, 105, 100, 32, 102, 111, 114, 109, 97, 116, 46, 32, 85, 115, 101, 58, 32, 97, 32, 43, 32, 98, 0
  .align 2
__str_5: .byte 68, 105, 118, 105, 115, 105, 111, 110, 32, 98, 121, 32, 122, 101, 114, 111, 32, 105, 115, 32, 110, 111, 116, 32, 97, 108, 108, 111, 119, 101, 100, 46, 0
  .align 2
__str_6: .byte 32, 61, 32, 0
  .align 2
__str_7: .byte 116, 114, 117, 101, 0
  .align 2
__str_8: .byte 102, 97, 108, 115, 101, 0
  .align 2
__str_9: .byte 50, 74, 0
  .align 2
__str_10: .byte 48, 109, 0
