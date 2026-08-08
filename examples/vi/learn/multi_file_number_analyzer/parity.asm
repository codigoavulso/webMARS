#Trình trợ giúp ví dụ nhiều tệp 1/2
#Đầu vào: $a0 = số
#Đầu ra: $v0 = địa chỉ của thông báo "chẵn" hoặc "lẻ"

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #Bit có ý nghĩa nhỏ nhất là 0 đối với số chẵn và 1 đối với số lẻ.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #Trả lại địa chỉ thay vì in ở đây; người gọi chọn cách sử dụng nó.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
