# 08 – Bytes und Bytereihenfolge
#
# Im Little-Endian-Speicher dieses Simulators befindet sich das niedrigstwertige Byte eines
# Wortes an der niedrigsten Adresse.
#
# Speichern Sie `0x04030201` als Wort und lesen Sie die Offsets 0 bis 3 als Bytes. Die Ausgabe
# ist 1, 2, 3, 4.
#
# Versuchen Sie es mit einem Low-Byte von `0xFF`. Eine vorzeichenlose Last mit `lbu` ergibt 255,
# während eine vorzeichenbehaftete Last mit `lb` -1 ergibt.

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
