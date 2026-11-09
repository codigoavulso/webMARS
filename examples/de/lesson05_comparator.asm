# 05 – Komparator und Zweig
#
# `slt` vergleicht zwei ganze Zahlen mit Vorzeichen und schreibt 1, wenn die erste kleiner ist,
# andernfalls 0.
#
# Für 7 und 12 ist `$t2` 1, sodass `beq` nicht zu `notless` springt und die Ausführung mit der
# nächsten Anweisung fortfährt.
#
# Gehen Sie bei verzögerter Verzweigung über `beq` hinaus und beobachten Sie den PC. Vertauschen
# Sie die beiden Eingabewerte und vergleichen Sie das neue Ziel.

        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #a
        li   $t1, 12            #b
        #slt materialisiert den Vergleich als gewöhnliche Ganzzahl, niemals als versteckte Flags.
        slt  $t2, $t0, $t1      #t2 = 1, wenn a < b
        #Verzweigen Sie nur dann zu notless, wenn das boolesche Ergebnis Null ist.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
