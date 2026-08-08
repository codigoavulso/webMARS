#Bản demo lệnh gọi hàm kiểu được biên dịch bằng C
#Mô phỏng phần mở đầu/kết thúc chung và các biến cục bộ trên ngăn xếp.

.data
msg0: .asciiz "Result sumSquares(3,7) = "

.text
main:
  li   $a0, 3
  li   $a1, 7
  jal  sumSquares

  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#int sumSquares(int x, int y) {
#int sx = x*x;
#int sy = y*y;
#trả về sx + sy;
# }
sumSquares:
  addiu $sp, $sp, -24
  sw    $ra, 20($sp)
  sw    $fp, 16($sp)
  move  $fp, $sp

  sw    $a0, 0($fp)      #x địa phương
  sw    $a1, 4($fp)      #và địa phương

  lw    $t0, 0($fp)
  mul   $t1, $t0, $t0
  sw    $t1, 8($fp)      #tình dục địa phương

  lw    $t2, 4($fp)
  mul   $t3, $t2, $t2
  sw    $t3, 12($fp)     #sy địa phương

  addu  $v0, $t1, $t3

  lw    $fp, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
