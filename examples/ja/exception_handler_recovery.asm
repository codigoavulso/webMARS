#例外ハンドラーのデモを回復しています。
#アライメントされていないストアでは、アドレス エラー (ストア) が発生します。ハンドラーの記録
#原因、EPC および BadVAddr は、障害のある命令をスキップし、ERET を返します。

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
  #アドレス 1 はワード境界に整列していないため、この命令は意図的にフォールトします。
  sw $t0, 1($zero)

  #ハンドラーが 1 命令分 EPC を進めた後、ここで実行が再開されます。
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
  #CP0 レジスタ 13 = 原因、14 = EPC、8 = BadVAddr。
  #カーネル レジスタ $k0/$k1 は、中断されたユーザー レジスタの破損を回避します。
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #既知の障害のある 4 バイト命令をスキップします。再試行すると永久にエラーが発生します。
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
