# ==========================================================
#Lezione 06 - Un contatore, nel software e nell'hardware
#
#THE PROBLEM
#Un contatore hardware è un registro, un incrementatore e un
#comparatore. Che aspetto ha scritto la stessa macchina
#come istruzioni?
#
#WHAT THE HARDWARE DOES
#Esattamente quelle tre parti, una per istruzione: il registro
#contiene il conteggio, addi è l'incrementatore, slt con un ramo
#è il comparatore che decide un altro round.
#
#THE SOLUTION
#Un ciclo non è un concetto nuovo. È scritta in logica sequenziale
#fuori, con il PC come orologio.
#
#WATCH FOR
#$t0 è il registro di conteggio e $t1 il limite. Passa attraverso
#un giro completo e indicare quale linea è quale parte.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #il registro dei conteggi
        li   $t1, 11            #il limite

loop:
        #Invariante del ciclo: $t0 è il valore successivo da stampare e rimane sotto $t1.
        slt  $t2, $t0, $t1      #comparatore
        beq  $t2, $zero, endl   #esce quando il conteggio raggiunge il limite

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #Aggiornare il contatore prima di saltare garantisce il progresso verso la terminazione.
        addi $t0, $t0, 1        #la sommatrice
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
