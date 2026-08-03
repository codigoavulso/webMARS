#Benchmark du comportement du cache : accès séquentiel ou accès stride-16.
#Ouvrez Outils > Outil de simulation de cache de données, connectez-le à MIPS et cochez Activé.
#
#Chaque exécution mesure exactement un modèle de cache froid. Définir ACCESS_PATTERN
#à 1 ou 2, réinitialisez les statistiques du simulateur, puis assemblez et exécutez à nouveau.
#Les deux modèles effectuent 1 024 charges ; aucune écriture d'initialisation ne pollue les données.

.eqv ACCESS_PATTERN 1    #1 = séquentiel, 2 = foulée 16 mots
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #Modèle 1 : adresses séquentielles.
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #Modèle 2 : visitez tous les 16 mots, puis avancez le décalage de départ.
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
