# ==========================================================
#Lektion 05 – Der Komparator und die Verzweigung
#
#THE PROBLEM
#Eine Entscheidung benötigt ein Bit, aber den Vergleich zweier 32-Bit-Zahlen
#ist eine Subtraktion. Wie wird aus einer Subtraktion eine Wahl?
#
#WHAT THE HARDWARE DOES
#slt subtrahiert und wirft alles außer dem Zeichen weg,
#Schreiben von 0 oder 1. Der Zweig gibt dieses Bit dann an den PC weiter
#Logik, die entweder einen Offset hinzufügt oder den PC vorantreiben lässt.
#
#THE SOLUTION
#Vergleichen Sie in ein Register und verzweigen Sie in diesem Register. Kontrolle
#Der Fluss ist arithmetisch plus ein Multiplexer auf dem PC.
#
#WATCH FOR
#Nach slt hält $t2 1. Gehen Sie über den Beq hinaus und beobachten Sie den PC
#in der Statusleiste: Es springt statt um vier vor.
# ==========================================================
        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #a
        li   $t1, 12            #b
        #slt materialisiert den Vergleich als gewöhnliche Ganzzahl, niemals als versteckte Flags.
        slt  $t2, $t0, $t1      #t2 = 1, wenn a < b
        #Verzweigen Sie nur dann zu notless, wenn das boolesche Ergebnis Null ist.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
