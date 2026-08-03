#COP1 demo aritmatika.
#Meliputi beban/penyimpanan ganda, aritmatika, perbandingan, percabangan dan
#konversi ke bilangan bulat 32-bit menggunakan mode pembulatan FCSR yang aktif.

.data
.align 3   #ganda membutuhkan penyelarasan delapan byte
left:          .double 1.5
right:         .double 2.25
stored_sum:    .space 8
round_source:  .float 1.6
sum_label:     .asciiz "1.5 + 2.25 = "
compare_true:  .asciiz "1.5 is less than 2.25\n"
compare_false: .asciiz "Unexpected comparison result\n"
round_label:   .asciiz "1.6 rounded with the default FCSR mode = "
newline:       .asciiz "\n"

.text
main:
  ldc1  $f0, left   #ganda menempati pasangan register genap
  ldc1  $f2, right
  add.d $f4, $f0, $f2   #aritmatika berjalan di koprosesor, bukan di CPU
  sdc1  $f4, stored_sum

  li    $v0, 4
  la    $a0, sum_label
  syscall
  mov.d $f12, $f4
  li    $v0, 3
  syscall
  li    $v0, 4
  la    $a0, newline
  syscall

  c.lt.d $f0, $f2   #perbandingannya menulis sebuah bendera, tidak bercabang
  bc1t   comparison_ok   #ini adalah cabang yang membaca bendera itu
  nop
  la     $a0, compare_false
  b      print_comparison
  nop
comparison_ok:
  la     $a0, compare_true
print_comparison:
  li     $v0, 4
  syscall

  lwc1    $f6, round_source
  cvt.w.s $f8, $f6   #1.6 menjadi bilangan bulat menggunakan mode pembulatan FCSR
  mfc1    $a0, $f8   #bawa hasilnya kembali ke CPU untuk mencetaknya
  li      $v0, 4
  la      $a0, round_label
  syscall
  mfc1    $a0, $f8
  li      $v0, 1
  syscall
  li      $v0, 4
  la      $a0, newline
  syscall

  li $v0, 10
  syscall
