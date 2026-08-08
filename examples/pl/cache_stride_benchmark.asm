#Test porównawczy zachowania pamięci podręcznej: dostęp sekwencyjny i dostęp w trybie 16 kroków.
#Otwórz Narzędzia > Narzędzie do symulacji pamięci podręcznej danych, podłącz je do MIPS i zaznacz opcję Włączone.
#
#Każde wykonanie mierzy dokładnie jeden wzorzec zimnej pamięci podręcznej. Ustaw ACCESS_PATTERN
#na 1 lub 2, zresetuj statystyki symulatora, a następnie złóż i uruchom ponownie.
#Obydwa wzorce wykonują 1024 obciążenia; żadne zapisy inicjujące nie zanieczyszczają danych.

.eqv ACCESS_PATTERN 1    #1 = sekwencyjny, 2 = krok 16 słów
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

  #Wzór 1: adresy sekwencyjne.
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

  #Wzór 2: odwiedź co 16 słowo, a następnie przesuń początkowe przesunięcie.
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
