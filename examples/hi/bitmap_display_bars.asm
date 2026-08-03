#बिटमैप प्रदर्शन डेमो
#टूल्स > बिटमैप डिस्प्ले खोलें
#प्रोग्राम यूनिट 1x1, डिस्प्ले 64x64, बेस 0x10010000 सेट करता है।
#बदलते रंगों के साथ एक गतिशील क्षैतिज पट्टी बनाता है।

.data
msg0: .asciiz "\n=== Bitmap Display demo ===\n"
msg1: .asciiz "Open Tools > Bitmap Display and connect to MIPS.\n"
msg2: .asciiz "Drawing animated color bars at 0x10010000...\n"

.text
main:
  li $t0, 0xffff0020      #webMARS बिटमैप MMIO नियंत्रण ब्लॉक
  li $t1, 0x57424d50      #"WBMP"
  sw $t1, 0($t0)
  li $t1, 1
  sw $t1, 4($t0)         #प्रोटोकॉल संस्करण
  sw $t1, 8($t0)         #लक्ष्य: बिटमैप डिस्प्ले
  li $t1, 64
  sw $t1, 12($t0)        #प्रदर्शन चौड़ाई
  sw $t1, 16($t0)        #ऊंचाई प्रदर्शित करें
  li $t1, 1
  sw $t1, 20($t0)        #इकाई चौड़ाई
  sw $t1, 24($t0)        #इकाई ऊंचाई
  li $t1, 0x10010000
  sw $t1, 28($t0)        #फ़्रेमबफ़र
  li $t1, 1
  sw $t1, 32($t0)        #परमाणु लागू

  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $s0, 0x1001         #फ़्रेम बफ़र बेस = 0x10010000
  li  $s1, 64             #चौड़ाई
  li  $s2, 64             #ऊंचाई
  li  $s3, 0              #फ्रेम सूचकांक

frame_loop:
  move $t0, $zero         #आप = 0
row_loop:
  move $t1, $zero         #एक्स = 0
col_loop:
  #पता = आधार + ((y*64 + x) * 4)
  sll  $t2, $t0, 6        #आप*64
  addu $t2, $t2, $t1      #y*64 + x
  sll  $t2, $t2, 2        # *4
  addu $t3, $s0, $t2

  #निर्माण रंग 0x00RRGGBB
  #आर = (एक्स + फ्रेम) और 255
  #जी = (वाई*4) और 255
  #बी = (एक्स ^ वाई ^ फ्रेम) और 255
  addu $t4, $t1, $s3
  andi $t4, $t4, 0xff

  sll  $t5, $t0, 2
  andi $t5, $t5, 0xff

  xor  $t6, $t1, $t0
  xor  $t6, $t6, $s3
  andi $t6, $t6, 0xff

  sll  $t4, $t4, 16
  sll  $t5, $t5, 8
  or   $t7, $t4, $t5
  or   $t7, $t7, $t6

  sw   $t7, 0($t3)

  addiu $t1, $t1, 1
  blt   $t1, $s1, col_loop

  addiu $t0, $t0, 1
  blt   $t0, $s2, row_loop

  #नींद 30 एमएस
  li $v0, 32
  li $a0, 30
  syscall

  addiu $s3, $s3, 1
  j frame_loop
