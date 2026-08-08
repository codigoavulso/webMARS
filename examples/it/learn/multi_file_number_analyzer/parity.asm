#Assistente di esempio multi-file 1/2
#Ingresso: $a0 = numero
#Output: $v0 = indirizzo del messaggio "pari" o "dispari"

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #Il bit meno significativo è 0 per i numeri pari e 1 per i numeri dispari.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #Restituisci un indirizzo invece di stamparlo qui; il chiamante sceglie come usarlo.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
