#Uji paritas manual untuk penurunan operasi semu.
#Setelah dijalankan, periksa segmen data pada hasil:
#hasil[0] = 1 detik 5,5
#hasil[1] = 1 kali 5,5
#hasil[2] = 5 perut -5
#hasil[3] = 0xfffffffa bukan 5

.data
results: .word 0, 0, 0, 0

.text
main:
  ori $t0, $zero, 5
  ori $t1, $zero, 5
  addiu $t2, $zero, -5

  seq $s0, $t0, $t1
  sge $s1, $t0, $t1
  abs $s2, $t2
  not $s3, $t0

  lui $t4, 0x1001
  ori $t4, $t4, 0x0000
  sw $s0, 0($t4)
  sw $s1, 4($t4)
  sw $s2, 8($t4)
  sw $s3, 12($t4)

  ori $v0, $zero, 10
  syscall
