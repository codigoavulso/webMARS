# 02 - Zweierkomplement
#
# Im 32-Bit-Zweierkomplement ergibt die Invertierung der Bits von 5 und die Addition von 1 die
# Darstellung von -5.
#
# Das Programm berechnet denselben Wert auf zwei Arten: `sub` von Null, dann `nor` und `addi`.
#
# Beide Pfade geben -5 aus. Überprüfen Sie `0xFFFFFFFB` in den Registern, um zu sehen, wie
# dieselben Bits im Hexadezimalformat aussehen.

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #Das Subtrahieren von Null bildet die additive Umkehrung ohne Minuszeichenbit.
        li   $t0, 5
        sub  $t1, $zero, $t0    #Der Addierer erledigt die Arbeit
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #noch mit $zero ist bitweise NOT; Das Addieren von Eins vervollständigt das Zweierkomplement.
        nor  $t2, $t0, $zero    #alle Bits invertieren
        addi $t2, $t2, 1        #füge eins hinzu
        move $a0, $t2           #gleicher Wert wie oben
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
