# 14 - Nombres réels en 32 bits
#
# Un flottant simple précision possède un bit de signe, huit bits d'exposant et 23 bits de
# fraction.
#
# `lwc1` copie le modèle de bits dans un registre à virgule flottante. Ensuite, `add.s` ajoute
# 3,5 et 1,25 pour produire 4,75.
#
# Comparez les encodages de 4,75 et 0,1 dans l'outil Représentation en virgule flottante. 4,75
# est exact ; 0,1 doit être arrondi.

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #dans le fichier de registre FPU
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #l'additionneur FPU

        #Syscall 2 attend son argument float spécifiquement dans $f12.
        mov.s $f12, $f4
        li   $v0, 2             #flotteur d'impression
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
