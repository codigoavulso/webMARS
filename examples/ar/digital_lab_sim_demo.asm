#اختبار سيم المختبر الرقمي
#تعيين الأداة (مع قاعدة MMIO الافتراضية 0xFFFF0000):
#عرض الرقم الأيمن: 0xFFFF0010
#عرض الرقم الأيسر: 0xFFFF0011
#مفتاح التحكم بلوحة المفاتيح : 0xFFFF0012
#رمز خروج لوحة المفاتيح: 0xFFFF0014
#
#انقر فوق المفاتيح الموجودة في لوحة مفاتيح Digital Lab Sim.
#يقوم البرنامج بفك تشفير رمز المسح الضوئي ويعرض قيمة المفتاح المضغوط (0..f).

.data
msg0:   .asciiz "\n=== Digital Lab Sim demo ===\n"
msg1:   .asciiz "Open Tools > Digital Lab Sim and click keypad buttons.\n"
msg2:   .asciiz "Displaying pressed key value (0..f) on 7-segment.\n"
segmap: .byte 0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f,0x77,0x7c,0x39,0x5e,0x79,0x71

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $t0, 0xffff
  li $t1, 0x0f
  sb $t1, 0x12($t0)      #مسح كافة الصفوف

  sb $zero, 0x11($t0)    #الرقم الأيسر فارغ
  move $s1, $zero        #آخر رمز مسح تمت معالجته

wait_key:
  lbu $t2, 0x14($t0)     #رمز فحص لوحة المفاتيح (عمود<<4 | صف)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #التعاونية 4 مللي ثانية انتظر
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #بت الصف (عابضة منخفضة) وبت العمود (عابضة عالية)
  andi $t3, $t2, 0x0f    #بت الصف: 1،2،4،8
  srl  $t4, $t2, 4       #كولبيت: 1,2,4,8

  #فهرس الصف = log2(rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #فهرس العمود = log2(colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #مفتاح nibble = الصف * 4 + العمود (القيم 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #إظهار المفتاح المضغوط على الرقم الصحيح

  j wait_key

#a0: عاب 0..15
#v0: نمط من سبعة أجزاء
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
