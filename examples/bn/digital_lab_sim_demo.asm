#ডিজিটাল ল্যাব সিম পরীক্ষা
#টুল ম্যাপিং (ডিফল্ট MMIO বেস 0xFFFF0000 সহ):
#ডান সংখ্যা প্রদর্শন করুন: 0xFFFF0010
#বাম সংখ্যা প্রদর্শন করুন: 0xFFFF0011
#কীবোর্ড ctrl : 0xFFFF0012
#কীবোর্ড আউট কোড: 0xFFFF0014
#
#ডিজিটাল ল্যাব সিম কীপ্যাডে কী ক্লিক করুন।
#প্রোগ্রাম স্ক্যান কোড ডিকোড করে এবং চাপা কী মান (0..f) প্রদর্শন করে।

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
  sb $t1, 0x12($t0)      #সমস্ত সারি স্ক্যান করুন

  sb $zero, 0x11($t0)    #বাম অঙ্ক ফাঁকা
  move $s1, $zero        #শেষ প্রক্রিয়াকৃত স্ক্যান কোড

wait_key:
  lbu $t2, 0x14($t0)     #কীবোর্ড স্ক্যান কোড (col<<4 | সারি)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #সমবায় 4 ms অপেক্ষা করুন
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #সারি বিট (নিম্ন নিবল) এবং কলাম বিট (উচ্চ নিবল)
  andi $t3, $t2, 0x0f    #rowBit: 1,2,4,8
  srl  $t4, $t2, 4       #কোলবিট: 1,2,4,8

  #সারি সূচক = লগ 2(রোবিট)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #col index = log2(colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #কী নিবল = সারি*4 + কল (মান 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #ডান অঙ্কে চাপা কী দেখান

  j wait_key

#a0: নিবল 0..15
#v0: সাত-সেগমেন্ট প্যাটার্ন
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
