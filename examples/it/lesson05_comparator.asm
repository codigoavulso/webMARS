# ==========================================================
#Lezione 05 - Il comparatore e il ramo
#
#THE PROBLEM
#Una decisione richiede un bit, ma confrontando due numeri a 32 bit
#è una sottrazione. Come fa una sottrazione a diventare una scelta?
#
#WHAT THE HARDWARE DOES
#slt sottrae e butta via tutto tranne il segno,
#scrivendo 0 o 1. Il ramo quindi invia quel bit al PC
#logica, che aggiunge un offset o consente al PC di avanzare.
#
#THE SOLUTION
#Confronta in un registro, dirama su quel registro. Controllo
#il flusso è aritmetico più un multiplexer sul PC.
#
#WATCH FOR
#Dopo slt, $t2 tiene 1. Passa oltre il beq e guarda il PC
#nella barra di stato: salta anziché avanzare di quattro.
# ==========================================================
        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #un
        li   $t1, 12            #b
        #slt materializza il confronto come un numero intero ordinario, mai come flag nascosti.
        slt  $t2, $t0, $t1      #t2 = 1 se a < b
        #Passa a notless solo quando il risultato booleano è zero.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
