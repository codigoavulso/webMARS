# ==========================================================
#Lezione 07 - Parole in memoria e perché gli indirizzi saltano di quattro
#
#THE PROBLEM
#La memoria viene indirizzata un byte alla volta, ma mantiene un registro
#quattro byte. Cosa seleziona effettivamente un singolo indirizzo?
#
#WHAT THE HARDWARE DOES
#lw e sw spostano quattro byte in un accesso, quindi consecutivi
#le parole si trovano a quattro indirizzi di distanza. I due bit bassi di
#l'indirizzo deve essere zero: quell'allineamento è ciò che consente a
#l'hardware recupera un'intera parola in un ciclo.
#
#THE SOLUTION
#L'aritmetica degli indirizzi viene eseguita in byte, quindi un indice in parole
#è sempre scalato per quattro.
#
#WATCH FOR
#Assembla, quindi apri il segmento dati in 0x10010000. Il
#vengono visualizzati tre valori in colonne adiacenti di una riga.
# ==========================================================
        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #indirizzo di base

        #Ogni offset riportato di seguito è relativo a $t0 e rimane allineato alla parola.
        li   $t1, 111
        sw   $t1, 0($t0)        #prima parola
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 byte = parola successiva
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 byte

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw ricostruisce gli stessi valori a 32 bit precedentemente scritti da sw.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
