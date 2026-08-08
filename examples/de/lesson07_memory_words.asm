# ==========================================================
#Lektion 07 – Wörter im Gedächtnis und warum Adressen um vier springen
#
#THE PROBLEM
#Der Speicher wird jeweils byteweise adressiert, ein Register hält jedoch
#vier Bytes. Was wählt eigentlich eine einzelne Adresse aus?
#
#WHAT THE HARDWARE DOES
#lw und sw verschieben vier Bytes in einem Zugriff, also nacheinander
#Wörter liegen vier Adressen voneinander entfernt. Die unteren zwei Bits des
#Die Adresse muss Null sein: Diese Ausrichtung ermöglicht es dem
#Hardware ruft ein ganzes Wort in einem Zyklus ab.
#
#THE SOLUTION
#Die Adressarithmetik erfolgt in Bytes, also ein Index in Wörtern
#wird immer mit vier skaliert.
#
#WATCH FOR
#Stellen Sie das Datensegment zusammen und öffnen Sie es unter 0x10010000. Die
#Drei Werte erscheinen in benachbarten Spalten einer Zeile.
# ==========================================================
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
