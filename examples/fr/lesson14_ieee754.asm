# ==========================================================
#Leçon 14 - Nombres réels en 32 bits
#
#THE PROBLEM
#3.5 n’a pas sa place dans un registre entier. D'où vient le
#partie fractionnaire va, et comment un très grand nombre est-il stocké
#dans les mêmes 32 bits qu'un très petit ?
#
#WHAT THE HARDWARE DOES
#IEEE-754 divise le mot en trois champs : un bit de signe,
#huit bits d'exposant et vingt-trois bits de fraction. Le
#l'exposant fait glisser le point binaire, c'est pourquoi le format est
#appelé virgule flottante.
#
#THE SOLUTION
#Un fichier de registre séparé ($f0..$f31) et un additionneur séparé
#gérer ces valeurs, c'est pourquoi les mnémoniques diffèrent :
#lwc1 à charger, add.s à ajouter, syscall 2 à imprimer.
#
#WATCH FOR
#Ouvrez Outils > Représentation à virgule flottante et entrez 3.5.
#Regardez les trois champs, puis vérifiez que 4,75 est exact -
#contrairement à 0,1, qui n'a pas de fraction binaire finie.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        #Les adresses entières localisent toujours les données ; lwc1 déplace ses bits dans COP1.
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
