# ==========================================================
#Lektion 04 – Verschiebungen oder Multiplikation mit Drähten
#
#THE PROBLEM
#Ein allgemeiner Multiplikator ist einer der teuersten Blöcke überhaupt
#ein Datenpfad. Die Multiplikation mit 8 sollte nicht so viel kosten.
#
#WHAT THE HARDWARE DOES
#Eine Verschiebung ist überhaupt keine Arithmetik: Es werden dieselben Bits gelesen
#aus verschiedenen Drähten. Eine Verschiebung um n nach links multipliziert mit 2^n
#und kostet nur Routing.
#
#THE SOLUTION
#Zweierpotenzen werden zu Verschiebungen. Beachten Sie die beiden Rechtsverschiebungen: srl
#Füttert oben Nullen ein, sra kopiert das Vorzeichenbit, also nur
#sra dividiert eine negative Zahl richtig.
#
#WATCH FOR
#-16 >> 2 ergibt -4 bei SRA, aber ein großes Plus bei Srl. Die
#Bits bewegten sich identisch; Nur was oben eingegeben wird, unterscheidet sich.
# ==========================================================
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
        #Drei Linksverschiebungen multiplizieren mit 2^3 und behalten dabei nur 32 Ergebnisbits bei.
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
        #Vergleichen Sie $t3 und $t4 im Hexadezimalformat, um die verschiedenen eingehenden Bits zu sehen.
        sra  $t3, $t2, 2        #Vorzeichen erhalten: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #Nullen verschoben: enorm positiv
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
