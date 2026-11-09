# 01 - Registri e immediati
#
# L'immediato è codificato nell'istruzione. Assembla e controlla quale istruzione di base
# diventa ciascuna `li`.
#
# Passa attraverso i due carichi e l'addizione. Nei Registri, segui `$t0 = 12`, `$t1 = 30` e
# `$t2 = 42`.
#
# Prova a sostituire 30 con `0x12345678` e rimonta. La costante più grande necessita di più di
# un'istruzione di base.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Le chiamate di sistema utilizzano $v0 come selettore del servizio e $a0 come primo argomento.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li è una pseudo-istruzione; Assemble mostra quale vera istruzione diventa.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # La somma viene scritta su un registro diverso.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
