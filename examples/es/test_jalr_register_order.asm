# Prueba manual de paridad para jalr rd, rs.
# Comportamiento esperado tras la ejecucion:
# - $s0 contiene la direccion de retorno 0x0040000c
# - $t0 pasa a 7 dentro del target
# - $t3 pasa a 9 despues de volver por $s0

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
