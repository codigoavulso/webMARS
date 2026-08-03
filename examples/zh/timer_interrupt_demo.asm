#webMARS 系统时钟中断演示
#打开Tools > System Clock and Timer，连接到MIPS，编译并运行。
#确定性模拟定时器每 200 条指令就会中断一次程序。

.eqv CLOCK_CONTROL 0xffff0050   #设备寄存器位于 MMIO 块中
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #以执行指令测量的周期，因此运行准确重复
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #位 0 启动定时器，位 1 让它引发中断
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #main 从不调用处理程序：CPU 自行跳转到它
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #在完成之前停止计时器
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
