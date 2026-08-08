#การสาธิตการเรียงลำดับแบบบับเบิ้ล
#เรียงลำดับอาร์เรย์คงที่และพิมพ์ค่าที่เรียงลำดับ
#แนวคิด: การเข้าถึงคำที่จัดทำดัชนี, การวนซ้ำแบบซ้อน, การเปรียบเทียบแบบเซ็นชื่อ และการสลับแบบแทนที่
#แผนการลงทะเบียน: $s0 = ฐานอาร์เรย์, $s1 = ความยาว, $t0/$t1 = ดัชนีลูป

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #ฉัน
outer:
  #หลังจากผ่าน i แล้ว ค่าที่ใหญ่ที่สุดของ i จะถูกคงที่ที่ขอบด้านขวาแล้ว
  bge $t0, $s1, print
  li  $t1, 0              #เจ
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #คำหนึ่งมีขนาดสี่ไบต์ ดังนั้น arr[j] จึงอยู่ที่ฐาน + j*4
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #ค่าที่อยู่ติดกันไม่เป็นระเบียบ: แลกเปลี่ยนในหน่วยความจำ
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4 พิมพ์ฉลากก่อนการข้ามผ่านองค์ประกอบทีละองค์ประกอบ
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #ใช้การคำนวณที่อยู่เดียวกันซ้ำเพื่อดึงข้อมูล arr[index]
  bge $t7, $s1, end
  sll $t3, $t7, 2
  addu $t4, $s0, $t3
  lw  $a0, 0($t4)
  li  $v0, 1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addiu $t7, $t7, 1
  j print_loop

end:
  li $v0, 11
  li $a0, '\n'
  syscall
  li $v0, 10
  syscall
