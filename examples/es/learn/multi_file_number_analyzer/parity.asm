# Ejemplo multiarchivo auxiliar 1/2
# Entrada: $a0 = numero
# Salida:  $v0 = direccion del mensaje "par" o "impar"

.data
even_msg: .asciiz "par"
odd_msg:  .asciiz "impar"

.text
.globl get_parity_message
get_parity_message:
  # El bit menos significativo vale 0 en números pares y 1 en impares.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  # Devuelve una dirección sin imprimir; el llamador decide cómo utilizarla.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
