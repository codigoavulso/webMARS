#Giai thừa đệ quy (giảng viên cổ điển)
#Đọc n và in n! (đối với n nhỏ).

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

  jal fact   #n nằm trong $a0; kết quả trả về trong $v0
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

#int thực tế(int n)
fact:
  addiu $sp, $sp, -8   #một khung hình cho mỗi cuộc gọi: hai từ
  sw    $ra, 4($sp)   #lưu địa chỉ trả lại trước khi gọi lại
  sw    $a0, 0($sp)   #giữ n: cuộc gọi đệ quy ghi đè $a0

  blez  $a0, fact_base   #điều kiện dừng: không có nó thì ngăn xếp không bao giờ bung ra
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #n của chúng ta một lần nữa, không bị ảnh hưởng bởi cuộc gọi bên dưới
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #khôi phục và giải phóng khung trước khi quay lại
  addiu $sp, $sp, 8
  jr    $ra
