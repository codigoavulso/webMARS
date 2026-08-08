# ==========================================================
#Lektion 02 – Zweierkomplement
#
#THE PROBLEM
#Ein Register besteht aus 32 Drähten, jeweils hoch oder niedrig. Es gibt keinen Draht
#für ein Minuszeichen, aber negative Zahlen müssen funktionieren.
#
#WHAT THE HARDWARE DOES
#Es liest das oberste Bit als Zeichen, aber nicht als separates Flag:
#-n wird als das Bitmuster gespeichert, das, addiert zu n, umgebrochen wird
#Null. Kehren Sie jedes Bit um und fügen Sie eins hinzu, und schon haben Sie es.
#
#THE SOLUTION
#Die Subtraktion benötigt keinen zweiten Schaltkreis. a - b wird
#a + (-b), also bedient ein Addierer beide Operationen.
#
#WATCH FOR
#Beide Hälften geben -5 aus. Der zweite erreicht es auf dem langen Weg,
#mit nor und addi, die zeigen, was sub intern tut.
#Stellen Sie die Werte auf Hexadezimal ein, um 0xFFFFFFFB anzuzeigen.
# ==========================================================
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
