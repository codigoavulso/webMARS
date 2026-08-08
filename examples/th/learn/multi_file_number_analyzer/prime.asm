#ตัวช่วยตัวอย่างหลายไฟล์ 2/2
#อินพุต: $a0 = ตัวเลขใน [1,100]
#เอาท์พุต: $v0 = 1 หากเป็นจำนวนเฉพาะ มิฉะนั้นจะเป็น 0

.text
.globl is_prime
is_prime:
  #ตามคำจำกัดความ ค่าที่ต่ำกว่า 2 ไม่ใช่จำนวนเฉพาะ
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #ไม่จำเป็นต้องทดสอบตัวหารที่มากกว่า sqrt(n)
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div วางผลหารไว้ใน LO และส่วนที่เหลืออยู่ใน HI
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
