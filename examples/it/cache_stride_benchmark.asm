#Benchmark sul comportamento della cache: accesso sequenziale rispetto a quello stride-16.
#Apri Strumenti > Strumento di simulazione cache dati, collegalo a MIPS e seleziona Abilitato.
#
#Ogni esecuzione misura esattamente un modello di cache fredda. Imposta ACCESS_PATTERN
#su 1 o 2, reimpostare le statistiche del simulatore, quindi assemblare ed eseguire di nuovo.
#Entrambi i modelli eseguono 1024 carichi; nessuna scrittura di inizializzazione inquina i dati.

.eqv ACCESS_PATTERN 1    #1 = sequenziale, 2 = intervallo di 16 parole
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

  #Modello 1: indirizzi sequenziali.
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

  #Modello 2: visita ogni 16 parole, quindi avanza l'offset iniziale.
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
