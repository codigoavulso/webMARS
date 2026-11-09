# 10 - La pila
#
# Per convenzione lo stack cresce verso gli indirizzi più bassi. Sottrai 8 da `$sp` per
# riservare spazio a due parole.
#
# Il programma salva due registri con `sw`, li cancella, quindi ripristina i loro valori con
# `lw`.
#
# Guarda `$sp` prima della prenotazione, durante i due negozi e dopo l'uscita. Il suo valore
# finale dovrebbe corrispondere al suo valore iniziale.

        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Lo stack cresce verso il basso, quindi l'allocazione viene sottratta da $sp.
        addi $sp, $sp, -8       #riserva due parole
        sw   $t0, 0($sp)        #spingere
        sw   $t1, 4($sp)

        li   $t0, 0             #intasare i registri
        li   $t1, 0

        lw   $t0, 0($sp)        #pop
        lw   $t1, 4($sp)
        #Ogni allocazione deve essere bilanciata in modo che il chiamante veda il suo $sp originale.
        addi $sp, $sp, 8        #rilascio

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
