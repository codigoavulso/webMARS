#Exemple multi-fichiers : module principal
#Gardez ce fichier actif et appuyez sur Assembler.
#Les directives .include ci-dessous récupèrent les deux autres fichiers.
#- parity.asm renvoie un message indiquant si le nombre est pair ou impair
#- prime.asm renvoie 1 dans $v0 lorsque le nombre est premier
#
#Flux :
#1. Demandez un nombre dans [1 100], ou 0 pour quitter
#2. Imprimez si le nombre est pair ou impair
#3. Imprimez si le nombre est premier
#4. Répétez

.data
#Ce module possède des chaînes destinées à l'utilisateur ; Les modules d'assistance possèdent leurs données/codes privés.
title:         .asciiz "\n=== Multi-file number analyzer ===\n"
hint:          .asciiz "This example uses 3 separate files assembled together.\n"
prompt:        .asciiz "Enter a number [1..100] (0 to exit): "
invalid_msg:   .asciiz "Please enter a value between 1 and 100.\n"
result_prefix: .asciiz "Number "
parity_prefix: .asciiz " is "
prime_yes_msg: .asciiz " and it is prime.\n"
prime_no_msg:  .asciiz " and it is not prime.\n"
goodbye_msg:   .asciiz "Bye!\n"

.text
.globl main
main:
  li $v0, 4
  la $a0, title
  syscall

  li $v0, 4
  la $a0, hint
  syscall

input_loop:
  #Syscall 5 renvoie l'entier saisi dans $v0.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #Validez les limites inférieures et supérieures avec des comparaisons signées.
  slti $t0, $s0, 1
  bne $t0, $zero, invalid_input
  nop

  slti $t0, $s0, 101
  beq $t0, $zero, invalid_input
  nop

  li $v0, 4
  la $a0, result_prefix
  syscall

  li $v0, 1
  #Convention d'appel o32 : argument dans $a0, pointeur de résultat dans $v0.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #Le deuxième module renvoie un booléen dans $v0.
  move $a0, $s0
  jal get_parity_message
  nop

  move $s1, $v0
  li $v0, 4
  move $a0, $s1
  syscall

  move $a0, $s0
  jal is_prime
  nop

  bne $v0, $zero, print_prime_yes
  nop

  li $v0, 4
  la $a0, prime_no_msg
  syscall
  j input_loop
  nop

print_prime_yes:
  li $v0, 4
  la $a0, prime_yes_msg
  syscall
  j input_loop
  nop

invalid_input:
  li $v0, 4
  la $a0, invalid_msg
  syscall
  j input_loop
  nop

exit_program:
  li $v0, 4
  la $a0, goodbye_msg
  syscall

  li $v0, 10
  syscall

#Les inclusions sont résolues à partir des fichiers du projet lors de l'assemblage.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
