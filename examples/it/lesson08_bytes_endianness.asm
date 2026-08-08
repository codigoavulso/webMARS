# ==========================================================
#Lezione 08 - Byte all'interno di una parola e ordine dei byte
#
#THE PROBLEM
#Una parola occupa quattro indirizzi. Quale byte fa il più basso
#nome di questi indirizzi?
#
#WHAT THE HARDWARE DOES
#Questa scelta riguarda l'ordine dei byte ed è una decisione di cablaggio presa
#una volta per l'intera macchina. MIPS ecco little-endian: the
#il byte meno significativo risiede nell'indirizzo più basso.
#
#THE SOLUTION
#Memorizza una parola, quindi rileggila un byte alla volta e lasciala
#l'ordine risponde alla domanda per te.
#
#WATCH FOR
#0x04030201 ritorna come 1 2 3 4. Il byte scritto per ultimo in
#il letterale viene letto per primo. viene utilizzato lbu anziché lb, quindi a
#il byte superiore a 127 non è con estensione del segno.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #il byte 01 è il meno significativo
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #spostamento di byte
bloop:
        #Il ciclo visita gli offset 0, 1, 2 e 3 all'interno della parola memorizzata.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Indirizzo effettivo = indirizzo base + offset byte corrente.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #byte senza segno
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
