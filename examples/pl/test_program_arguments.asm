#Przykład argumentów programu.
#Użyj tego przykładu, aby przetestować obsługę argc/argv w MARS.
#Aby spróbować, przejdź do Ustawienia > Argumenty programu podane do programu MIPS,
#wprowadź kilka argumentów, następnie Assembluj i uruchom program.
#Przykładowe argumenty: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #Program demonstracyjny dla argumentów programu.
  #Przy wejściu:
  #$a0 = argument
  #$a1 = argument
  move $s0, $a0          #Zapisz argc.
  move $s1, $a1          #Zapisz argv.

  #Wydrukuj argc.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #Wykonaj pętlę argv[i].
  li   $t0, 0            #ja = 0

print_loop:
  beq  $t0, $s0, done

  li   $v0, 4
  la   $a0, argv_msg
  syscall

  li   $v0, 1
  move $a0, $t0
  syscall

  li   $v0, 4
  la   $a0, mid_msg
  syscall

  #argv jest tablicą wskaźników, więc argv[i] ma wartość argv + i * 4.
  sll  $t1, $t0, 2       #przesunięcie = i * 4
  addu $t2, $s1, $t1     #adres argv[i]
  lw   $a0, 0($t2)       #załaduj argumentv[i]

  li   $v0, 4
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  addiu $t0, $t0, 1
  j    print_loop

done:
  li   $v0, 10
  syscall
