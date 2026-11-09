# 14 - Numeri reali a 32 bit
#
# Un float a precisione singola ha un bit di segno, otto bit di esponente e 23 bit di frazione.
#
# `lwc1` copia la sequenza di bit in un registro a virgola mobile. Quindi `add.s` aggiunge 3,5 e
# 1,25 per produrre 4,75.
#
# Confronta le codifiche di 4.75 e 0.1 nello strumento Rappresentazione in virgola mobile. 4,75
# è esatto; 0,1 necessita di arrotondamento.

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #nel file di registro FPU.
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #il sommatore FPU

        #Syscall 2 prevede che il suo argomento float sia specifico in $f12.
        mov.s $f12, $f4
        li   $v0, 2             #stampa float
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
