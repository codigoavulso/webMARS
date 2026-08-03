# ==========================================================
#Leçon 12 - La récursivité a besoin d'une image par appel
#
#THE PROBLEM
#Un appel récursif écrase $ra et le registre des arguments.
#L'appel extérieur n'a alors aucun moyen de revenir en arrière et aucune idée de ce que c'est.
#propre n était.
#
#WHAT THE HARDWARE DOES
#Il fournit un $ra, pas une pile d'entre eux. Rien n'est sauvegardé
#automatiquement ; si le code ne le sauvegarde pas, il disparaît.
#
#THE SOLUTION
#Chaque activation ouvre un cadre sur la pile, conserve ce qu'il
#sera encore nécessaire après l'appel, et le restaure en cours de route
#dehors. La profondeur de pile est la profondeur de récursion.
#
#WATCH FOR
#Définissez un point d'arrêt sur le mul et regardez $sp descendre de 8 par
#niveau. Les cinq copies enregistrées de n sont ce qui rend le
#multiplication au retour possible.
# ==========================================================
        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fait(int n) ----
fact:
        #Chaque appel possède une trame distincte de huit octets.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #l'adresse de retour de cet appel
        sw   $a0, 4($sp)        #cet appel est n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #cas de base : 0 ! = 1 ! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1) !
        lw   $a0, 4($sp)        #notre n encore
        mul  $v0, $v0, $a0

factend:
        #Restaurez l’état de l’appelé et supprimez exactement la trame allouée à l’entrée.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
