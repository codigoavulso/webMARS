#COP1 अंकगणितीय डेमो।
#दोहरे भार/भंडार, अंकगणित, तुलना, शाखाकरण और को कवर करता है
#सक्रिय FCSR राउंडिंग मोड का उपयोग करके 32-बिट पूर्णांक में रूपांतरण।

.data
.align 3   #डबल्स को आठ-बाइट संरेखण की आवश्यकता होती है
left:          .double 1.5
right:         .double 2.25
stored_sum:    .space 8
round_source:  .float 1.6
sum_label:     .asciiz "1.5 + 2.25 = "
compare_true:  .asciiz "1.5 is less than 2.25\n"
compare_false: .asciiz "Unexpected comparison result\n"
round_label:   .asciiz "1.6 rounded with the default FCSR mode = "
newline:       .asciiz "\n"

.text
main:
  ldc1  $f0, left   #एक डबल एक सम रजिस्टर जोड़ी पर कब्जा कर लेता है
  ldc1  $f2, right
  add.d $f4, $f0, $f2   #अंकगणित कोप्रोसेसर में चलता है, CPU में नहीं
  sdc1  $f4, stored_sum

  li    $v0, 4
  la    $a0, sum_label
  syscall
  mov.d $f12, $f4
  li    $v0, 3
  syscall
  li    $v0, 4
  la    $a0, newline
  syscall

  c.lt.d $f0, $f2   #तुलना एक ध्वज लिखती है, यह शाखा नहीं करती है
  bc1t   comparison_ok   #यह वह शाखा है जो उस ध्वज को पढ़ती है
  nop
  la     $a0, compare_false
  b      print_comparison
  nop
comparison_ok:
  la     $a0, compare_true
print_comparison:
  li     $v0, 4
  syscall

  lwc1    $f6, round_source
  cvt.w.s $f8, $f6   #1.6 FCSR राउंडिंग मोड का उपयोग करके एक पूर्णांक बन जाता है
  mfc1    $a0, $f8   #परिणाम को प्रिंट करने के लिए उसे वापस CPU पर लाएँ
  li      $v0, 4
  la      $a0, round_label
  syscall
  mfc1    $a0, $f8
  li      $v0, 1
  syscall
  li      $v0, 4
  la      $a0, newline
  syscall

  li $v0, 10
  syscall
