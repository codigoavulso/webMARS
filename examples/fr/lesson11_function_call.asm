# 11 - Appeler une fonction
#
# Fonctionne avec un branchement retardé. `jal` passe à la fonction et met l'adresse de
# l'instruction suivante dans `$ra`.
#
# La convention d'appel passe 17 et 42 en `$a0` et `$a1`. La fonction renvoie la plus grande
# valeur dans `$v0`.
#
# Entrez dans l'appel, comparez `$ra` avec l'adresse après `jal`, puis suivez `jr $ra` jusqu'à
# l'appelant.

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #premier argument
        li   $a1, 42            #deuxième argument
        jal  maxof

        move $a0, $v0           #le résultat est revenu dans $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof est une fonction feuille, elle peut donc revenir sans enregistrer $ra sur la pile.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
