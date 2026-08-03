#Récupération de la démo du gestionnaire d'exceptions.
#Le magasin non aligné génère une erreur d'adresse (magasin). Le gestionnaire enregistre
#Parce que EPC et BadVAddr ignorent l'instruction défaillante et renvoient avec ERET.

.data
recovered:     .asciiz "Recovered from the exception.\n"
cause_label:   .asciiz "Cause: "
epc_label:     .asciiz "EPC: "
badvaddr_label:.asciiz "BadVAddr: "
newline:       .asciiz "\n"
saved_cause:   .word 0
saved_epc:     .word 0
saved_badvaddr:.word 0

.text
main:
  li $t0, 0x12345678
  #L'adresse 1 n'est pas alignée sur les mots, donc cette instruction est délibérément erronée.
  sw $t0, 1($zero)

  #L'exécution reprend ici après que le gestionnaire ait avancé EPC d'une instruction.
  li $v0, 4
  la $a0, recovered
  syscall

  la $a0, cause_label
  syscall
  lw $a0, saved_cause
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, epc_label
  syscall
  lw $a0, saved_epc
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, badvaddr_label
  syscall
  lw $a0, saved_badvaddr
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

.ktext 0x80000180
exception_handler:
  #CP0 registre 13 = Cause, 14 = EPC, 8 = BadVAdr.
  #Les registres du noyau $k0/$k1 évitent de corrompre les registres utilisateur interrompus.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #Ignorer l'instruction défaillante connue de 4 octets ; réessayer, ce serait une faute pour toujours.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
