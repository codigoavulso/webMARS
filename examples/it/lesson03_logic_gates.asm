# ==========================================================
#Lezione 03 - Porte logiche su 32 bit
#
#THE PROBLEM
#AND, OR e XOR sono porte a un bit. Un registro contiene 32 bit.
#Cosa significa un cancello con quella larghezza?
#
#WHAT THE HARDWARE DOES
#Dispone 32 copie del cancello una accanto all'altra. Bit 0 di
#il risultato dipende solo dal bit 0 di ciascun operando, il bit 1 solo da
#bit 1 e così via. Nessun trasporto viaggia tra di loro.
#
#THE SOLUTION
#Questa indipendenza è ciò che fa funzionare una maschera: scegli quale
#bit da mantenere con AND, forzarli a uno con OR, invertirli con XOR.
#
#WATCH FOR
#0xCC è 11001100 e la maschera 0x0F è 00001111. AND mantiene
#i quattro bit bassi, OR li imposta, XOR li capovolge. Solo il
#il bocconcino basso cambia sempre.
# ==========================================================
        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F maschera

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND cancella ogni posizione in cui la maschera contiene zero.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR alterna solo le posizioni selezionate da quelle nella maschera.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
