# Teste manual de paridade:
# Com delayed branching ativo, o overflow acontece no delay slot.
# Comportamento esperado:
# - mensagem de excecao: overflow aritmetico
# - Cause.BD ativo
# - o EPC aponta para a instrucao beq

.text
main:
  lui $t1, 0x7fff
  ori $t1, $t1, 0xffff
  ori $t2, $zero, 1
  beq $zero, $zero, done
  add $t0, $t1, $t2

done:
  ori $v0, $zero, 10
  syscall
