# 15 – Warum der Schritt die Geschwindigkeit verändert
#
# Beide Schleifen verwenden dasselbe Array. Der erste liest alle 256 Wörter; Der zweite liest
# jedes 16. Wort und führt nur 16 Ladevorgänge durch.
#
# Mit Cache-Blöcken von 16 Wörtern können sequentielle Lesevorgänge jeden abgerufenen Block
# wiederverwenden. Die zweite Schleife geht bei jedem Ladevorgang zu einem neuen Block weiter.
#
# Verbinden Sie den Simulator mit MIPS, aktivieren Sie „Aktiviert“ und wählen Sie 16 Wörter pro Block.
# Verwenden Sie Daten-Cache-Simulator mit einem Haltepunkt bei `far`, um die erste Schleife zu
# überprüfen. Setzen Sie dort die Cache-Statistiken zurück, bevor Sie die zweite Schleife
# ausführen, und vergleichen Sie die Trefferquoten.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Sequentielle Passage: alle 256 Wörter.
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Sequentielle Indizes verwenden Wörter aus jedem Cache-Block erneut, bevor sie fortfahren.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# Geschrittener Durchgang: eine Ladung alle sechzehn Wörter.
        li   $t1, 0
        li   $t3, 0
far:
        # Die nächste Adresse ist 64 Bytes entfernt: sechzehn Wörter zu je vier Bytes.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
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
