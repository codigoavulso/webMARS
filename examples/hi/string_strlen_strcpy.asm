#स्ट्रिंग यूटिलिटीज़ डेमो: स्ट्रलेन + स्ट्रैपी (मैनुअल)
#दोनों रूटीन शून्य टर्मिनेटर तक बाइट-बाय-बाइट चलते हैं।
#वे लीफ फ़ंक्शन हैं, इसलिए उन्हें स्टैक पर $ra को सहेजने की आवश्यकता नहीं है।

.data
src: .asciiz "MIPS assembly for webMARS"
dst: .space 128
msg0: .asciiz "Length(src) = "
msg1: .asciiz "\nCopied text: "

.text
main:
  #जल रिटर्न एड्रेस को $ra में संग्रहीत करता है; तर्क/परिणाम o32 रजिस्टरों का अनुसरण करते हैं।
  la   $a0, src
  jal  my_strlen
  move $s0, $v0

  li $v0, 4
  la $a0, msg0
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  la   $a0, dst
  la   $a1, src
  jal  my_strcpy

  li $v0, 4
  la $a0, msg1
  syscall

  li $v0, 4
  la $a0, dst
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#a0 = char* s ; v0 = लंबाई
my_strlen:
  move $t0, $a0
  li   $v0, 0
len_loop:
  #एलबीयू किसी व्यक्तिगत चरित्र को लोड करते समय साइन एक्सटेंशन से बचता है।
  lbu  $t1, 0($t0)
  beq  $t1, $zero, len_end
  addiu $v0, $v0, 1
  addiu $t0, $t0, 1
  j len_loop
len_end:
  jr $ra

#ए0 = डीएसटी, ए1 = स्रोत
my_strcpy:
  move $t0, $a0
  move $t1, $a1
cpy_loop:
  #पहले कॉपी करें, फिर परीक्षण करें: यह समापन शून्य बाइट की भी प्रतिलिपि बनाता है।
  lbu  $t2, 0($t1)
  sb   $t2, 0($t0)
  beq  $t2, $zero, cpy_end
  addiu $t0, $t0, 1
  addiu $t1, $t1, 1
  j cpy_loop
cpy_end:
  jr $ra
