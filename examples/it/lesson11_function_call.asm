# 11 - Chiamare una funzione
#
# Esegui con diramazione ritardata. `jal` salta alla funzione e inserisce l'indirizzo
# dell'istruzione successiva in `$ra`.
#
# La convenzione di chiamata passa 17 e 42 in `$a0` e `$a1`. La funzione restituisce il valore
# più grande in `$v0`.
#
# Entra nella chiamata, confronta `$ra` con l'indirizzo dopo `jal`, quindi segui `jr $ra` fino
# al chiamante.

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
        jal  maxof

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
