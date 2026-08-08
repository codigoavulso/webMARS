# ==========================================================
#Lektion 13 – Eine Anweisung ist eine Zahl
#
#THE PROBLEM
#Der Prozessor ruft Wörter aus dem Speicher ab. Code lebt in
#Erinnerung auch. Was unterscheidet also eine Anweisung von einer
#Stück Daten?
#
#WHAT THE HARDWARE DOES
#Nichts, jenseits dessen, in welches Register das Wort geladen wird. Die
#Der PC wählt Wörter aus, die an den Decoder gehen; lw wählt Wörter aus
#das geht in die Registerdatei. Die Bits sind von der gleichen Art.
#
#THE SOLUTION
#Lesen Sie die Kodierung direkt aus. Zusammenbauen und öffnen
#Hauptmenü > Ausführen: In der Spalte „Code“ wird jede Anweisung als angezeigt
#das 32-Bit-Wort, das es wirklich ist.
#
#WATCH FOR
#In dieser Lektion wird absichtlich nichts gedruckt – die Ausgabe ist die
#Textsegment selbst. Vergleichen Sie die beiden Adds: gleicher Opcode und
#Funktionsfelder, unterschiedliche Registernummern. Dann finden Sie die
#Literal 100 im Addi-Wort.
# ==========================================================
        .text
        .globl main
main:
        #Überprüfen Sie die Spalte „Code“ nach dem Zusammenbau: Diese Mnemoniken werden nicht als Text gespeichert.
        add  $t0, $t1, $t2      #R-Typ: Opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      #gleiche Form, unterschiedliche Register
        addi $t0, $t1, 100      #I-Typ: Die Konstante ist im Wort
        sll  $t0, $t1, 4        #Für den Verschiebungsbetrag gibt es ein eigenes Feld
        j    tail               #J-Typ: eine Adresse, kein Register
tail:
        #li wird selbst vor der Ausführung erweitert; Der Prozessor sieht nur verschlüsselte Wörter.
        li   $v0, 10
        syscall
