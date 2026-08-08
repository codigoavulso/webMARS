# ==========================================================
#Lektion 10 – Der Stapel ist ein Register und ein Offset
#
#THE PROBLEM
#Es gibt 32 Register, die von allen Teilen gemeinsam genutzt werden
#Code. Wohin geht ein Wert, wenn er funktionieren muss?
#Werden diese Register wiederverwendet?
#
#WHAT THE HARDWARE DOES
#Überhaupt nichts Besonderes. $sp ist ein gewöhnliches Register
#zeigt zufällig in den Speicher und der Stapel wächst in Richtung
#niedrigere Adressen rein konventionell.
#
#THE SOLUTION
#Das Reservieren von Speicherplatz ist eine Subtraktion von $sp und dessen Freigabe
#Ergänzung. Push und Pop sind nur SW und LW.
#
#WATCH FOR
#Die Kassen werden bewusst zwischen den Filialen geleert
#und die Lasten, daher können die gedruckten Werte nur gekommen sein
#aus der Erinnerung zurück. Beobachten Sie, wie sich $sp um 8 und zurück bewegt.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Der Stapel wächst nach unten, sodass die Zuweisung von $sp abgezogen wird.
        addi $sp, $sp, -8       #Reservieren Sie zwei Wörter
        sw   $t0, 0($sp)        #schieben
        sw   $t1, 4($sp)

        li   $t0, 0             #Verstopfen Sie die Register
        li   $t1, 0

        lw   $t0, 0($sp)        #Pop
        lw   $t1, 4($sp)
        #Jede Zuweisung muss ausgeglichen sein, damit der Aufrufer sein ursprüngliches $sp sieht.
        addi $sp, $sp, 8        #freigeben

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
