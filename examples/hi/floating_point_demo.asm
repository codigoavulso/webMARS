#फ़्लोटिंग पॉइंट प्रतिनिधित्व उपकरण के लिए फ़्लोटिंग पॉइंट परीक्षण
#IEEE-754 बिट पैटर्न को $f12 में लिखता है और उन्हें फ़्लोट मान के रूप में प्रिंट करता है।

.data
title:  .asciiz "\n=== Floating-point demo ===\n"
label:  .asciiz "Value in $f12 = "
nl:     .asciiz "\n"
values: .word 0x00000000, 0x3f800000, 0x40490fdb, 0xbf800000, 0x41200000, 0xc1200000   #कच्चा IEEE 754 बिट पैटर्न, दशमलव संख्या नहीं

.text
main:
  li $v0, 4
  la $a0, title
  syscall

  la $t0, values
  li $t1, 6

fp_loop:
  beq $t1, $zero, done

  lw $t2, 0($t0)   #32-बिट पैटर्न को पूर्णांक के रूप में पढ़ें
  mtc1 $t2, $f12   #समान बिट्स को FPU में ले जाएं: कोई रूपांतरण नहीं होता है

  li $v0, 4
  la $a0, label
  syscall

  li $v0, 2   #syscall 2 प्रिंट $f12 को एक फ्लोट के रूप में पढ़ता है
  syscall

  li $v0, 4
  la $a0, nl
  syscall

  addiu $t0, $t0, 4   #अगला शब्द: प्रत्येक पैटर्न चार बाइट्स घेरता है
  addiu $t1, $t1, -1
  j fp_loop

done:
  li $v0, 10
  syscall
