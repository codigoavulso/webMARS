#恢复异常处理程序演示。
#未对齐的存储会引发地址错误（存储）。处理程序记录
#原因 EPC 和 BadVAddr 跳过错误指令并返回 ERET。

.data
recovered:     .asciiz "Recovered from the exception.\n"
cause_label:   .asciiz "Cause: "
epc_label:     .asciiz "EPC: "
badvaddr_label:.asciiz "BadVAddr: "
newline:       .asciiz "\n"
saved_cause:   .word 0
saved_epc:     .word 0
saved_badvaddr:.word 0

.text
main:
  li $t0, 0x12345678
  #地址 1 不是字对齐的，因此该指令故意出错。
  sw $t0, 1($zero)

  #处理程序将 EPC 前进一条指令后，执行将在此处恢复。
  li $v0, 4
  la $a0, recovered
  syscall

  la $a0, cause_label
  syscall
  lw $a0, saved_cause
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, epc_label
  syscall
  lw $a0, saved_epc
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, badvaddr_label
  syscall
  lw $a0, saved_badvaddr
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

.ktext 0x80000180
exception_handler:
  #CP0 寄存器 13 = 原因，14 = EPC，8 = BadVAddr。
  #内核寄存器 $k0/$k1 避免损坏中断的用户寄存器。
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #跳过已知错误的 4 字节指令；重试就会永远出错。
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
