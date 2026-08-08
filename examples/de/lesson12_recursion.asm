# ==========================================================
#Lektion 12 – Rekursion benötigt einen Frame pro Aufruf
#
#THE PROBLEM
#Ein rekursiver Aufruf überschreibt $ra und das Argumentregister.
#Der äußere Ruf hat dann keinen Weg zurück und keine Ahnung, was es ist
#eigene n war.
#
#WHAT THE HARDWARE DOES
#Es stellt einen $ra bereit, keinen Stapel davon. Es wird nichts gespeichert
#automatisch; Wenn der Code es nicht speichert, ist es weg.
#
#THE SOLUTION
#Bei jeder Aktivierung wird ein Frame auf dem Stapel geöffnet, dessen Inhalt erhalten bleibt
#wird nach dem Anruf noch benötigt und stellt es unterwegs wieder her
#raus. Die Stapeltiefe ist die Rekursionstiefe.
#
#WATCH FOR
#Setzen Sie einen Haltepunkt auf dem Mul und beobachten Sie, wie $sp um 8 Prozent abfällt
#Ebene. Die fünf gespeicherten Kopien von n machen das aus
#Vervielfachung auf dem Rückweg möglich.
# ==========================================================
        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fact(int n) ----
fact:
        #Jeder Aufruf besitzt einen eigenen Acht-Byte-Frame.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #die Absenderadresse dieses Anrufs
        sw   $a0, 4($sp)        #Dieser Anruf ist n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #Basisfall: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #unser n wieder
        mul  $v0, $v0, $a0

factend:
        #Stellen Sie den Status des Angerufenen wieder her und verwerfen Sie genau den Frame, der bei der Eingabe zugewiesen wurde.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
