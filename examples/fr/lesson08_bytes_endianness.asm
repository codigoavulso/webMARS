# ==========================================================
#Leçon 08 - Octets à l'intérieur d'un mot et ordre des octets
#
#THE PROBLEM
#Un mot occupe quatre adresses. Quel octet fait le plus bas
#de ces adresses, le nom ?
#
#WHAT THE HARDWARE DOES
#Ce choix est l'ordre des octets, et c'est une décision de câblage prise
#une fois pour toute la machine. MIPS ici c'est du petit-boutiste : le
#l'octet le moins significatif réside à l'adresse la plus basse.
#
#THE SOLUTION
#Stockez un mot, puis relisez-le octet par octet et laissez-le
#la commande répond à la question pour vous.
#
#WATCH FOR
#0x04030201 revient sous la forme 1 2 3 4. Le dernier octet écrit dans
#le littéral est lu en premier. lbu est utilisé plutôt que lb donc a
#l'octet au-dessus de 127 n'est pas étendu par signe.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #l'octet 01 est le moins significatif
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #décalage d'octet
bloop:
        #La boucle visite les décalages 0, 1, 2 et 3 à l'intérieur du mot stocké.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Adresse effective = adresse de base + décalage d'octet actuel.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #octet non signé
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
