#Silnia rekurencyjna (klasyczna wydziałowa)
#Czyta n i wypisuje n! (dla małego n).

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

  jal fact   #n jest w $a0; wynik wraca w $v0
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

#int fakt(int n)
fact:
  addiu $sp, $sp, -8   #jedna ramka na połączenie: dwa słowa
  sw    $ra, 4($sp)   #zapisz adres zwrotny przed ponownym zadzwonieniem
  sw    $a0, 0($sp)   #zachowaj n: wywołanie rekurencyjne nadpisuje $a0

  blez  $a0, fact_base   #warunek zatrzymania: bez niego stos nigdy się nie rozwija
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #nasze własne n, nietknięte przez poniższe wezwanie
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #przywróć i zwolnij ramę przed powrotem
  addiu $sp, $sp, 8
  jr    $ra
