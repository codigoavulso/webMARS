# ==========================================================
#Leçon 10 - La pile est un registre et un offset
#
#THE PROBLEM
#Il existe 32 registres et ils sont partagés par chaque élément de
#code. Où va une valeur quand elle doit survivre à un travail qui
#va réutiliser ces registres ?
#
#WHAT THE HARDWARE DOES
#Rien de spécial du tout. $sp est un registre ordinaire qui
#arrive à pointer vers la mémoire, et la pile grandit vers
#adresses inférieures uniquement par convention.
#
#THE SOLUTION
#La réservation d'espace est une soustraction de $sp, en le libérant un
#ajout. Push et pop ne sont que sw et lw.
#
#WATCH FOR
#Les registres sont volontairement effacés entre les magasins
#et les charges, donc les valeurs imprimées ne peuvent provenir que
#revenu de mémoire. Regardez $sp avancer de 8 et revenir.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #La pile croît vers le bas, donc l'allocation soustrait $sp.
        addi $sp, $sp, -8       #réserve deux mots
        sw   $t0, 0($sp)        #pousser
        sw   $t1, 4($sp)

        li   $t0, 0             #encombrer les registres
        li   $t1, 0

        lw   $t0, 0($sp)        #pop
        lw   $t1, 4($sp)
        #Chaque allocation doit être équilibrée afin que l'appelant voie son $sp.
        addi $sp, $sp, 8        #libération

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
