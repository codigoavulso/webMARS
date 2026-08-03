#递归阶乘（学院经典）
#读取 n 并打印 n! （对于小n）。

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n 位于 $a0 中；结果返回到 $v0
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#整数事实(int n)
fact:
  addiu $sp, $sp, -8   #每次调用一帧：两个单词
  sw    $ra, 4($sp)   #再次致电之前保存回信地址
  sw    $a0, 0($sp)   #keep n：递归调用覆盖 $a0

  blez  $a0, fact_base   #停止条件：没有它，堆栈永远不会展开
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #又是我们自己的n，没有受到下面的调用的影响
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #返回之前恢复并释放框架
  addiu $sp, $sp, 8
  jr    $ra
