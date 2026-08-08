#Beispiel für mehrere Dateien: Hauptmodul
#Lassen Sie diese Datei aktiv und klicken Sie auf „Assemble“.
#Die folgenden .include-Anweisungen ziehen die anderen beiden Dateien ein.
#- parity.asm gibt eine Meldung zurück, die angibt, ob die Zahl gerade oder ungerade ist
#- prime.asm gibt 1 in $v0 zurück, wenn die Zahl eine Primzahl ist
#
#Durchfluss:
#1. Fragen Sie nach einer Zahl in [1.100] oder 0, um den Vorgang zu beenden
#2. Drucken Sie, ob die Zahl gerade oder ungerade ist
#3. Drucken Sie, ob die Zahl eine Primzahl ist
#4. Wiederholen

.data
#Dieses Modul besitzt benutzerseitige Zeichenfolgen; Hilfsmodule besitzen ihre privaten Daten/Code.
title:         .asciiz "\n=== Multi-file number analyzer ===\n"
hint:          .asciiz "This example uses 3 separate files assembled together.\n"
prompt:        .asciiz "Enter a number [1..100] (0 to exit): "
invalid_msg:   .asciiz "Please enter a value between 1 and 100.\n"
result_prefix: .asciiz "Number "
parity_prefix: .asciiz " is "
prime_yes_msg: .asciiz " and it is prime.\n"
prime_no_msg:  .asciiz " and it is not prime.\n"
goodbye_msg:   .asciiz "Bye!\n"

.text
.globl main
main:
  li $v0, 4
  la $a0, title
  syscall

  li $v0, 4
  la $a0, hint
  syscall

input_loop:
  #Syscall 5 gibt die eingegebene Ganzzahl in $v0 zurück.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #Validieren Sie die Unter- und Obergrenzen mit vorzeichenbehafteten Vergleichen.
  slti $t0, $s0, 1
  bne $t0, $zero, invalid_input
  nop

  slti $t0, $s0, 101
  beq $t0, $zero, invalid_input
  nop

  li $v0, 4
  la $a0, result_prefix
  syscall

  li $v0, 1
  #o32-Aufrufkonvention: Argument in $a0, Ergebniszeiger in $v0.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #Das zweite Modul gibt einen booleschen Wert in $v0 zurück.
  move $a0, $s0
  jal get_parity_message
  nop

  move $s1, $v0
  li $v0, 4
  move $a0, $s1
  syscall

  move $a0, $s0
  jal is_prime
  nop

  bne $v0, $zero, print_prime_yes
  nop

  li $v0, 4
  la $a0, prime_no_msg
  syscall
  j input_loop
  nop

print_prime_yes:
  li $v0, 4
  la $a0, prime_yes_msg
  syscall
  j input_loop
  nop

invalid_input:
  li $v0, 4
  la $a0, invalid_msg
  syscall
  j input_loop
  nop

exit_program:
  li $v0, 4
  la $a0, goodbye_msg
  syscall

  li $v0, 10
  syscall

#Includes werden während der Montage aus den Projektdateien aufgelöst.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
