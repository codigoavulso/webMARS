#Rekursive Fakultät (Fakultätsklassiker)
#Liest n und gibt n aus! (für kleines n).

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n ist in $a0; das Ergebnis kommt zurück in $v0
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#int fact(int n)
fact:
  addiu $sp, $sp, -8   #ein Frame pro Aufruf: zwei Wörter
  sw    $ra, 4($sp)   #Speichern Sie die Absenderadresse, bevor Sie erneut anrufen
  sw    $a0, 0($sp)   #n behalten: Der rekursive Aufruf überschreibt $a0

  blez  $a0, fact_base   #Stoppbedingung: Ohne sie wird der Stapel nie abgewickelt
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #unser eigenes n wieder, unberührt von dem Anruf unten
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #Stellen Sie den Rahmen wieder her und geben Sie ihn frei, bevor Sie ihn zurückgeben
  addiu $sp, $sp, 8
  jr    $ra
