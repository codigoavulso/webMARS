# ==========================================================
#Leçon 15 - Pourquoi la foulée change la vitesse
#
#THE PROBLEM
#Les deux boucles ci-dessous lisent le même tableau et effectuent la même chose
#nombre de charges. Sur une vraie machine, c'est beaucoup plus lent. Le
#le nombre d’instructions ne peut pas l’expliquer.
#
#WHAT THE HARDWARE DOES
#La mémoire ne délivre pas de simples mots. Un raté rapporte un tout
#bloquer, pariant que les mots voisins seront bientôt recherchés.
#Une foulée récupère ce pari ; une foulée de seize paie
#pour un bloc et en lit un mot.
#
#THE SOLUTION
#Rien dans le code ne change. La localité est une propriété du
#modèle d’accès, et c’est le modèle qui doit être corrigé.
#
#WATCH FOR
#Ouvrez Outils > Data Cache Simulator, appuyez sur Se connecter à MIPS,
#puis courez. Comparez le taux de réussite des deux boucles. Les deux sommes
#imprime 0 car le tableau est remis à zéro - le nombre n'est pas le
#point ici, le taux de réussite est.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
#---- chaque mot de chaque bloc ----
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

#---- un mot par bloc, espacés de seize mots ----
        li   $t1, 0
        li   $t3, 0
far:
        #Ajout de 16 sauts de 64 octets par itération : généralement un bloc de cache entier.
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
