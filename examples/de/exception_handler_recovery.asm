#Demo zur Wiederherstellung des Ausnahmehandlers.
#Der nicht ausgerichtete Speicher löst einen Adressfehler (Speicher) aus. Der Handler zeichnet auf
#Ursache, EPC und BadVAddr, überspringt die fehlerhafte Anweisung und kehrt mit ERET zurück.

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
  #Adresse 1 ist nicht wortorientiert, daher weist dieser Befehl absichtlich Fehler auf.
  sw $t0, 1($zero)

  #Die Ausführung wird hier fortgesetzt, nachdem der Handler EPC um eine Anweisung vorrückt.
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
  #CP0 Register 13 = Ursache, 14 = EPC, 8 = BadVAddr.
  #Die Kernel-Register $k0/$k1 vermeiden eine Beschädigung der unterbrochenen Benutzerregister.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #Überspringen Sie den bekannten fehlerhaften 4-Byte-Befehl. Ein erneuter Versuch würde für immer zum Fehler führen.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
