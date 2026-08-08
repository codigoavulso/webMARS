# ==========================================================
#Lezione 15 - Perché il passo cambia la velocità
#
#THE PROBLEM
#I due cicli seguenti leggono lo stesso array ed eseguono lo stesso
#numero di carichi. Su una macchina reale uno è molto più lento. Il
#il conteggio delle istruzioni non può spiegarlo.
#
#WHAT THE HARDWARE DOES
#La memoria non fornisce singole parole. Una mancanza vale un intero
#bloccare, scommettendo che le parole vicine saranno presto richieste.
#Un passo avanti raccoglie quella scommessa; una falcata di sedici paga
#per un blocco e ne legge una parola.
#
#THE SOLUTION
#Non cambia nulla nel codice. La località è di proprietà di
#modello di accesso, ed è il modello che deve essere corretto.
#
#WATCH FOR
#Apri Strumenti > Simulatore cache dati, premi Connetti a MIPS,
#poi corri. Confronta il tasso di successo dei due loop. Entrambe le somme
#stampa 0 perché l'array è azzerato: il numero non è il
#punto qui, il tasso di successo è.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
#---- ogni parola di ogni blocco ----
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Gli indici sequenziali riutilizzano le parole di ciascun blocco della cache prima di proseguire.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

#---- una parola per blocco, sedici parole di distanza ----
        li   $t1, 0
        li   $t3, 0
far:
        #Aggiungendo 16 skip da 64 byte per iterazione: comunemente un intero blocco di cache.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
