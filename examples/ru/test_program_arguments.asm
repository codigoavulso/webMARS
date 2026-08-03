#Пример аргументов программы.
#Используйте этот пример, чтобы проверить поддержку argc/argv в MARS.
#Чтобы попробовать, перейдите в «Настройки» > «Аргументы программы, предоставленные программе MIPS»,
#введите несколько аргументов, затем выполните сборку и запустите программу.
#Пример аргументов: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #Демонстрационная программа для аргументов программы.
  #При входе:
  #$a0 = арг
  #$a1 = аргумент
  move $s0, $a0          #Сохранить аргк.
  move $s1, $a1          #Сохранить аргв.

  #Распечатать аргк.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #Перебираем argv[i].
  li   $t0, 0            #я = 0

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

  #argv — это массив указателей, поэтому argv[i] имеет значение argv + i * 4.
  sll  $t1, $t0, 2       #смещение = я * 4
  addu $t2, $s1, $t1     #адрес argv[i]
  lw   $a0, 0($t2)       #загрузить argv[i]

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
