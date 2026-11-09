# 01 - Rejestry i natychmiastowe
#
# Bezpośredniość jest zakodowana w instrukcji. Złóż i sprawdź, jaką podstawową instrukcją staje
# się każde `li`.
#
# Przejdź przez dwa obciążenia i dodawanie. W rejestrach podążaj za `$t0 = 12`, `$t1 = 30` i
# `$t2 = 42`.
#
# Spróbuj zamienić 30 na `0x12345678` i złożyć ponownie. Większa stała wymaga więcej niż jednej
# instrukcji podstawowej.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Wywołania systemowe używają $v0 jako selektora usługi i $a0 jako pierwszego argumentu.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li jest pseudoinstrukcją; Assemble pokazuje, jaka staje się prawdziwa instrukcja.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # Suma jest zapisywana do innego rejestru.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
