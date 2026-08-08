#Fattoriale ricorsivo (classico di facoltà)
#Legge n e stampa n! (per n piccolo).

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

  jal fact   #n è in $a0; il risultato ritorna in $v0
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

#int fatto(int n)
fact:
  addiu $sp, $sp, -8   #un fotogramma per chiamata: due parole
  sw    $ra, 4($sp)   #salvare l'indirizzo del mittente prima di richiamare
  sw    $a0, 0($sp)   #mantieni n: la chiamata ricorsiva sovrascrive $a0

  blez  $a0, fact_base   #condizione di arresto: senza di essa la pila non si svolge mai
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #di nuovo il nostro n, non toccato dalla chiamata di seguito
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #ripristinare e rilasciare il telaio prima della restituzione
  addiu $sp, $sp, 8
  jr    $ra
