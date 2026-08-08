# ==========================================================
#Lezione 14 - Numeri reali a 32 bit
#
#THE PROBLEM
#3.5 non ha posto in un registro di numeri interi. Da dove viene il
#parte frazionaria e come viene memorizzato un numero molto grande
#negli stessi 32 bit di uno molto piccolo?
#
#WHAT THE HARDWARE DOES
#IEEE-754 divide la parola in tre campi: un bit di segno,
#otto bit esponenti e ventitré bit frazionari. Il
#l'esponente fa scorrere il punto binario, motivo per cui il formato è
#chiamato virgola mobile.
#
#THE SOLUTION
#Un file di registro separato ($f0..$f31) e un sommatore separato
#gestire questi valori, motivo per cui i mnemonici differiscono:
#lwc1 da caricare, add.s da aggiungere, syscall 2 da stampare.
#
#WATCH FOR
#Apri Strumenti > Rappresentazione in virgola mobile e inserisci 3.5.
#Osserva i tre campi, quindi verifica che 4,75 sia esatto -
#a differenza di 0,1, che non ha frazione binaria finita.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        #Gli indirizzi interi individuano comunque i dati; lwc1 sposta i suoi bit in COP1.
        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #nel file di registro FPU.
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #il sommatore FPU

        #Syscall 2 prevede che il suo argomento float sia specifico in $f12.
        mov.s $f12, $f4
        li   $v0, 2             #stampa float
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
