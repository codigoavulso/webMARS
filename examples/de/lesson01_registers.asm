# ==========================================================
#Lektion 01 – Register und unmittelbare Werte
#
#THE PROBLEM
#Der ALU verfügt über zwei Eingangsanschlüsse und beide sind mit dem verkabelt
#Registerdatei. Eine in der Quelle geschriebene Zahl steht nicht in a
#registrieren, sodass diese Ports nicht direkt erreicht werden können.
#
#WHAT THE HARDWARE DOES
#Ein Immediat wandert innerhalb des Anweisungsworts selbst.
#addi trägt ein 16-Bit-Feld; li ist eine Annehmlichkeit
#Der Assembler erweitert sich in ein oder zwei echte Anweisungen.
#
#THE SOLUTION
#Legen Sie die Konstante zuerst in einem Register ab und lassen Sie dann ALU
#zwei Register lesen und ein drittes schreiben.
#
#WATCH FOR
#Gehen Sie einmal pro Zeile vor und folgen Sie $t0, $t1 und $t2 im
#Registerbereich. Nur die dritte Zeile berührt den ALU.
# ==========================================================
        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Systemaufrufe verwenden $v0 als Dienstselektor und $a0 als erstes Argument.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li ist eine Pseudoanweisung; Assemble zeigt, um welche echte Anweisung es sich handelt.
        li   $t0, 12            #sofort -> anmelden
        li   $t1, 30            #sofort -> anmelden
        add  $t2, $t0, $t1      #ALU liest zwei Register

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
