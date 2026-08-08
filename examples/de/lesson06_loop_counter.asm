# ==========================================================
#Lektion 06 – Ein Zähler, in Software und in Hardware
#
#THE PROBLEM
#Ein Hardwarezähler ist ein Register, ein Inkrementierer und ein
#Komparator. Wie sieht die gleiche Maschine geschrieben aus?
#als Anleitung?
#
#WHAT THE HARDWARE DOES
#Genau diese drei Teile, einer pro Anweisung: das Register
#enthält den Zählerstand, addi ist der Inkrementierer, slt mit einem Zweig
#ist der Komparator, der über eine weitere Runde entscheidet.
#
#THE SOLUTION
#Eine Schleife ist kein neues Konzept. Es handelt sich um sequentielle Logik
#raus, mit dem PC als Uhr.
#
#WATCH FOR
#$t0 ist das Zählregister und $t1 das Limit. Treten Sie durch
#Eine volle Runde und benennen Sie, welche Linie welcher Teil ist.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #das Zählregister
        li   $t1, 11            #die Grenze

loop:
        #Schleifeninvariante: $t0 ist der nächste zu druckende Wert und bleibt unter $t1.
        slt  $t2, $t0, $t1      #Komparator
        beq  $t2, $zero, endl   #Beenden, wenn die Anzahl den Grenzwert erreicht

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #Das Aktualisieren des Zählers vor dem Springen garantiert den Fortschritt in Richtung Beendigung.
        addi $t0, $t0, 1        #der Addierer
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
