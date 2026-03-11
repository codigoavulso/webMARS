# Ejemplo multiarchivo auxiliar 1/2
# Entrada: $a0 = numero
# Salida:  $v0 = direccion del mensaje "par" o "impar"

.data
even_msg: .asciiz "par"
odd_msg:  .asciiz "impar"

.text
.globl get_parity_message
get_parity_message:
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
