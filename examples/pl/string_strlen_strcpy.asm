#Demo narzędzi ciągowych: strlen + strcpy (ręczne)
#Obie procedury przechodzą bajt po bajcie aż do terminatora zerowego.
#Są to funkcje liścia, więc nie muszą zapisywać $ra na stosie.

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #jal przechowuje adres zwrotny w $ra; argumenty/wyniki podążają za rejestrami o32.
  la   $a0, src
  jal  my_strlen
  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  la   $a0, dst
  la   $a1, src
  jal  my_strcpy

  li $v0, 4
  la $a0, msg1
  syscall

  li $v0, 4
  la $a0, dst
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#a0 = znak* s ; v0 = długość
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #lbu unika przedłużania znaku podczas ładowania pojedynczego znaku.
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#a0 = dst, a1 = źródło
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #Najpierw skopiuj, potem przetestuj: kopiuje to również kończący bajt zerowy.
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
