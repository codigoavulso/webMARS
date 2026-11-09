# 10 - La pile
#
# Par convention, la pile croît vers des adresses inférieures. Soustrayez 8 de `$sp` pour
# réserver de l'espace pour deux mots.
#
# Le programme enregistre deux registres avec `sw`, les efface, puis restaure leurs valeurs avec
# `lw`.
#
# Regardez `$sp` avant la réservation, pendant les deux magasins et après la sortie. Sa valeur
# finale doit correspondre à sa valeur initiale.

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
