# Exemplo de argumentos do programa.
# Use este exemplo para testar o suporte a argc/argv no MARS.
# Para testar, va a Definicoes > Argumentos do programa fornecidos ao programa MIPS,
# introduza alguns argumentos e depois faca Assemble e execute o programa.
# Exemplo de argumentos: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  # Programa de demonstracao para argumentos do programa.
  # A entrada recebe:
  #   $a0 = argc
  #   $a1 = argv
  move $s0, $a0          # Guarda argc.
  move $s1, $a1          # Guarda argv.

  # Escreve argc.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  # Percorre argv[i].
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

  # argv e um array de ponteiros, por isso argv[i] fica em argv + i * 4.
  sll  $t1, $t0, 2       # deslocamento = i * 4
  addu $t2, $s1, $t1     # endereco de argv[i]
  lw   $a0, 0($t2)       # carrega argv[i]

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
