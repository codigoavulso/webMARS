#Hallo Welt für Run I/O
#Gibt eine einfache Nachricht aus und wird beendet.
#Dies ist das kleinste Beispiel für die Daten-/Textaufteilung und die Systemaufrufkonvention.

.data
#.asciiz speichert die Zeichen, gefolgt vom Nullabschlusszeichen, das für Systemaufruf 4 erforderlich ist.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #Wählen Sie print-string (4) in $v0 und übergeben Sie die String-Adresse in $a0.
  li $v0, 4
  la $a0, msg
  syscall

  #Exit (10) stoppt das simulierte Programm sauber.
  li $v0, 10
  syscall
