# 02 - Complemento a due
#
# Nel complemento a due a 32 bit, invertendo i bit di 5 e aggiungendo 1 si produce la
# rappresentazione di -5.
#
# Il programma calcola lo stesso valore in due modi: `sub` da zero, quindi `nor` e `addi`.
#
# Entrambi i percorsi stampano -5. Ispeziona `0xFFFFFFFB` nei registri per vedere come appaiono
# gli stessi bit in esadecimale.

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #Sottraendo da zero si forma l'inverso additivo senza bit di segno meno.
        li   $t0, 5
        sub  $t1, $zero, $t0    #il sommatore fa il lavoro
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #né con $zero è bit per bit NOT; aggiungendo uno si completa il complemento a due.
        nor  $t2, $t0, $zero    #invertire tutti i bit
        addi $t2, $t2, 1        #aggiungine uno
        move $a0, $t2           #stesso valore di cui sopra
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
