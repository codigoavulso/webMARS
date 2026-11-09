# 13 - Eine Anweisung ist eine Zahl
#
# Stellen Sie die Spalte „Code“ im Textsegment zusammen und überprüfen Sie sie. Jeder
# Grundbefehl ist ein 32-Bit-Wort, das in Felder unterteilt ist.
#
# Vergleichen Sie die beiden `add`-Anweisungen. Die Operationsfelder stimmen überein, während
# die Registerfelder die unterschiedlichen Operanden kodieren.
#
# In `addi` enthalten die unteren 16 Bits die unmittelbare 100, also `0x0064`. Ändern Sie es auf
# 101 und bauen Sie es erneut zusammen, um die Änderung zu sehen.

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
