# ==========================================================
#Lektion 15 – Warum der Schritt die Geschwindigkeit verändert
#
#THE PROBLEM
#Die beiden folgenden Schleifen lesen dasselbe Array und führen dasselbe aus
#Anzahl der Ladungen. Auf einer echten Maschine ist man viel langsamer. Die
#Die Anzahl der Anweisungen kann es nicht erklären.
#
#WHAT THE HARDWARE DOES
#Das Gedächtnis liefert keine einzelnen Wörter. Ein Fehlschlag bringt ein Ganzes
#blockieren, wetten, dass benachbarte Wörter bald gesucht werden.
#Ein Schritt von einem kassiert diese Wette; ein Schritt von sechzehn zahlt sich aus
#für einen Block und liest ein Wort davon.
#
#THE SOLUTION
#Am Code ändert sich nichts. Lokalität ist eine Eigenschaft der
#Zugriffsmuster, und dieses Muster muss behoben werden.
#
#WATCH FOR
#Öffnen Sie Extras > Daten-Cache-Simulator, klicken Sie auf „Mit MIPS verbinden“,
#dann rennen. Vergleichen Sie die Trefferquote der beiden Schleifen. Beide Summen
#Geben Sie 0 aus, da das Array auf Null gesetzt ist – die Zahl ist nicht die
#Punkt hier ist die Trefferquote.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
#---- jedes Wort jedes Blocks ----
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Sequentielle Indizes verwenden Wörter aus jedem Cache-Block erneut, bevor sie fortfahren.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

#---- ein Wort pro Block, sechzehn Wörter auseinander ----
        li   $t1, 0
        li   $t3, 0
far:
        #Das Hinzufügen von 16 überspringt 64 Bytes pro Iteration: normalerweise ein ganzer Cache-Block.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
