# 06 – Schleife als Zähler
#
# `$t0` ist die nächste zu druckende Zahl. `$t1` ist die ausschließliche Obergrenze, d. h. eine
# Grenze von 11 druckt 1 bis 10.
#
# Der Vergleich wird vor jeder Iteration ausgeführt. Das Inkrement schreitet in Richtung des
# Grenzwerts voran und der Sprung wiederholt die Prüfung.
#
# Ändern Sie das Limit auf 1 und führen Sie es aus. Der Ausgangszweig wird vor dem ersten Druck
# genommen.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #das Zählregister
        li   $t1, 11            #die Grenze

loop:
        # Beim Schleifentest ist $t0 der nächste Kandidat. Drucken Sie es nur aus, wenn es unter $t1 liegt.
        slt  $t2, $t0, $t1      #Komparator
        beq  $t2, $zero, endl   #Beenden, wenn die Anzahl den Grenzwert erreicht

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #Das Aktualisieren des Zählers vor dem Springen garantiert den Fortschritt in Richtung Beendigung.
        addi $t0, $t0, 1        #der Addierer
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
