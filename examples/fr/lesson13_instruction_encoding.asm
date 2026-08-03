# ==========================================================
#Leçon 13 - Une instruction est un nombre
#
#THE PROBLEM
#Le processeur récupère les mots de la mémoire. Le code vit dans
#la mémoire aussi. Alors, qu'est-ce qui distingue une instruction d'un
#morceau de données ?
#
#WHAT THE HARDWARE DOES
#Rien, au-delà duquel le mot se charge. Le
#Le PC sélectionne les mots qui vont au décodeur ; lw sélectionne des mots
#qui vont dans le fichier de registre. Les morceaux sont du même genre.
#
#THE SOLUTION
#Lisez directement l'encodage. Assembler et ouvrir
#Principal > Exécuter : la colonne Code affiche chaque instruction comme
#le mot de 32 bits qu'il est réellement.
#
#WATCH FOR
#Cette leçon n'imprime rien exprès - le résultat est le
#Segment de texte lui-même. Comparez les deux ajouts : même opcode et
#champs de fonction, différents numéros de registre. Trouvez ensuite le
#littéral 100 à l’intérieur du mot addi.
# ==========================================================
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
