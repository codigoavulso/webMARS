#Demo di ripristino del gestore delle eccezioni.
#Il negozio non allineato genera un errore di indirizzo (negozio). Il conduttore registra
#Causa, EPC e BadVAddr, salta l'istruzione che ha causato l'errore e restituisce ERET.

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
  #L'indirizzo 1 non è allineato alle parole, quindi questa istruzione fallisce deliberatamente.
  sw $t0, 1($zero)

  #L'esecuzione riprende qui dopo che il gestore avanza EPC di un'istruzione.
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
  #CP0 registro 13 = Causa, 14 = EPC, 8 = BadVAddr.
  #I registri del kernel $k0/$k1 evitano di corrompere i registri utente interrotti.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #Salta l'istruzione a 4 byte che presenta errori noti; riprovare sarebbe un errore per sempre.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
