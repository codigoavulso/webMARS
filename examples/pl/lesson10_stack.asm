# ==========================================================
#Lekcja 10 – Stos jest rejestrem i offsetem
#
#THE PROBLEM
#Rejestrów jest 32 i są one wspólne dla każdego elementu
#kod. Gdzie idzie wartość, gdy musi przetrwać tę pracę
#będzie ponownie wykorzystywać te rejestry?
#
#WHAT THE HARDWARE DOES
#Nic specjalnego. $sp to zwykły rejestr, który
#zdarza się, że wskazuje na pamięć, a stos rośnie w kierunku
#niższe adresy wyłącznie według konwencji.
#
#THE SOLUTION
#Rezerwowanie miejsca jest odejmowaniem od $sp, zwalnianiem go
#dodatek. Push i pop to po prostu SW i LW.
#
#WATCH FOR
#Rejestry są celowo rozliczane pomiędzy sklepami
#i ładunki, więc wydrukowane wartości mogły dopiero przyjść
#wrócić z pamięci. Zobacz, jak $sp przesuwa się o 8 i z powrotem.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Stos rośnie w dół, więc alokacja odejmuje się od $sp.
        addi $sp, $sp, -8       #zarezerwuj dwa słowa
        sw   $t0, 0($sp)        #pchnij
        sw   $t1, 4($sp)

        li   $t0, 0             #zaśmiecać rejestry
        li   $t1, 0

        lw   $t0, 0($sp)        #pop
        lw   $t1, 4($sp)
        #Każda alokacja musi być zbilansowana, aby osoba wywołująca widziała swoją oryginalną $sp.
        addi $sp, $sp, 8        #zwolnić

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
