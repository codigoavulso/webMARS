#Exemple d'aide multi-fichiers 1/2
#Entrée : $a0 = nombre
#Sortie : $v0 = adresse du message "pair" ou "impair"

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #Le bit de poids faible est 0 pour les nombres pairs et 1 pour les nombres impairs.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #Renvoyez une adresse plutôt que de l’imprimer ici ; l'appelant choisit comment l'utiliser.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
