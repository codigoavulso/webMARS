# ==========================================================
#Lezione 04 – Spostamenti, ovvero moltiplicazioni con fili
#
#THE PROBLEM
#Un moltiplicatore generale è uno dei blocchi più costosi
#un percorso dati. Moltiplicare per 8 non dovrebbe costare molto.
#
#WHAT THE HARDWARE DOES
#Uno spostamento non è affatto aritmetico: sono gli stessi bit letti
#da fili diversi. Lo spostamento a sinistra di n si moltiplica per 2^n
#e costa solo il routing.
#
#THE SOLUTION
#Le potenze di due diventano spostamenti. Da notare i due spostamenti a destra: srl
#inserisce gli zeri in alto, sra copia il bit del segno, quindi solo
#sra divide correttamente un numero negativo.
#
#WATCH FOR
#-16 >> 2 dà -4 con sra ma enorme positivo con srl. Il
#i bit si muovevano in modo identico; differisce solo ciò che è inserito in alto.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #Tre spostamenti a sinistra si moltiplicano per 2^3 mantenendo solo 32 bit di risultato.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #Confronta $t3 e $t4 in esadecimale per vedere i diversi bit in entrata.
        sra  $t3, $t2, 2        #segno conservato: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #gli zeri si sono spostati: enormemente positivo
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
