#Test de simulation de laboratoire numérique
#Mappage d'outils (avec la base MMIO par défaut 0xFFFF0000) :
#afficher le chiffre de droite : 0xFFFF0010
#afficher le chiffre de gauche : 0xFFFF0011
#Ctrl clavier : 0xFFFF0012
#Code de sortie clavier : 0xFFFF0014
#
#Cliquez sur les touches du clavier Digital Lab Sim.
#Le programme décode le code de numérisation et affiche la valeur de la touche enfoncée (0..f).

.data
msg0:   .asciiz "\n=== Digital Lab Sim demo ===\n"
msg1:   .asciiz "Open Tools > Digital Lab Sim and click keypad buttons.\n"
msg2:   .asciiz "Displaying pressed key value (0..f) on 7-segment.\n"
segmap: .byte 0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f,0x77,0x7c,0x39,0x5e,0x79,0x71

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $t0, 0xffff
  li $t1, 0x0f
  sb $t1, 0x12($t0)      #analyser toutes les lignes

  sb $zero, 0x11($t0)    #chiffre de gauche vide
  move $s1, $zero        #dernier code de numérisation traité

wait_key:
  lbu $t2, 0x14($t0)     #code de numérisation du clavier (col<<4 | rangée)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #coopérative 4 ms d'attente
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #bit de ligne (quartet faible) et bit de colonne (quartet élevé)
  andi $t3, $t2, 0x0f    #bit de ligne : 1,2,4,8
  srl  $t4, $t2, 4       #colBit : 1,2,4,8

  #index de ligne = log2 (rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #index col = log2 (colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #quartet clé = ligne*4 + col (valeurs 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #afficher la touche enfoncée sur le chiffre de droite

  j wait_key

#a0 : grignoter 0..15
#v0 : modèle à sept segments
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
