#Hello World dla Run I/O
#Drukuje prosty komunikat i wychodzi.
#Jest to najmniejszy przykład podziału danych/tekstu i konwencji wywołania systemowego.

.data
#.asciiz przechowuje znaki, po których następuje terminator zera wymagany przez wywołanie systemowe 4.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #Wybierz ciąg znaków wydruku (4) w $v0 i przekaż adres ciągu w $a0.
  li $v0, 4
  la $a0, msg
  syscall

  #Exit (10) całkowicie zatrzymuje symulowany program.
  li $v0, 10
  syscall
