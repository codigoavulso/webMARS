# ==========================================================
#Lezione 02 - Complemento a due
#
#THE PROBLEM
#Un registro è composto da 32 fili, ciascuno alto o basso. Non c'è nessun filo
#per un segno meno, tuttavia, i numeri negativi devono funzionare.
#
#WHAT THE HARDWARE DOES
#Legge la parte superiore come un segno, ma non come un flag separato:
#-n viene memorizzato come sequenza di bit che, sommata a n, va a capo
#zero. Inverti ogni bit e aggiungine uno e il gioco è fatto.
#
#THE SOLUTION
#La sottrazione non necessita di un secondo circuito. a - b diventa
#a + (-b), quindi un sommatore serve entrambe le operazioni.
#
#WATCH FOR
#Entrambe le metà stampano -5. Il secondo lo raggiunge per la lunga strada,
#con nor e addi, che mostra cosa fa sub internamente.
#Imposta i valori su esadecimale per vedere 0xFFFFFFFB.
# ==========================================================
        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #Sottraendo da zero si forma l'inverso additivo senza bit di segno meno.
        li   $t0, 5
        sub  $t1, $zero, $t0    #il sommatore fa il lavoro
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #né con $zero è bit per bit NOT; aggiungendo uno si completa il complemento a due.
        nor  $t2, $t0, $zero    #invertire tutti i bit
        addi $t2, $t2, 1        #aggiungine uno
        move $a0, $t2           #stesso valore di cui sopra
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
