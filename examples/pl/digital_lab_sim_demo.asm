#Test Sima w laboratorium cyfrowym
#Mapowanie narzędzia (z domyślną bazą MMIO 0xFFFF0000):
#wyświetl prawą cyfrę: 0xFFFF0010
#wyświetl lewą cyfrę: 0xFFFF0011
#klawisz Ctrl: 0xFFFF0012
#kod wyjścia klawiatury: 0xFFFF0014
#
#Kliknij klawisze na klawiaturze Digital Lab Sim.
#Program dekoduje kod skanu i wyświetla wartość wciśniętego klawisza (0..f).

.data
msg0:   .asciiz "\n=== Digital Lab Sim demo ===\n"
msg1:   .asciiz "Open Tools > Digital Lab Sim and click keypad buttons.\n"
msg2:   .asciiz "Displaying pressed key value (0..f) on 7-segment.\n"
segmap: .byte 0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f,0x77,0x7c,0x39,0x5e,0x79,0x71

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $t0, 0xffff
  li $t1, 0x0f
  sb $t1, 0x12($t0)      #przeskanuj wszystkie wiersze

  sb $zero, 0x11($t0)    #lewa cyfra pusta
  move $s1, $zero        #ostatnio przetworzony kod skanowania

wait_key:
  lbu $t2, 0x14($t0)     #kod skanowania klawiatury (kol<<4 | wiersz)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #spółdzielnia 4 ms czekać
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #bit wiersza (niski półbajt) i bit kolumny (wysoki półbajt)
  andi $t3, $t2, 0x0f    #wierszBit: 1,2,4,8
  srl  $t4, $t2, 4       #colBit: 1,2,4,8

  #indeks wiersza = log2(rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #indeks col = log2(colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #klucz półbajt = wiersz*4 + kolumna (wartości 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #pokaż wciśnięty klawisz na prawej cyfrze

  j wait_key

#a0: skubnij 0..15
#v0: wzór siedmiosegmentowy
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
