# ==========================================================
#Lektion 03 – Logikgatter über 32 Bit
#
#THE PROBLEM
#AND, OR und XOR sind Ein-Bit-Gatter. Ein Register enthält 32 Bit.
#Was bedeutet ein Tor bei dieser Breite?
#
#WHAT THE HARDWARE DOES
#Es liegen 32 Exemplare des Tores nebeneinander. Bit 0 des
#Das Ergebnis hängt nur von Bit 0 jedes Operanden ab, Bit 1 nur von
#Bit 1 und so weiter. Zwischen ihnen gibt es keine Tragefahrten.
#
#THE SOLUTION
#Diese Unabhängigkeit macht eine Maske aus: Wählen Sie welche
#   Dinge, die man behalten sollte AND, mit ODER auf Eins zwingen, mit umdrehen XOR.
#
#WATCH FOR
#0xCC ist 11001100 und die Maske 0x0F ist 00001111. AND bleibt bestehen
#die unteren vier Bits, OR setzt sie, XOR dreht sie um. Nur die
#Low Nibble ändert sich ständig.
# ==========================================================
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
