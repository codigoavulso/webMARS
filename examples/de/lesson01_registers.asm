# 01 – Register und Sofortnachrichten
#
# Das Unmittelbare ist in der Anweisung kodiert. Bauen Sie zusammen und prüfen Sie, zu welcher
# Grundanweisung jedes `li` wird.
#
# Gehen Sie die beiden Ladungen und die Addition schrittweise durch. Folgen Sie in Registern
# `$t0 = 12`, `$t1 = 30` und `$t2 = 42`.
#
# Versuchen Sie, 30 durch `0x12345678` zu ersetzen, und bauen Sie es erneut zusammen. Die
# größere Konstante benötigt mehr als eine Grundanweisung.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Systemaufrufe verwenden $v0 als Dienstselektor und $a0 als erstes Argument.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li ist eine Pseudoanweisung; Assemble zeigt, um welche echte Anweisung es sich handelt.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # Die Summe wird in ein anderes Register geschrieben.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
