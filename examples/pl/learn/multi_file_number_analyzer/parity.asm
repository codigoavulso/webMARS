#Przykładowy pomocnik wieloplikowy 1/2
#Wejście: $a0 = liczba
#Dane wyjściowe: $v0 = adres komunikatu „parzysty” lub „nieparzysty”

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #Najmniej znaczący bit to 0 dla liczb parzystych i 1 dla liczb nieparzystych.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #Zwróć adres zamiast drukować tutaj; dzwoniący wybiera, jak z niego korzystać.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
