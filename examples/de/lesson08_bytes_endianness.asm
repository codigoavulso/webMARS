# ==========================================================
#Lektion 08 – Bytes in einem Wort und Bytereihenfolge
#
#THE PROBLEM
#Ein Wort belegt vier Adressen. Welches Byte hat den niedrigsten Wert?
#der Name dieser Adressen?
#
#WHAT THE HARDWARE DOES
#Bei dieser Wahl handelt es sich um die Byte-Reihenfolge und es handelt sich um eine getroffene Verdrahtungsentscheidung
#einmal für die ganze Maschine. MIPS hier ist Little-Endian: das
#Das niedrigstwertige Byte befindet sich an der niedrigsten Adresse.
#
#THE SOLUTION
#Speichern Sie ein Wort, lesen Sie es dann Byte für Byte zurück und lassen Sie es los
#Die Bestellung beantwortet die Frage für Sie.
#
#WATCH FOR
#0x04030201 kommt als 1 2 3 4 zurück. Das zuletzt geschriebene Byte
#das Literal wird zuerst gelesen. lbu wird anstelle von lb verwendet, also a
#Byte über 127 wird nicht vorzeichenerweitert.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #Byte 01 ist am wenigsten signifikant
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #Byte-Offset
bloop:
        #Die Schleife besucht die Offsets 0, 1, 2 und 3 im gespeicherten Wort.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Effektive Adresse = Basisadresse + aktueller Byte-Offset.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #vorzeichenloses Byte
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
