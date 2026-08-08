# ==========================================================
#Lezione 10 - Lo stack è un registro e un offset
#
#THE PROBLEM
#Ci sono 32 registri e sono condivisi da ogni pezzo
#codice. Dove va a finire un valore quando deve sopravvivere a quel lavoro
#riutilizzerà quei registri?
#
#WHAT THE HARDWARE DOES
#Niente di speciale. $sp è un registro ordinario che
#sembra puntare alla memoria e lo stack cresce verso
#indirizzi inferiori per pura convenzione.
#
#THE SOLUTION
#Prenotare spazio è una sottrazione da $sp, rilasciandolo
#aggiunta. Push e pop sono solo sw e lw.
#
#WATCH FOR
#I registri vengono deliberatamente cancellati tra i negozi
#e i carichi, quindi i valori stampati possono solo essere arrivati
#tornato dalla memoria. Guarda $sp muoversi di 8 e indietro.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Lo stack cresce verso il basso, quindi l'allocazione viene sottratta da $sp.
        addi $sp, $sp, -8       #riserva due parole
        sw   $t0, 0($sp)        #spingere
        sw   $t1, 4($sp)

        li   $t0, 0             #intasare i registri
        li   $t1, 0

        lw   $t0, 0($sp)        #pop
        lw   $t1, 4($sp)
        #Ogni allocazione deve essere bilanciata in modo che il chiamante veda il suo $sp originale.
        addi $sp, $sp, 8        #rilascio

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
