#تکراری فیکٹریل (فیکلٹی کلاسک)
#پڑھتا ہے n اور پرنٹ کرتا ہے n! (چھوٹے ن کے لیے)۔

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n $a0 میں ہے؛ نتیجہ $v0 میں واپس آتا ہے
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#حقیقت (int n)
fact:
  addiu $sp, $sp, -8   #ایک فریم فی کال: دو الفاظ
  sw    $ra, 4($sp)   #دوبارہ کال کرنے سے پہلے واپسی کا پتہ محفوظ کر لیں۔
  sw    $a0, 0($sp)   #Keep n: تکراری کال اوور رائٹ $a0

  blez  $a0, fact_base   #روکنے کی حالت: اس کے بغیر اسٹیک کبھی نہیں کھلتا
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #ہمارا اپنا ایک بار پھر، نیچے کال کی طرف سے اچھوتا
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #واپس آنے سے پہلے فریم کو بحال اور چھوڑ دیں۔
  addiu $sp, $sp, 8
  jr    $ra
