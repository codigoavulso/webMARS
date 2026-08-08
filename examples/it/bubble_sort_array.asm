#Demo dell'ordinamento delle bolle
#Ordina un array fisso e stampa i valori ordinati.
#Concetti: accesso alle parole indicizzate, cicli annidati, confronto con segno e scambio sul posto.
#Piano di registrazione: $s0 = base dell'array, $s1 = lunghezza, $t0/$t1 = indici del loop.

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #io
outer:
  #Dopo il passaggio i, i valori più grandi sono già fissati sul bordo destro.
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #Una parola occupa quattro byte, quindi arr[j] è in base + j*4.
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #I valori adiacenti sono fuori servizio: scambiateli in memoria.
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4 stampa l'etichetta prima dell'attraversamento elemento per elemento.
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #Riutilizzare lo stesso calcolo dell'indirizzo per recuperare arr[indice].
  bge $t7, $s1, end
  sll $t3, $t7, 2
  addu $t4, $s0, $t3
  lw  $a0, 0($t4)
  li  $v0, 1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addiu $t7, $t7, 1
  j print_loop

end:
  li $v0, 11
  li $a0, '\n'
  syscall
  li $v0, 10
  syscall
