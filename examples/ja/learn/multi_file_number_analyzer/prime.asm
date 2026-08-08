#複数ファイルのサンプルヘルパー 2/2
#入力: $a0 = [1,100] の数値
#出力: $v0 = 数値が素数の場合は 1、それ以外の場合は 0

.text
.globl is_prime
is_prime:
  #定義上、2 未満の値は素数ではありません。
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #sqrt(n) より大きい約数はテストする必要はありません。
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div は商を LO に置き、余りを HI に置きます。
  div $a0, $t1
  mfhi $t4
  beq $t4, $zero, prime_no
  nop

  addiu $t1, $t1, 1
  j prime_loop
  nop

prime_yes:
  li $v0, 1
  jr $ra
  nop

prime_no:
  move $v0, $zero
  jr $ra
  nop
