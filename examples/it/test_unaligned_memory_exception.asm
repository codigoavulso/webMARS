# Un carico di parole necessita di un indirizzo divisibile per quattro. Questo esempio utilizza 0x10010001 per attivare l'eccezione.
#Comportamento previsto:
#- eccezione di caricamento sollevata il 0x10010001
#- indirizzo errato/vaddr mostra 0x10010001

.data
value: .word 0x12345678

.text
main:
  lui $t0, 0x1001
  ori $t0, $t0, 0x0001
  lw $t1, 0($t0)
  ori $v0, $zero, 10
  syscall
