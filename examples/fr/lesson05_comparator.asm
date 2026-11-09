# 05 - Comparateur et branchement
#
# `slt` compare deux entiers signés et écrit 1 lorsque le premier est plus petit, ou 0 sinon.
#
# Pour 7 et 12, `$t2` vaut 1, donc `beq` ne passe pas à `notless` et l'exécution passe à
# l'instruction suivante.
#
# Avec un branchement retardé, dépassez `beq` et observez le PC. Échangez les deux valeurs
# d'entrée et comparez la nouvelle destination.

        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #un
        li   $t1, 12            #b
        #slt matérialise la comparaison comme un entier ordinaire, jamais comme des drapeaux cachés.
        slt  $t2, $t0, $t1      #t2 = 1 si a < b
        #Branchez-vous sur Notless uniquement lorsque ce résultat booléen est nul.
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
