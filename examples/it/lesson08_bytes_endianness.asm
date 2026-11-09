# 08 - Byte e ordine dei byte
#
# Nella memoria little-endian di questo simulatore, il byte meno significativo di una parola
# risiede nell'indirizzo più basso.
#
# Memorizza `0x04030201` come una parola e leggi gli offset da 0 a 3 come byte. L'uscita è 1, 2,
# 3, 4.
#
# Prova un byte basso di `0xFF`. Un carico senza segno con `lbu` dà 255, mentre un carico con
# segno con `lb` dà -1.

        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #il byte 01 è il meno significativo
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #spostamento di byte
bloop:
        #Il ciclo visita gli offset 0, 1, 2 e 3 all'interno della parola memorizzata.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Indirizzo effettivo = indirizzo base + offset byte corrente.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #byte senza segno
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
