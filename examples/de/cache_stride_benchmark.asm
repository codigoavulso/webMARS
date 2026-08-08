#Benchmark zum Cache-Verhalten: sequenzieller Zugriff im Vergleich zu Schritt-16-Zugriff.
#Öffnen Sie Tools > Data Cache Simulation Tool, verbinden Sie es mit MIPS und markieren Sie Aktiviert.
#
#Jede Ausführung misst genau ein Cold-Cache-Muster. Legen Sie ACCESS_PATTERN fest
#auf 1 oder 2 setzen, die Simulatorstatistiken zurücksetzen, dann zusammenbauen und erneut ausführen.
#Beide Muster führen 1024 Ladevorgänge durch; Keine Initialisierungsschreibvorgänge verschmutzen die Daten.

.eqv ACCESS_PATTERN 1    #1 = sequentiell, 2 = Schritt 16 Wörter
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #Muster 1: sequentielle Adressen.
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #Muster 2: Besuchen Sie jedes 16. Wort und erhöhen Sie dann den Startversatz.
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
