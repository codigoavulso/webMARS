# 03 - Porte logiche su 32 bit
#
# Ciascun bit del risultato dipende solo dai bit corrispondenti dei due operandi. Non c'è
# riporto tra le posizioni dei bit.
#
# Con la maschera `0x0F`, AND mantiene i quattro bit bassi e cancella il resto. OR imposta i
# quattro bit bassi e XOR li capovolge.
#
# Confronta i tre risultati in esadecimale, quindi prova la maschera `0xF0` per lavorare sul
# successivo gruppo di quattro bit.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F maschera

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND cancella ogni posizione in cui la maschera contiene zero.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR alterna solo le posizioni selezionate da quelle nella maschera.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
