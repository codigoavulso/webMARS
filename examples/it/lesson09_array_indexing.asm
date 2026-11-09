# 09 - Indicizzazione di un array
#
# Ogni elemento dell'array occupa quattro byte. Sposta l'indice a sinistra di due per calcolare
# il suo offset in byte.
#
# Segui la sequenza `sll`, `add`, `lw`: scala l'indice, aggiungi l'indirizzo di base e carica
# l'elemento.
#
# All'indice 2, `$t5` è 8 e `$t6` punta al valore 30. La somma dei cinque elementi dà 150.

        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #base
        li   $t1, 0             #io
        li   $t2, 5             #lunghezza
        li   $t3, 0             #accumulatore

sum:
        #Invariante del ciclo: $t3 è la somma di arr[0] fino a arr[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #i*4 byte
        add  $t6, $t0, $t5      #base + indice scalato
        #$t6 ora nomina esattamente un elemento; lw recupera il suo valore a 32 bit.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
