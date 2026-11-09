# 03 – Logikgatter über 32 Bit
#
# Jedes Ergebnisbit hängt nur von den entsprechenden Bits der beiden Operanden ab. Es gibt
# keinen Übertrag zwischen Bitpositionen.
#
# Mit der Maske `0x0F` behält AND die unteren vier Bits und löscht den Rest. OR setzt die
# unteren vier Bits und XOR dreht sie um.
#
# Vergleichen Sie die drei Ergebnisse im Hexadezimalformat und versuchen Sie es dann mit der
# Maske `0xF0`, um die nächste Gruppe von vier Bits zu bearbeiten.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F Maske

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND löscht jede Position, an der die Maske Null enthält.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR schaltet nur die Positionen um, die von Einsen in der Maske ausgewählt wurden.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
