# 06 - Loop come contatore
#
# `$t0` è il numero successivo da stampare. `$t1` è il limite superiore esclusivo, quindi un
# limite di 11 stampa da 1 a 10.
#
# Il confronto viene eseguito prima di ogni iterazione. L'incremento avanza verso il limite e il
# salto ripete il controllo.
#
# Cambia il limite a 1 e corri. Il ramo di uscita viene preso prima della prima stampa.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #il registro dei conteggi
        li   $t1, 11            #il limite

loop:
        # Al loop test, $t0 è il candidato successivo. Stampalo solo se è inferiore a $t1.
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
