#Demo Tampilan Bitmap
#Buka Alat > Tampilan Bitmap
#Program ini mengatur Unit 1x1, Tampilan 64x64, Basis 0x10010000.
#Menggambar garis horizontal bergerak dengan warna yang berubah-ubah.

.data
msg0: .asciiz "\n=== Bitmap Display demo ===\n"
msg1: .asciiz "Open Tools > Bitmap Display and connect to MIPS.\n"
msg2: .asciiz "Drawing animated color bars at 0x10010000...\n"

.text
main:
  li $t0, 0xffff0020      #webMARS Bitmap MMIO blok kontrol
  li $t1, 0x57424d50      #"WBMP"
  sw $t1, 0($t0)
  li $t1, 1
  sw $t1, 4($t0)         #versi protokol
  sw $t1, 8($t0)         #target: Tampilan Bitmap
  li $t1, 64
  sw $t1, 12($t0)        #lebar tampilan
  sw $t1, 16($t0)        #tinggi tampilan
  li $t1, 1
  sw $t1, 20($t0)        #lebar satuan
  sw $t1, 24($t0)        #tinggi satuan
  li $t1, 0x10010000
  sw $t1, 28($t0)        #framebuffer
  li $t1, 1
  sw $t1, 32($t0)        #atom berlaku

  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $s0, 0x1001         #basis penyangga bingkai = 0x10010000
  li  $s1, 64             #lebar
  li  $s2, 64             #tinggi
  li  $s3, 0              #indeks bingkai

frame_loop:
  move $t0, $zero         #kamu = 0
row_loop:
  move $t1, $zero         #x = 0
col_loop:
  #penjumlahan = basis + ((y*64 + x) * 4)
  sll  $t2, $t0, 6        #kamu*64
  addu $t2, $t2, $t1      #kamu*64 + x
  sll  $t2, $t2, 2        # *4
  addu $t3, $s0, $t2

  #Membangun warna 0x00RRGGBB
  #R = (x + bingkai) & 255
  #G = (kamu*4) & 255
  #B = (x ^ y ^ bingkai) & 255
  addu $t4, $t1, $s3
  andi $t4, $t4, 0xff

  sll  $t5, $t0, 2
  andi $t5, $t5, 0xff

  xor  $t6, $t1, $t0
  xor  $t6, $t6, $s3
  andi $t6, $t6, 0xff

  sll  $t4, $t4, 16
  sll  $t5, $t5, 8
  or   $t7, $t4, $t5
  or   $t7, $t7, $t6

  sw   $t7, 0($t3)

  addiu $t1, $t1, 1
  blt   $t1, $s1, col_loop

  addiu $t0, $t0, 1
  blt   $t0, $s2, row_loop

  #tidur 30 ms
  li $v0, 32
  li $a0, 30
  syscall

  addiu $s3, $s3, 1
  j frame_loop
