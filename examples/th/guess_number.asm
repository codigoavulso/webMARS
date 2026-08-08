#ทายหมายเลข (1..100)
#ใช้ syscall 42 สำหรับการสร้างตัวเลขสุ่ม และ syscall 5 สำหรับการป้อนจำนวนเต็ม
#$s0 เก็บความลับระหว่าง syscalls; $s1 นับความพยายามในการวนซ้ำ

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #Seed สตรีมสุ่ม id=1 ด้วย seed ที่กำหนดเอง
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #สุ่มจำนวนเต็มในช่วง [0,100) จากนั้นเลื่อนไปที่ [1,100]
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 ส่งคืนค่าที่สร้างขึ้นใน $a0 ไม่ใช่ใน $v0
  addiu $s0, $a0, 1      #หมายเลขลับ
  li $s1, 0              #ความพยายาม

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Syscalls อาจเขียนทับการลงทะเบียนอาร์กิวเมนต์/ผลลัพธ์ ดังนั้นสถานะถาวรจึงยังคงอยู่ในการลงทะเบียน $s
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #อินพุตจำนวนเต็มจะถูกส่งกลับใน $v0
  move $t0, $v0          #เดา
  addiu $s1, $s1, 1

  #ถ้าเดา < ลับ => ต่ำเกินไป
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #ถ้าความลับ < เดา => สูงเกินไป
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #เท่ากับ => ชนะ
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
  #คำติชมทั้งสองสาขามาบรรจบกันในการวนซ้ำครั้งถัดไป
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
