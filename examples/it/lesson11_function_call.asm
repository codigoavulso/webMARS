# ==========================================================
#Lezione 11 - Chiamare una funzione
#
#THE PROBLEM
#Entrare in una routine è facile. Tornare indietro non lo è, perché
#la stessa routine può essere chiamata da molti posti e il
#l'indirizzo di ritorno è diverso ogni volta.
#
#WHAT THE HARDWARE DOES
#jal fa due cose in un'unica istruzione: memorizza il file
#indirizzo della seguente istruzione in $ra, quindi salta. jr
#salta a qualunque cosa contenga un registro, quindi jr $ra restituisce.
#
#THE SOLUTION
#Tutto il resto è accordo, non circuiti: discussioni dentro
#$a0..$a3, risulta in $v0. Rompi la convenzione e il codice
#si assembla ancora: semplicemente smette di interagire.
#
#WATCH FOR
#Sali sul jal e leggi $ra. Confrontalo con l'indirizzo
#della linea dopo la chiamata nel segmento di testo.
# ==========================================================
        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #primo argomento
        li   $a1, 42            #secondo argomento
        #jal modifica sia il flusso di controllo che $ra in un'unica operazione architetturale.
        jal  maxof              #$ra = indirizzo della riga successiva

        move $a0, $v0           #il risultato è tornato in $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof è una funzione foglia, quindi può restituire senza salvare $ra nello stack.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
