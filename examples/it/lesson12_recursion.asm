# 12 - Ricorsione e frames
#
# Una chiamata ricorsiva sovrascrive `$ra` e utilizza `$a0` per il proprio argomento. Salvare
# entrambi i valori prima di effettuare la chiamata.
#
# Entra in `fact` per ogni valore da 5 a 1. Ogni chiamata riserva otto byte, inclusa la chiamata
# che restituisce 1.
#
# Imposta un punto di interruzione su `mul` per osservare il percorso di ritorno. Ogni chiamata
# ricarica il proprio argomento, moltiplica e rilascia il proprio frame.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fatto(int n) ----
fact:
        #Ogni invocazione possiede un frame distinto da otto byte.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #l'indirizzo del mittente di questa chiamata
        sw   $a0, 4($sp)        #questa chiamata è la n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #caso base: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #di nuovo il nostro n
        mul  $v0, $v0, $a0

factend:
        # Ripristina l'indirizzo del mittente salvato prima di rilasciare il frame di questa chiamata.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
