# Teste manual de paridade para jalr rd, rs.
# Comportamento esperado apos a execucao:
# - $s0 contem o endereco de retorno 0x0040000c
# - $t0 passa a 7 dentro do target
# - $t3 passa a 9 depois de regressar via $s0

.text
main:
  lui $t1, 0x0040
  ori $t1, $t1, 0x0018
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
