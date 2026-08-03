#Démo de tri à bulles
#Trie un tableau fixe et imprime les valeurs triées.
#Concepts : accès aux mots indexés, boucles imbriquées, comparaison signée et échange sur place.
#Plan de registre : $s0 = base du tableau, $s1 = longueur, $t0/$t1 = index de boucle.

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #je
outer:
  #Après la passe i, les i valeurs les plus grandes sont déjà fixées sur le bord droit.
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #Un mot occupe quatre octets, donc arr[j] est à la base + j*4.
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #Les valeurs adjacentes sont dans le désordre : échangez-les en mémoire.
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4 imprime l'étiquette avant le parcours élément par élément.
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #Réutilisez le même calcul d'adresse pour récupérer arr[index].
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
