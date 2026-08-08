#Odzyskiwanie wersji demonstracyjnej obsługi wyjątków.
#Niewyrównany sklep zgłasza błąd adresu (sklep). Opiekun zapisuje
#Przyczyna, EPC i BadVAddr, pomija instrukcję powodującą błąd i powraca z ERET.

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
  #Adres 1 nie jest wyrównany do słów, więc ta instrukcja celowo powoduje błędy.
  sw $t0, 1($zero)

  #Wykonywanie zostaje tutaj wznowione po tym, jak procedura obsługi przejdzie EPC o jedną instrukcję.
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
  #CP0 rejestr 13 = przyczyna, 14 = EPC, 8 = BadVAddr.
  #Rejestry jądra $k0/$k1 zapobiegają uszkodzeniu przerwanych rejestrów użytkowników.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #Pomiń znaną, powodującą błąd instrukcję 4-bajtową; ponowna próba byłaby błędem na zawsze.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
