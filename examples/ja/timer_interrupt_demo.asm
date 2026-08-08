#webMARS システムクロック割り込みのデモ
#[ツール] > [システム クロックとタイマー] を開き、MIPS に接続し、アセンブルして実行します。
#決定性のあるシミュレートされたタイマーは、200 命令ごとにプログラムを中断します。

.eqv CLOCK_CONTROL 0xffff0050   #デバイスレジスタは MMIO ブロック内に存在します
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #期間は実行された命令で測定されるため、実行は正確に繰り返されます
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #ビット 0 はタイマーを開始し、ビット 1 は割り込みを発生させます。
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main はハンドラーを呼び出すことはありません。CPU が独自にハンドラーにジャンプします。
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #終了する前にタイマーを停止してください
  li $v0, 4
  la $a0, message
  syscall
  li $v0, 1
  move $a0, $t2
  syscall
  li $v0, 11
  li $a0, 10
  syscall
  li $v0, 10
  syscall
.ktext 0x80000180
timer_handler:
  mfc0 $k0, $13
  andi $k0, $k0, 0x0400
  beq $k0, $zero, handler_done
  nop
  la $k1, ticks
  lw $k0, 0($k1)
  addiu $k0, $k0, 1
  sw $k0, 0($k1)
handler_done:
  eret
