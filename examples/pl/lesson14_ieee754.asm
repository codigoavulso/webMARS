# 14 - Liczby rzeczywiste w 32 bitach
#
# Liczba zmiennoprzecinkowa o pojedynczej precyzji ma jeden bit znaku, osiem bitów wykładnika i
# 23 bity ułamkowe.
#
# `lwc1` kopiuje wzór bitowy do rejestru zmiennoprzecinkowego. Następnie `add.s` dodaje 3,5 i
# 1,25, aby otrzymać 4,75.
#
# Porównaj kodowanie 4,75 i 0,1 w narzędziu Reprezentacja zmiennoprzecinkowa. 4,75 jest
# dokładne; 0,1 wymaga zaokrąglenia.

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
        lwc1 $f0, 0($t0)        #do pliku rejestru FPU.
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #dodatek FPU.

        #Syscall 2 oczekuje swojego argumentu float konkretnie w $f12.
        mov.s $f12, $f4
        li   $v0, 2             #wydrukuj pływak
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
