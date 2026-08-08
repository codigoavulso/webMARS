#Manueller Paritätstest:
#Wenn die verzögerte Verzweigung aktiviert ist, erfolgt der Überlauf im Verzögerungsschlitz.
#Erwartetes Verhalten:
#- Ausnahmemeldung: Arithmetischer Überlauf
#- Ursache.BD eingestellt
#- EPC zeigt auf die beq-Anweisung

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
