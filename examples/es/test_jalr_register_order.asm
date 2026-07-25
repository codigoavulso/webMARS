# Prueba manual de paridad para jalr rd, rs.
# Comportamiento esperado tras la ejecucion:
# - delayed branching desactivado: $s0 contiene 0x0040000c
# - delayed branching activado:    $s0 contiene 0x00400010
# - $t0 pasa a 7 dentro del target
# - $t3 pasa a 9 despues de volver por $s0

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
