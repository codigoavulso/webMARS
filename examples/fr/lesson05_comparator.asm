# ==========================================================
#Leçon 05 - Le comparateur et la branche
#
#THE PROBLEM
#Une décision nécessite un bit, mais comparer deux nombres de 32 bits
#est une soustraction. Comment une soustraction devient-elle un choix ?
#
#WHAT THE HARDWARE DOES
#slt soustrait et jette tout sauf le signe,
#écrire 0 ou 1. La branche transmet ensuite ce bit au PC
#logique, qui soit ajoute un décalage, soit permet au PC d'avancer.
#
#THE SOLUTION
#Comparez dans un registre, branchez sur ce registre. Contrôle
#le flux est arithmétique plus un multiplexeur sur le PC.
#
#WATCH FOR
#Après slt, $t2 détient 1. Dépassez le beq et regardez le PC
#dans la barre d'état : il saute plutôt que d'avancer de quatre.
# ==========================================================
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
