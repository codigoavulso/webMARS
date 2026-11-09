# 04 - Turni e potenze di due
#
# Uno spostamento a sinistra di 3 si moltiplica per 8 quando il risultato si adatta. I bit
# spostati oltre il bordo vengono scartati.
#
# A destra, `srl` si riempie con zeri e `sra` copia il bit del segno. Per -16 spostato di 2, si
# aspettano rispettivamente 1073741820 e -4.
#
# Prova -15 con `sra`. Il risultato è -4 perché lo spostamento viene arrotondato per difetto;
# arrotondamenti della divisione con segno verso lo zero.

        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #Tre spostamenti a sinistra si moltiplicano per 2^3 mantenendo solo 32 bit di risultato.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #Confronta $t3 e $t4 in esadecimale per vedere i diversi bit in entrata.
        sra  $t3, $t2, 2        #segno conservato: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #gli zeri si sono spostati: enormemente positivo
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
