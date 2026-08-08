# ==========================================================
#Lektion 14 – Reelle Zahlen in 32 Bit
#
#THE PROBLEM
#3.5 hat keinen Platz in einem Ganzzahlregister. Woher kommt die
#Bruchteile gehen und wie wird eine sehr große Zahl gespeichert?
#in den gleichen 32 Bit wie ein sehr kleines?
#
#WHAT THE HARDWARE DOES
#IEEE-754 teilt das Wort in drei Felder auf: ein Vorzeichenbit,
#acht Exponentenbits und dreiundzwanzig Bruchbits. Die
#Exponent verschiebt den Binärpunkt, weshalb das Format so ist
#Fließkomma genannt.
#
#THE SOLUTION
#Eine separate Registerdatei ($f0..$f31) und ein separater Addierer
#verarbeiten diese Werte, weshalb die Mnemoniken unterschiedlich sind:
#lwc1 zum Laden, add.s zum Hinzufügen, Systemaufruf 2 zum Drucken.
#
#WATCH FOR
#Öffnen Sie Extras > Gleitkommadarstellung und geben Sie 3.5 ein.
#Beobachten Sie die drei Felder und überprüfen Sie dann, ob 4,75 genau ist.
#im Gegensatz zu 0,1, das keinen endlichen binären Bruch hat.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        #Ganzzahlige Adressen lokalisieren die Daten weiterhin; lwc1 verschiebt seine Bits nach COP1.
        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #in die Registerdatei FPU.
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #der FPU-Addierer

        #Syscall 2 erwartet sein Float-Argument speziell in $f12.
        mov.s $f12, $f4
        li   $v0, 2             #Float drucken
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
