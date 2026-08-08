# ==========================================================
#Lekcja 01 - Rejestry i wartości bezpośrednie
#
#THE PROBLEM
#ALU ma dwa porty wejściowe i oba są podłączone do
#zarejestruj plik. Liczba zapisana w źródle nie występuje w a
#zarejestruj się, więc nie będzie mógł bezpośrednio połączyć się z tymi portami.
#
#WHAT THE HARDWARE DOES
#Natychmiastowe przemieszczanie się wewnątrz samego słowa instrukcji.
#addi zawiera 16-bitowe pole; li to wygoda
#Asembler rozwija się w jedną lub dwie prawdziwe instrukcje.
#
#THE SOLUTION
#Najpierw umieść stałą w rejestrze, a następnie pozwól ALU
#odczytaj dwa rejestry i zapisz trzeci.
#
#WATCH FOR
#Krok raz w każdym wierszu i postępuj zgodnie z $t0, $t1 i $t2 w
#Panel rejestrów. Tylko trzecia linia dotyka ALU.
# ==========================================================
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
        li   $t0, 12            #natychmiast -> zarejestruj się
        li   $t1, 30            #natychmiast -> zarejestruj się
        add  $t2, $t0, $t1      #ALU odczytuje dwa rejestry

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
