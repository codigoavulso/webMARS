# Ejemplo de argumentos del programa.
# Usa este ejemplo para probar el soporte de argc/argv en MARS.
# Para probarlo, ve a Definiciones > Argumentos del programa proporcionados al programa MIPS,
# introduce algunos argumentos y luego haz Assemble y ejecuta el programa.
# Ejemplo de argumentos: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  # Programa de demostracion para argumentos del programa.
  # En la entrada:
  #   $a0 = argc
  #   $a1 = argv
  move $s0, $a0          # Guarda argc.
  move $s1, $a1          # Guarda argv.

  # Imprime argc.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  # Recorre argv[i].
  li   $t0, 0            # i = 0

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

  # argv es un array de punteros, asi que argv[i] esta en argv + i * 4.
  sll  $t1, $t0, 2       # desplazamiento = i * 4
  addu $t2, $s1, $t1     # direccion de argv[i]
  lw   $a0, 0($t2)       # carga argv[i]

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
