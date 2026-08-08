#Ví dụ về nhiều tệp: mô-đun chính
#Giữ tập tin này hoạt động và nhấn Assemble.
#Các lệnh .include bên dưới kéo theo hai tệp còn lại.
#- parity.asm trả về thông báo cho biết số đó là số chẵn hay số lẻ
#- prime.asm trả về 1 trong $v0 khi số đó là số nguyên tố
#
#Dòng chảy:
#1. Yêu cầu nhập số [1.100] hoặc 0 để thoát
#2. In ra số chẵn hay lẻ
#3. In xem số đó có phải là số nguyên tố hay không
#4. Lặp lại

.data
#Mô-đun này sở hữu các chuỗi hướng tới người dùng; mô-đun trợ giúp sở hữu dữ liệu/mã riêng tư của họ.
title:         .asciiz "\n=== Multi-file number analyzer ===\n"
hint:          .asciiz "This example uses 3 separate files assembled together.\n"
prompt:        .asciiz "Enter a number [1..100] (0 to exit): "
invalid_msg:   .asciiz "Please enter a value between 1 and 100.\n"
result_prefix: .asciiz "Number "
parity_prefix: .asciiz " is "
prime_yes_msg: .asciiz " and it is prime.\n"
prime_no_msg:  .asciiz " and it is not prime.\n"
goodbye_msg:   .asciiz "Bye!\n"

.text
.globl main
main:
  li $v0, 4
  la $a0, title
  syscall

  li $v0, 4
  la $a0, hint
  syscall

input_loop:
  #Syscall 5 trả về số nguyên đã nhập trong $v0.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #Xác thực giới hạn dưới và trên bằng các so sánh đã ký.
  slti $t0, $s0, 1
  bne $t0, $zero, invalid_input
  nop

  slti $t0, $s0, 101
  beq $t0, $zero, invalid_input
  nop

  li $v0, 4
  la $a0, result_prefix
  syscall

  li $v0, 1
  #o32 quy ước gọi: đối số trong $a0, con trỏ kết quả trong $v0.
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #Mô-đun thứ hai trả về một boolean trong $v0.
  move $a0, $s0
  jal get_parity_message
  nop

  move $s1, $v0
  li $v0, 4
  move $a0, $s1
  syscall

  move $a0, $s0
  jal is_prime
  nop

  bne $v0, $zero, print_prime_yes
  nop

  li $v0, 4
  la $a0, prime_no_msg
  syscall
  j input_loop
  nop

print_prime_yes:
  li $v0, 4
  la $a0, prime_yes_msg
  syscall
  j input_loop
  nop

invalid_input:
  li $v0, 4
  la $a0, invalid_msg
  syscall
  j input_loop
  nop

exit_program:
  li $v0, 4
  la $a0, goodbye_msg
  syscall

  li $v0, 10
  syscall

#Bao gồm được giải quyết từ các tệp dự án trong quá trình lắp ráp.
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
