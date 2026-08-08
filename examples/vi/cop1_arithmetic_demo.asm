#COP1 bản trình diễn số học.
#Bao gồm tải/lưu trữ kép, số học, so sánh, phân nhánh và
#chuyển đổi thành số nguyên 32 bit bằng chế độ làm tròn FCSR hoạt động.

.data
.align 3   #nhân đôi cần căn chỉnh tám byte
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
  ldc1  $f0, left   #một double chiếm một cặp thanh ghi chẵn
  ldc1  $f2, right
  add.d $f4, $f0, $f2   #số học chạy trong bộ đồng xử lý, không phải trong CPU
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

  c.lt.d $f0, $f2   #sự so sánh viết một lá cờ, nó không phân nhánh
  bc1t   comparison_ok   #đây là nhánh đọc lá cờ đó
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
  cvt.w.s $f8, $f6   #1.6 trở thành số nguyên bằng cách sử dụng chế độ làm tròn FCSR
  mfc1    $a0, $f8   #mang kết quả về CPU để in
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
