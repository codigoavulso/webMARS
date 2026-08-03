#Bonjour tout le monde pour exécuter les E/S
#Imprime un message simple et quitte.
#Il s'agit du plus petit exemple de séparation données/texte et de convention d'appel système.

.data
#.asciiz stocke les caractères suivis du terminateur zéro requis par l'appel système 4.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #Sélectionnez la chaîne d'impression (4) dans $v0 et transmettez l'adresse de la chaîne dans $a0.
  li $v0, 4
  la $a0, msg
  syscall

  #La sortie (10) arrête proprement le programme simulé.
  li $v0, 10
  syscall
