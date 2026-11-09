# 11 – Aufrufen einer Funktion
#
# Ausführung mit verzögerter Verzweigung. `jal` springt zur Funktion und trägt die Adresse der
# nächsten Anweisung in `$ra` ein.
#
# Die Aufrufkonvention übergibt 17 und 42 in `$a0` und `$a1`. Die Funktion gibt den größeren
# Wert in `$v0` zurück.
#
# Treten Sie in den Anruf ein, vergleichen Sie `$ra` mit der Adresse nach `jal` und folgen Sie
# dann `jr $ra` zurück zum Anrufer.

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
        jal  maxof

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
