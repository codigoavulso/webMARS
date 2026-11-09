# 13 - Une instruction est un nombre
#
# Assemblez et inspectez la colonne Code dans le segment de texte. Chaque instruction de base
# est un mot de 32 bits divisé en champs.
#
# Comparez les deux instructions `add`. Les champs d'opération correspondent, tandis que les
# champs de registre codent les différents opérandes.
#
# Dans `addi`, les 16 bits faibles contiennent le 100 immédiat, qui est `0x0064`. Changez-le en
# 101 et remontez pour voir le changement.

        .text
        .globl main
main:
        #Inspectez la colonne Code après l'assemblage : ces mnémoniques ne sont pas stockés sous forme de texte.
        add  $t0, $t1, $t2      #Type R : opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      #même forme, registres différents
        addi $t0, $t1, 100      #Type I : la constante est dans le mot
        sll  $t0, $t1, 4        #le montant du décalage a son propre champ
        j    tail               #Type J : une adresse, pas un registre
tail:
        #li est lui-même développé avant l'exécution ; le processeur ne voit que les mots codés.
        li   $v0, 10
        syscall
