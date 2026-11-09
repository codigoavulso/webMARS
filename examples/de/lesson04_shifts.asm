# 04 - Verschiebungen und Zweierpotenzen
#
# Eine Linksverschiebung um 3 multipliziert sich mit 8, wenn das Ergebnis passt. Über die Kante
# hinaus verschobene Bits werden verworfen.
#
# Rechts füllt `srl` mit Nullen und `sra` kopiert das Vorzeichenbit. Erwarten Sie für -16,
# verschoben um 2, 1073741820 bzw. -4.
#
# Versuchen Sie es mit -15 mit `sra`. Das Ergebnis ist -4, da die Verschiebung abrundet;
# vorzeichenbehaftete Division rundet gegen Null.

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
