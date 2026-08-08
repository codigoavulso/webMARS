# ==========================================================
#Lekcja 02 - Dopełnienie do dwójki
#
#THE PROBLEM
#Rejestr składa się z 32 przewodów, każdy wysoki lub niski. Nie ma drutu
#dla znaku minus, ale liczby ujemne muszą działać.
#
#WHAT THE HARDWARE DOES
#Odczytuje górny bit jako znak, ale nie jako osobną flagę:
#-n jest przechowywane jako wzór bitowy, który dodany do n jest zawijany
#zero. Odwróć każdy bit i dodaj jeden i masz to.
#
#THE SOLUTION
#Odejmowanie nie wymaga drugiego obwodu. a - b staje się
#a + (-b), więc jeden sumator obsługuje obie operacje.
#
#WATCH FOR
#Obie połówki drukują -5. Drugi dociera do niego długą drogą,
#z nor i addi, pokazujące, co sub robi wewnętrznie.
#Ustaw Wartości na szesnastkowe, aby zobaczyć 0xFFFFFFFB.
# ==========================================================
        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #Odejmowanie od zera tworzy odwrotność dodatku bez bitu znaku minus.
        li   $t0, 5
        sub  $t1, $zero, $t0    #dodatek robi robotę
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #ani z $zero jest bitowe NOT; dodanie jednego kończy uzupełnienie dwóch.
        nor  $t2, $t0, $zero    #odwróć wszystkie bity
        addi $t2, $t2, 1        #dodaj jedno
        move $a0, $t2           #taką samą wartość jak powyżej
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
