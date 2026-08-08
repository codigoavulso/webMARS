# ==========================================================
#Lektion 11 – Aufrufen einer Funktion
#
#THE PROBLEM
#Der Einstieg in eine Routine ist einfach. Zurückkommen geht nicht, denn
#Dieselbe Routine kann von vielen Orten aus aufgerufen werden
#Die Rücksendeadresse ist jedes Mal unterschiedlich.
#
#WHAT THE HARDWARE DOES
#JAL erledigt zwei Dinge in einer Anweisung: Es speichert die
#Adresse der folgenden Anweisung in $ra und springt dann. jr
#springt zu dem, was ein Register enthält, also kehrt jr $ra zurück.
#
#THE SOLUTION
#Alles andere ist Übereinstimmung, keine Schaltung: Argumente in
#$a0..$a3, ergibt $v0. Brechen Sie die Konvention und den Code
#lässt sich immer noch zusammenbauen – es hört einfach auf zu interagieren.
#
#WATCH FOR
#Treten Sie auf das Gefäß und lesen Sie $ra. Vergleichen Sie es mit der Adresse
#der Zeile nach dem Aufruf im Textsegment.
# ==========================================================
        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #erstes Argument
        li   $a1, 42            #zweites Argument
        #jal ändert sowohl den Kontrollfluss als auch $ra in einem Architekturvorgang.
        jal  maxof              #$ra = Adresse der nächsten Zeile

        move $a0, $v0           #Ergebnis kam zurück in $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof ist eine Blattfunktion und kann daher zurückkehren, ohne $ra auf dem Stapel zu speichern.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
