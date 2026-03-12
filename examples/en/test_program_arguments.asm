# Program arguments example.
# Use this example to test argc/argv support in MARS.
# To try it, go to Settings > Program arguments provided to MIPS program,
# enter some arguments, then Assemble and run the program.
# Example arguments: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  # Demo program for program arguments.
  # On entry:
  #   $a0 = argc
  #   $a1 = argv
  move $s0, $a0          # Save argc.
  move $s1, $a1          # Save argv.

  # Print argc.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  # Loop over argv[i].
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

  # argv is an array of pointers, so argv[i] is at argv + i * 4.
  sll  $t1, $t0, 2       # offset = i * 4
  addu $t2, $s1, $t1     # address of argv[i]
  lw   $a0, 0($t2)       # load argv[i]

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
