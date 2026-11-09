# 14 - Reelle Zahlen in 32 Bit
#
# Ein Float mit einfacher Genauigkeit hat ein Vorzeichenbit, acht Exponentenbits und 23
# Bruchbits.
#
# `lwc1` kopiert das Bitmuster in ein Gleitkommaregister. Dann addiert `add.s` 3,5 und 1,25, um
# 4,75 zu ergeben.
#
# Vergleichen Sie die Kodierungen von 4,75 und 0,1 im Gleitkommadarstellung-Tool. 4,75 ist
# genau; 0,1 muss gerundet werden.

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #in die Registerdatei FPU.
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #der FPU-Addierer

        #Syscall 2 erwartet sein Float-Argument speziell in $f12.
        mov.s $f12, $f4
        li   $v0, 2             #Float drucken
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
