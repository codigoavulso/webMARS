# Prueba manual de paridad:
# Con delayed branching activado, el overflow ocurre en el delay slot.
# Comportamiento esperado:
# - mensaje de excepcion: overflow aritmetico
# - Cause.BD activo
# - el EPC apunta a la instruccion beq

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
