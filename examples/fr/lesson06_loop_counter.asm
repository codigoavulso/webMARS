# 06 - Boucle comme compteur
#
# `$t0` est le prochain numéro à imprimer. `$t1` est la limite supérieure exclusive, donc une
# limite de 11 imprime 1 à 10.
#
# La comparaison s'exécute avant chaque itération. L'incrément progresse vers la limite et le
# saut répète la vérification.
#
# Changez la limite à 1 et exécutez. La branche de sortie est prise avant la première
# impression.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #le registre de comptage
        li   $t1, 11            #la limite

loop:
        # Lors du test de boucle, $t0 est le prochain candidat. Imprimez-le uniquement s'il est en dessous de $t1.
        slt  $t2, $t0, $t1      #comparateur
        beq  $t2, $zero, endl   #quitter lorsque le nombre atteint la limite

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #La mise à jour du compteur avant de sauter garantit la progression vers la terminaison.
        addi $t0, $t0, 1        #l'additionneur
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
