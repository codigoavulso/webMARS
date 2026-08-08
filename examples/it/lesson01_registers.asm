# ==========================================================
#Lezione 01 - Registri e valori immediati
#
#THE PROBLEM
#Il ALU ha due porte di ingresso ed entrambe sono collegate a
#registro. Un numero scritto nella fonte non è in a
#registrarsi, quindi non può raggiungere direttamente quelle porte.
#
#WHAT THE HARDWARE DOES
#Un immediato viaggia all'interno della parola istruzione stessa.
#addi trasporta un campo a 16 bit; li è una comodità il
#l'assembler si espande in una o due istruzioni reali.
#
#THE SOLUTION
#Inserisci prima la costante in un registro, quindi lascia che ALU
#leggere due registri e scriverne un terzo.
#
#WATCH FOR
#Passare una volta per riga e seguire $t0, $t1 e $t2 nella
#Pannello Registri. Solo la terza riga tocca ALU.
# ==========================================================
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
        li   $t0, 12            #immediato -> registrati
        li   $t1, 30            #immediato -> registrati
        add  $t2, $t0, $t1      #ALU legge due registri

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
