# 15 - Pourquoi la foulée change la vitesse
#
# Les deux boucles utilisent le même tableau. Le premier lit les 256 mots ; le second lit tous
# les 16 mots, ce qui ne fait que 16 chargements.
#
# Avec des blocs de cache de 16 mots, les lectures séquentielles peuvent réutiliser chaque bloc
# récupéré. La deuxième boucle avance vers un nouveau bloc à chaque chargement.
#
# Connectez le simulateur à MIPS, cochez « Activé » et réglez la taille de bloc sur 16 mots.
# Utilisez le Simulateur de cache de données avec un point d'arrêt à `far` pour inspecter la
# première boucle. Réinitialisez les statistiques du cache avant d'exécuter la deuxième boucle
# et comparez les taux de réussite.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Passe séquentielle : les 256 mots.
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Les index séquentiels réutilisent les mots de chaque bloc de cache avant de continuer.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# Passe stridée : une charge tous les seize mots.
        li   $t1, 0
        li   $t3, 0
far:
        # L'adresse suivante est à 64 octets : seize mots de quatre octets chacun.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
