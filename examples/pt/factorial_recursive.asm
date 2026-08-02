# Fatorial recursivo (classico da faculdade)
# Le n e imprime n! (para n pequeno).

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

  jal fact   # n está em $a0; o resultado volta em $v0
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

# int fact(int n)
fact:
  addiu $sp, $sp, -8   # um frame por chamada: duas palavras
  sw    $ra, 4($sp)   # guardar o endereço de retorno antes de voltar a chamar
  sw    $a0, 0($sp)   # guardar n: a chamada recursiva sobrepõe $a0

  blez  $a0, fact_base   # condição de paragem: sem ela a pilha nunca se desfaz
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   # o nosso n outra vez, intacto apesar da chamada
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   # repor e libertar o frame antes de retornar
  addiu $sp, $sp, 8
  jr    $ra
