# 10 – Der Stapel
#
# Konventionell wächst der Stapel zu niedrigeren Adressen hin. Subtrahieren Sie 8 von `$sp`, um
# Platz für zwei Wörter zu reservieren.
#
# Das Programm speichert zwei Register mit `sw`, löscht sie und stellt dann ihre Werte mit `lw`
# wieder her.
#
# Schauen Sie sich `$sp` vor der Reservierung, während der beiden Stores und nach der
# Veröffentlichung an. Sein Endwert sollte mit seinem Anfangswert übereinstimmen.

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
