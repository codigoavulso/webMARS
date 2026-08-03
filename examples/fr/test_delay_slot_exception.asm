#Test de parité manuel :
#Lorsque le branchement retardé est activé, le débordement se produit dans le slot de retard.
#Comportement attendu :
#- message d'exception : débordement arithmétique
#- Cause.BD réglé
#- EPC pointe vers l'instruction beq

.text
main:
  lui $t1, 0x7fff
  ori $t1, $t1, 0xffff
  ori $t2, $zero, 1
  beq $zero, $zero, done
  add $t0, $t1, $t2

done:
  ori $v0, $zero, 10
  syscall
