#Đoán Số (1..100)
#Sử dụng syscall 42 để tạo số ngẫu nhiên và syscall 5 cho đầu vào số nguyên.
#$s0 giữ bí mật trên toàn bộ hệ thống; $s1 đếm số lần thử qua các lần lặp vòng lặp.

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #Luồng ngẫu nhiên của hạt giống id=1 với một hạt giống tùy ý.
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #Số nguyên ngẫu nhiên trong phạm vi [0,100), sau đó chuyển sang [1,100].
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 trả về giá trị được tạo trong $a0, không phải trong $v0.
  addiu $s0, $a0, 1      #số bí mật
  li $s1, 0              #nỗ lực

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Syscalls có thể ghi đè lên các thanh ghi đối số/kết quả, do đó trạng thái liên tục vẫn nằm trong các thanh ghi $s.
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #Đầu vào số nguyên được trả về trong $v0.
  move $t0, $v0          #đoán
  addiu $s1, $s1, 1

  #nếu đoán < bí mật => quá thấp
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #nếu bí mật < đoán => quá cao
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #bằng nhau => thắng
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #Cả hai nhánh phản hồi đều hội tụ ở lần lặp tiếp theo.
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
