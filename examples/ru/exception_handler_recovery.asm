#Восстановление демо-обработчика исключений.
#Невыровненное хранилище вызывает ошибку адреса (хранилище). Обработчик записывает
#Причина: EPC и BadVAddr пропускают команду, вызвавшую ошибку, и возвращаются с ERET.

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
  #Адрес 1 не выровнен по слову, поэтому эта инструкция намеренно дает сбой.
  sw $t0, 1($zero)

  #Здесь выполнение возобновляется после того, как обработчик продвигает EPC на одну инструкцию.
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
  #Регистр CP0 13 = Причина, 14 = EPC, 8 = BadVAddr.
  #Регистры ядра $k0/$k1 позволяют избежать повреждения прерванных пользовательских регистров.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #Пропустить известную неисправную 4-байтовую инструкцию; повторная попытка приведет к ошибке навсегда.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
