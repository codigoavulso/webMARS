# 07 - Parole in memoria
#
# Gli indirizzi di memoria contano i byte. Ogni parola occupa quattro byte, quindi `lw` e `sw`
# utilizzano qui gli offset 0, 4 e 8.
#
# Un indirizzo di parola deve essere un multiplo di quattro. L'utilizzo dell'offset 1 anziché 4
# provoca un'eccezione di allineamento in questo programma.
#
# Dopo i negozi, guarda `cell` nel segmento dati. Le tre parole adiacenti dovrebbero contenere
# 111, 222 e 333.

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
