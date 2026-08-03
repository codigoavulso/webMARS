#Test de parité manuel pour erreur d'adresse au chargement.
#Comportement attendu :
#- exception de chargement déclenchée sur 0x10010001
#- mauvaise adresse / vaddr affiche 0x10010001

.data
value: .word 0x12345678

.text
main:
  lui $t0, 0x1001
  ori $t0, $t0, 0x0001
  lw $t1, 0($t0)
  ori $v0, $zero, 10
  syscall
