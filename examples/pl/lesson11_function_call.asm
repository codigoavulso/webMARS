# ==========================================================
#Lekcja 11 - Wywołanie funkcji
#
#THE PROBLEM
#Wpadnięcie w rutynę jest łatwe. Powrót nie jest, ponieważ
#tę samą procedurę można wywołać z wielu miejsc i
#Adres zwrotny jest za każdym razem inny.
#
#WHAT THE HARDWARE DOES
#jal robi dwie rzeczy w jednej instrukcji: przechowuje plik
#adres poniższej instrukcji w $ra, a następnie wykonuje skoki. junior
#przeskakuje do tego, co zawiera rejestr, więc jr $ra wraca.
#
#THE SOLUTION
#Wszystko inne to zgoda, a nie obwody: argumenty
#$a0..$a3, daje w wyniku $v0. Złam konwencję i kod
#nadal się składa - po prostu przestaje współpracować.
#
#WATCH FOR
#Wejdź na słoik i przeczytaj $ra. Porównaj to z adresem
#linii po wywołaniu w segmencie tekstowym.
# ==========================================================
        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #pierwszy argument
        li   $a1, 42            #drugi argument
        #jal zmienia zarówno przepływ sterowania, jak i $ra w jednej operacji architektonicznej.
        jal  maxof              #$ra = adres następnej linii

        move $a0, $v0           #wynik wrócił w $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof jest funkcją liścia, więc może powrócić bez zapisywania $ra na stosie.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
