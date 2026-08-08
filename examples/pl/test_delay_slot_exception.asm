#Ręczny test parzystości:
#Po włączeniu opóźnionego rozgałęziania przepełnienie następuje w szczelinie opóźnienia.
#Oczekiwane zachowanie:
#- komunikat wyjątku: przepełnienie arytmetyczne
#- Przyczyna.BD ustawiona
#- EPC wskazuje na instrukcję beq

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
