#Tolok ukur perilaku cache: akses sekuensial versus akses stride-16.
#Buka Alat > Alat Simulasi Cache Data, sambungkan ke MIPS, dan centang Aktif.
#
#Setiap eksekusi mengukur tepat satu pola cold-cache. Setel ACCESS_PATTERN
#ke 1 atau 2, setel ulang statistik simulator, lalu rakit dan jalankan kembali.
#Kedua pola tersebut melakukan 1024 beban; tidak ada inisialisasi penulisan yang mencemari data.

.eqv ACCESS_PATTERN 1    #1 = berurutan, 2 = langkah 16 kata
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

  #Pola 1: alamat berurutan.
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

  #Pola 2: kunjungi setiap kata ke-16, lalu lanjutkan offset awal.
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
