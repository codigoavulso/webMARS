# Exemplo multi-ficheiro auxiliar 1/2
# Entrada: $a0 = numero
# Saida:   $v0 = endereco da mensagem "par" ou "impar"

.data
even_msg: .asciiz "par"
odd_msg:  .asciiz "impar"

.text
.globl get_parity_message
get_parity_message:
  # O bit menos significativo é 0 nos pares e 1 nos ímpares.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  # Esta função-folha não chama outras rotinas, portanto $ra pode ser usado diretamente.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
