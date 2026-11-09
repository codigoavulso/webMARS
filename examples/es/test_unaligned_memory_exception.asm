# La carga de una palabra exige una dirección múltiplo de cuatro. Este ejemplo usa 0x10010001 para provocar la excepción.
# Comportamiento esperado:
# - excepcion de lectura lanzada en 0x10010001
# - bad address / vaddr muestra 0x10010001

.data
value: .word 0x12345678

.text
main:
  lui $t0, 0x1001
  ori $t0, $t0, 0x0001
  lw $t1, 0($t0)
  ori $v0, $zero, 10
  syscall
