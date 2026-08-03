#कैश व्यवहार बेंचमार्क: अनुक्रमिक बनाम स्ट्राइड-16 एक्सेस।
#टूल्स > डेटा कैश सिमुलेशन टूल खोलें, इसे MIPS से कनेक्ट करें, और सक्षम की जांच करें।
#
#प्रत्येक निष्पादन बिल्कुल एक कोल्ड-कैश पैटर्न को मापता है। सेट करें ACCESS_PATTERN
#1 या 2 पर, सिम्युलेटर आँकड़े रीसेट करें, फिर इकट्ठा करें और फिर से चलाएँ।
#दोनों पैटर्न 1024 भार निष्पादित करते हैं; कोई आरंभीकरण लेखन डेटा को प्रदूषित नहीं करता है।

.eqv ACCESS_PATTERN 1    #1 = अनुक्रमिक, 2 = 16 शब्दों का क्रम
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #पैटर्न 1: अनुक्रमिक पते।
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #पैटर्न 2: प्रत्येक 16वें शब्द पर जाएं, फिर शुरुआती ऑफसेट को आगे बढ़ाएं।
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
