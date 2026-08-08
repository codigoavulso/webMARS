# ==========================================================
#Lekcja 08 – Bajty w słowie i kolejność bajtów
#
#THE PROBLEM
#Słowo zajmuje cztery adresy. Który bajt ma najniższą wartość
#z tych adresów nazwa?
#
#WHAT THE HARDWARE DOES
#Wybór ten zależy od kolejności bajtów i jest podjętą decyzją o okablowaniu
#raz na całą maszynę. MIPS tutaj jest mały endian: the
#najmniej znaczący bajt znajduje się pod najniższym adresem.
#
#THE SOLUTION
#Zapisz jedno słowo, a następnie odczytaj je po bajcie i pozwól
#zamówienie odpowie na pytanie za Ciebie.
#
#WATCH FOR
#0x04030201 zwraca wartość 1 2 3 4. Ostatni zapisany bajt w
#najpierw czyta się dosłowność. Używa się lbu zamiast lb, więc a
#bajt powyżej 127 nie jest rozszerzony znakiem.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #bajt 01 jest najmniej znaczący
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #przesunięcie bajtu
bloop:
        #Pętla odwiedza przesunięcia 0, 1, 2 i 3 wewnątrz zapisanego słowa.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Adres efektywny = adres bazowy + bieżące przesunięcie bajtu.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #niepodpisany bajt
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
