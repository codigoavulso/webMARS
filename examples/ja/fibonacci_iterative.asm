#反復フィボナッチ数列
#最初の N 個の数値を出力します。

.data
ask: .asciiz "How many Fibonacci terms? "
sep: .asciiz " "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $t0, $v0          # N

  li $t1, 0              #ある
  li $t2, 1              #b
  li $t3, 0              #私は

fib_loop:
  bge  $t3, $t0, done

  li $v0, 1
  move $a0, $t1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addu $t4, $t1, $t2
  move $t1, $t2
  move $t2, $t4

  addiu $t3, $t3, 1
  j fib_loop

done:
  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall
