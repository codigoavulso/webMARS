#ตัวอย่างหลายไฟล์: โมดูลหลัก
#เก็บไฟล์นี้ไว้และกด Assemble
#คำสั่ง .include ด้านล่างจะดึงไฟล์อีกสองไฟล์เข้ามา
#- parity.asm ส่งคืนข้อความแจ้งว่าตัวเลขเป็นเลขคู่หรือคี่
#- prime.asm ส่งคืน 1 ใน $v0 เมื่อตัวเลขเป็นจำนวนเฉพาะ
#
#การไหล:
#1. ถามตัวเลขใน [1,100] หรือ 0 เพื่อออก
#2. พิมพ์ว่าตัวเลขเป็นเลขคู่หรือคี่
#3. พิมพ์ว่าตัวเลขเป็นจำนวนเฉพาะหรือไม่
#4. ทำซ้ำ

.data
#โมดูลนี้เป็นเจ้าของสตริงที่ผู้ใช้ต้องเผชิญ โมดูลตัวช่วยเป็นเจ้าของข้อมูล/รหัสส่วนตัว
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
  #Syscall 5 ส่งคืนจำนวนเต็มที่ป้อนใน $v0
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #ตรวจสอบขอบเขตล่างและบนด้วยการเปรียบเทียบที่ลงนาม
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
  #รูปแบบการโทร o32: อาร์กิวเมนต์ใน $a0 ตัวชี้ผลลัพธ์ใน $v0
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #โมดูลที่สองส่งคืนบูลีนใน $v0
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

#รวมได้รับการแก้ไขจากไฟล์โครงการระหว่างการประกอบ
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
