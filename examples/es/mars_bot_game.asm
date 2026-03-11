# Demo interactiva del Mars Bot
# Abra Herramientas > Mars Bot antes de ejecutar.
# Controles en la entrada de Run I/O:
#   w = arriba, d = derecha, s = abajo, a = izquierda
#   t = alternar rastro, x = detener, q = salir

.data
intro0: .asciiz "\n=== Mars Bot demo ===\n"
intro1: .asciiz "Commands: w/a/s/d move, t toggle trail, x stop, q quit\n"
prompt: .asciiz "Command> "
posX:   .asciiz "  X="
posY:   .asciiz " Y="
trailOn:.asciiz "Trail ON\n"
trailOff:.asciiz "Trail OFF\n"
nl:     .asciiz "\n"

.text
main:
  # Base de las direcciones MMIO del Mars Bot: 0xFFFF8000
  lui $s0, 0xffff
  ori $s0, $s0, 0x8000

  li $s1, 1              # estado del rastro
  sw $s1, 0x20($s0)      # dejar rastro activado
  li $t0, 0
  sw $t0, 0x50($s0)      # movimiento desactivado al inicio

  li $v0, 4
  la $a0, intro0
  syscall
  li $v0, 4
  la $a0, intro1
  syscall

command_loop:
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 12
  syscall
  move $t1, $v0

  # q
  li $t2, 113
  beq $t1, $t2, quit

  # t (alternar rastro)
  li $t2, 116
  beq $t1, $t2, toggle_trail

  # x (detener)
  li $t2, 120
  beq $t1, $t2, stop_move

  # w (direccion 0)
  li $t2, 119
  beq $t1, $t2, go_up

  # d (direccion 90)
  li $t2, 100
  beq $t1, $t2, go_right

  # s (direccion 180)
  li $t2, 115
  beq $t1, $t2, go_down

  # a (direccion 270)
  li $t2, 97
  beq $t1, $t2, go_left

  j command_loop

go_up:
  li $t3, 0
  j set_heading

go_right:
  li $t3, 90
  j set_heading

go_down:
  li $t3, 180
  j set_heading

go_left:
  li $t3, 270

set_heading:
  sw $t3, 0x10($s0)
  li $t4, 1
  sw $t4, 0x50($s0)
  j print_position

stop_move:
  li $t4, 0
  sw $t4, 0x50($s0)
  j print_position

toggle_trail:
  xori $s1, $s1, 1
  sw $s1, 0x20($s0)
  beq $s1, $zero, trail_off_msg
  li $v0, 4
  la $a0, trailOn
  syscall
  j print_position

trail_off_msg:
  li $v0, 4
  la $a0, trailOff
  syscall

print_position:
  lw $t5, 0x30($s0)
  lw $t6, 0x40($s0)

  li $v0, 4
  la $a0, posX
  syscall
  li $v0, 1
  move $a0, $t5
  syscall

  li $v0, 4
  la $a0, posY
  syscall
  li $v0, 1
  move $a0, $t6
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  j command_loop

quit:
  li $t4, 0
  sw $t4, 0x50($s0)
  li $v0, 10
  syscall
