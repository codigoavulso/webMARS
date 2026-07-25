# Teste manual de paridade para jalr rd, rs.
# Comportamento esperado apos a execucao:
# - delayed branching desligado: $s0 contem 0x0040000c
# - delayed branching ligado:    $s0 contem 0x00400010
# - $t0 passa a 7 dentro do target
# - $t3 passa a 9 depois de regressar via $s0

.text
main:
  la $t1, target
  jalr $s0, $t1
  ori $t3, $zero, 9
  j done
  nop

target:
  ori $t0, $zero, 7
  jr $s0
  nop

done:
  ori $v0, $zero, 10
  syscall
