#ملٹی فائل مثال مددگار 2/2
#ان پٹ: $a0 = نمبر [1,100] میں
#آؤٹ پٹ: $v0 = 1 اگر نمبر پرائم ہے، ورنہ 0

.text
.globl is_prime
is_prime:
  #تعریف کے مطابق، 2 سے نیچے کی اقدار پرائم نہیں ہیں۔
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #sqrt(n) سے بڑے کسی تقسیم کو جانچنے کی ضرورت نہیں ہے۔
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div حصہ کو LO میں اور بقیہ کو HI میں رکھتا ہے۔
  div $a0, $t1
  mfhi $t4
  beq $t4, $zero, prime_no
  nop

  addiu $t1, $t1, 1
  j prime_loop
  nop

prime_yes:
  li $v0, 1
  jr $ra
  nop

prime_no:
  move $v0, $zero
  jr $ra
  nop
