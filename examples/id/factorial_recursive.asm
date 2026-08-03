#Faktorial rekursif (fakultas klasik)
#Membaca n dan mencetak n! (untuk n kecil).

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n ada di $a0; hasilnya muncul kembali di $v0
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#ke dalam fakta(int n)
fact:
  addiu $sp, $sp, -8   #satu frame per panggilan: dua kata
  sw    $ra, 4($sp)   #simpan alamat pengirim sebelum menelepon lagi
  sw    $a0, 0($sp)   #simpan n: panggilan rekursif menimpa $a0

  blez  $a0, fact_base   #kondisi berhenti: tanpanya tumpukan tidak akan pernah terlepas
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #n kita sendiri lagi, tidak tersentuh oleh panggilan di bawah ini
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #pulihkan dan lepaskan bingkai sebelum kembali
  addiu $sp, $sp, 8
  jr    $ra
