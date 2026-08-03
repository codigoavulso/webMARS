#Exemple d'arguments de programme.
#Utilisez cet exemple pour tester la prise en charge d'argc/argv dans MARS.
#Pour l'essayer, allez dans Paramètres > Arguments du programme fournis au programme MIPS,
#entrez quelques arguments, puis assemblez et exécutez le programme.
#Exemples d'arguments : ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #Programme de démonstration pour les arguments du programme.
  #A l'entrée :
  #$a0 = argc
  #$a1 = argument
  move $s0, $a0          #Enregistrez argc.
  move $s1, $a1          #Enregistrez argv.

  #Imprimez argc.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #Boucle sur argv[i].
  li   $t0, 0            #je = 0

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

  #argv est un tableau de pointeurs, donc argv[i] est à argv + i * 4.
  sll  $t1, $t0, 2       #décalage = je * 4
  addu $t2, $s1, $t1     #adresse de argv[i]
  lw   $a0, 0($t2)       #charger argv[i]

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
