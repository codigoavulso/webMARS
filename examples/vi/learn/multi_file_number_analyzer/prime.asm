#Trình trợ giúp mẫu nhiều tệp 2/2
#Đầu vào: $a0 = số trong [1.100]
#Đầu ra: $v0 = 1 nếu số đó là số nguyên tố, 0 nếu không

.text
.globl is_prime
is_prime:
  #Theo định nghĩa, các giá trị dưới 2 không phải là số nguyên tố.
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #Không có ước số nào lớn hơn sqrt(n) cần được kiểm tra.
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div đặt thương số vào LO và phần còn lại vào HI.
  div $a0, $t1
  mfhi $t4
  beq $t4, $zero, prime_no
  nop

  addiu $t1, $t1, 1
  j prime_loop
  nop

prime_yes:
  li $v0, 1
  jr $ra
  nop

prime_no:
  move $v0, $zero
  jr $ra
  nop
