# 04 - Décalages et puissances de deux
#
# Un décalage vers la gauche de 3 est multiplié par 8 lorsque le résultat correspond. Les bits
# décalés au-delà du bord sont ignorés.
#
# À droite, `srl` se remplit de zéros et `sra` copie le bit de signe. Pour -16 décalé de 2,
# attendez-vous respectivement à 1073741820 et -4.
#
# Essayez -15 avec `sra`. Le résultat est -4 car le décalage est arrondi à l'inférieur ; la
# division signée s’arrondit vers zéro.

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
        #Trois décalages vers la gauche se multiplient par 2^3 tout en ne conservant que 32 bits de résultat.
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
        #Comparez $t3 et $t4 en hexadécimal pour voir les différents bits entrants.
        sra  $t3, $t2, 2        #signe conservé : -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #zéros décalés : énorme positif
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
