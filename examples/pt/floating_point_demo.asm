# Teste de virgula flutuante para a tool Floating Point Representation
# Escreve padroes IEEE-754 em $f12 e imprime-os como valores float.

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   # padrões de bits IEEE 754 em bruto, não números decimais

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   # ler o padrão de 32 bits como inteiro
  mtc1 $t2, $f12   # mover os mesmos bits para a FPU: não há conversão

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   # a syscall 2 imprime $f12 lido como float
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   # palavra seguinte: cada padrão ocupa quatro bytes
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
