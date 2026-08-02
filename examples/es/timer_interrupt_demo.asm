# Demostracion de interrupciones del System Clock de webMARS
# Abre Herramientas > System Clock and Timer, conecta a MIPS, ensambla y ejecuta.
# Un temporizador simulado y determinista interrumpe cada 200 instrucciones.

.eqv CLOCK_CONTROL 0xffff0050   # los registros del dispositivo viven en el bloque MMIO
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Interrupciones del temporizador atendidas: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   # periodo medido en instrucciones ejecutadas, así la ejecución se repite igual
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   # el bit 0 arranca el temporizador, el bit 1 le permite generar interrupciones
  sw $t1, 0($t0)
esperar:
  lw $t2, ticks   # main nunca llama al manejador: la CPU salta allí por su cuenta
  blt $t2, 5, esperar
  nop
  sw $zero, 0($t0)   # detener el temporizador antes de terminar
  li $v0, 4
  la $a0, message
  syscall
  li $v0, 1
  move $a0, $t2
  syscall
  li $v0, 11
  li $a0, 10
  syscall
  li $v0, 10
  syscall
.ktext 0x80000180
manejador:
  mfc0 $k0, $13
  andi $k0, $k0, 0x0400
  beq $k0, $zero, terminar_manejador
  nop
  la $k1, ticks
  lw $k0, 0($k1)
  addiu $k0, $k0, 1
  sw $k0, 0($k1)
terminar_manejador:
  eret
