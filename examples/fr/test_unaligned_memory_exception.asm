# Un chargement de mots nécessite une adresse divisible par quatre. Cet exemple utilise 0x10010001 pour déclencher l'exception.
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
