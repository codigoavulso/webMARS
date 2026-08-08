#Beispiel für Programmargumente.
#Verwenden Sie dieses Beispiel, um die argc/argv-Unterstützung in MARS zu testen.
#Um es auszuprobieren, gehen Sie zu Einstellungen > Für das Programm MIPS bereitgestellte Programmargumente.
#Geben Sie einige Argumente ein, montieren Sie dann das Programm und führen Sie es aus.
#Beispielargumente: ola 123 „abc def“

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #Demoprogramm für Programmargumente.
  #Bei der Einreise:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #argc speichern.
  move $s1, $a1          #argv speichern.

  #argc drucken.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #Schleife über argv[i].
  li   $t0, 0            #ich = 0

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

  #argv ist ein Array von Zeigern, daher liegt argv[i] bei argv + i * 4.
  sll  $t1, $t0, 2       #Offset = i * 4
  addu $t2, $s1, $t1     #Adresse von argv[i]
  lw   $a0, 0($t2)       #argv[i] laden

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
