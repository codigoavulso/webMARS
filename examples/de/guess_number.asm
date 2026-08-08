#Erraten Sie die Zahl (1..100)
#Verwendet Syscall 42 für die Zufallszahlengenerierung und Syscall 5 für die Ganzzahleingabe.
#$s0 behält das Geheimnis über Systemaufrufe hinweg; $s1 zählt Versuche über Schleifeniterationen hinweg.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #Seed-Zufallsstrom-ID=1 mit einem beliebigen Seed.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #Zufällige Ganzzahl im Bereich [0,100], dann auf [1,100] verschieben.
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 gibt den generierten Wert in $a0 zurück, nicht in $v0.
  addiu $s0, $a0, 1      #Geheimnummer
  li $s1, 0              #Versuche

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Systemaufrufe überschreiben möglicherweise Argument-/Ergebnisregister, sodass der persistente Status in den $s-Registern verbleibt.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #Die Ganzzahleingabe wird in $v0 zurückgegeben.
  move $t0, $v0          #rate mal
  addiu $s1, $s1, 1

  #wenn rate <geheim => zu niedrig
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #if Secret <guest => zu hoch
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #gleich => gewinnen
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #Beide Feedbackzweige konvergieren bei der nächsten Iteration.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
