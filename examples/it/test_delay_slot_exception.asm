#Test di parità manuale:
#Con la diramazione ritardata abilitata, l'overflow avviene nello slot di ritardo.
#Comportamento previsto:
#- messaggio di eccezione: overflow aritmetico
#- Causa.BD impostato
#- EPC punta all'istruzione beq

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
