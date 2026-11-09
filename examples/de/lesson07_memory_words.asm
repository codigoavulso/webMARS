# 07 – Worte im Gedächtnis
#
# Speicheradressen zählen Bytes. Jedes Wort belegt vier Bytes, daher verwenden `lw` und `sw`
# hier die Offsets 0, 4 und 8.
#
# Eine Wortadresse muss ein Vielfaches von vier sein. Die Verwendung von Offset 1 anstelle von 4
# führt in diesem Programm zu einer Ausrichtungsausnahme.
#
# Schauen Sie sich nach den Geschäften `cell` im Datensegment an. Die drei benachbarten Wörter
# sollten 111, 222 und 333 enthalten.

        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #Basisadresse

        #Jeder Offset unten ist relativ zu $t0 und bleibt wortorientiert.
        li   $t1, 111
        sw   $t1, 0($t0)        #erstes Wort
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 Bytes = nächstes Wort
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 Bytes

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw rekonstruiert dieselben 32-Bit-Werte, die zuvor von sw geschrieben wurden.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
