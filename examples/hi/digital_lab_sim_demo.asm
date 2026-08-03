#डिजिटल लैब सिम परीक्षण
#टूल मैपिंग (डिफ़ॉल्ट MMIO आधार 0xFFFF0000 के साथ):
#दायां अंक प्रदर्शित करें: 0xFFFF0010
#बायां अंक प्रदर्शित करें: 0xFFFF0011
#कीबोर्ड Ctrl : 0xFFFF0012
#कीबोर्ड आउट कोड: 0xFFFF0014
#
#डिजिटल लैब सिम कीपैड में कुंजियाँ क्लिक करें।
#प्रोग्राम स्कैन कोड को डिकोड करता है और दबाए गए कुंजी मान (0..f) को प्रदर्शित करता है।

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
  sb $t1, 0x12($t0)      #सभी पंक्तियों को स्कैन करें

  sb $zero, 0x11($t0)    #बायां अंक रिक्त
  move $s1, $zero        #अंतिम संसाधित स्कैन कोड

wait_key:
  lbu $t2, 0x14($t0)     #कीबोर्ड स्कैन कोड (कॉल<<4 | पंक्ति)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #सहकारी 4 एमएस प्रतीक्षा करें
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #पंक्ति बिट (कम निबल) और कॉलम बिट (उच्च निबल)
  andi $t3, $t2, 0x0f    #रोबिट: 1,2,4,8
  srl  $t4, $t2, 4       #कोलबिट: 1,2,4,8

  #पंक्ति अनुक्रमणिका = लॉग2(rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #कोल इंडेक्स = लॉग2(कोलबिट)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #कुंजी निबल = पंक्ति*4 + कॉलम (मान 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #दाएँ अंक पर दबाई गई कुंजी दिखाएँ

  j wait_key

#ए0: कुतरना 0..15
#v0: सात-खंड पैटर्न
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
