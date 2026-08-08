# ==========================================================
#Lezione 12 - La ricorsione necessita di un frame per chiamata
#
#THE PROBLEM
#Una chiamata ricorsiva sovrascrive $ra e il registro degli argomenti.
#La chiamata esterna quindi non ha via di ritorno e non ha idea di cosa sia
#proprio n era.
#
#WHAT THE HARDWARE DOES
#Fornisce un $ra, non uno stack di essi. Niente viene salvato
#automaticamente; se il codice non lo salva, non c'è più.
#
#THE SOLUTION
#Ogni attivazione apre un frame in pila, mantiene quello che contiene
#sarà ancora necessario dopo la chiamata e lo ripristinerà durante il percorso
#fuori. La profondità dello stack è la profondità di ricorsione.
#
#WATCH FOR
#Imposta un punto di interruzione sul mul e guarda $sp scendere di 8 per
#livello. Le cinque copie salvate di n sono ciò che rende il file
#possibile la moltiplicazione al ritorno.
# ==========================================================
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
        #Ripristina lo stato del chiamato ed elimina esattamente il frame assegnato all'ingresso.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
