#Esempio di argomenti del programma.
#Utilizza questo esempio per testare il supporto argc/argv in MARS.
#Per provarlo, vai su Impostazioni > Argomenti del programma forniti al programma MIPS,
#inserisci alcuni argomenti, quindi Assembla ed esegui il programma.
#Argomenti di esempio: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #Programma demo per gli argomenti del programma.
  #All'ingresso:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #Salva argc.
  move $s1, $a1          #Salva argv.

  #Stampa arg.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #Ciclo su argv[i].
  li   $t0, 0            #io = 0

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

  #argv è un array di puntatori, quindi argv[i] si trova in argv + i * 4.
  sll  $t1, $t0, 2       #spostamento = i*4
  addu $t2, $s1, $t1     #indirizzo di argv[i]
  lw   $a0, 0($t2)       #caricare argv[i]

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
