# 05 - Comparatore e ramo
#
# `slt` confronta due interi con segno e scrive 1 quando il primo è più piccolo, o 0 altrimenti.
#
# Per 7 e 12, `$t2` è 1, quindi `beq` non salta a `notless` e l'esecuzione continua con
# l'istruzione successiva.
#
# Con la diramazione ritardata, supera `beq` e osserva il PC. Scambia i due valori di input e
# confronta la nuova destinazione.

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
