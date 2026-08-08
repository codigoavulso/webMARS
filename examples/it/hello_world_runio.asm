#Ciao mondo per l'I/O di esecuzione
#Stampa un messaggio semplice ed esce.
#Questo è l'esempio più piccolo della suddivisione dati/testo e della convenzione syscall.

.data
#.asciiz memorizza i caratteri seguiti dal terminatore zero richiesto dalla syscall 4.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #Selezionare la stringa di stampa (4) in $v0 e passare l'indirizzo della stringa in $a0.
  li $v0, 4
  la $a0, msg
  syscall

  #Esci (10) arresta in modo pulito il programma simulato.
  li $v0, 10
  syscall
