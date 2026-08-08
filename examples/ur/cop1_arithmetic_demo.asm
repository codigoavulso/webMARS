#COP1 ریاضی کا ڈیمو۔
#ڈبل بوجھ/اسٹور، ریاضی، موازنہ، برانچنگ کا احاطہ کرتا ہے۔
#فعال FCSR راؤنڈنگ موڈ کا استعمال کرتے ہوئے 32 بٹ انٹیجر میں تبدیلی۔

.data
.align 3   #ڈبلز کو آٹھ بائٹ سیدھ کی ضرورت ہے۔
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
  ldc1  $f0, left   #ایک ڈبل ایک یکساں رجسٹر جوڑے پر قبضہ کرتا ہے۔
  ldc1  $f2, right
  add.d $f4, $f0, $f2   #ریاضی کاپروسیسر میں چلتا ہے، CPU میں نہیں
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

  c.lt.d $f0, $f2   #موازنہ ایک جھنڈا لکھتا ہے، اس کی شاخ نہیں ہوتی
  bc1t   comparison_ok   #یہ وہ شاخ ہے جو اس جھنڈے کو پڑھتی ہے۔
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
  cvt.w.s $f8, $f6   #1.6 FCSR راؤنڈنگ موڈ کا استعمال کرتے ہوئے ایک عدد عدد بن جاتا ہے
  mfc1    $a0, $f8   #پرنٹ کرنے کے لیے نتیجہ کو واپس CPU پر لائیں۔
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
