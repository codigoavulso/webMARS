#मल्टी-फ़ाइल उदाहरण सहायक 2/2
#इनपुट: $a0 = [1,100] में संख्या
#आउटपुट: $v0 = 1 यदि संख्या अभाज्य है, 0 अन्यथा

.text
.globl is_prime
is_prime:
  #परिभाषा के अनुसार, 2 से नीचे के मान अभाज्य नहीं हैं।
  slti $t0, $a0, 2
  bne $t0, $zero, prime_no
  nop

  li $t1, 2

prime_loop:
  #sqrt(n) से बड़े किसी भी भाजक का परीक्षण करने की आवश्यकता नहीं है।
  mul $t2, $t1, $t1
  slt $t3, $a0, $t2
  bne $t3, $zero, prime_yes
  nop

  #div भागफल को LO में रखता है और शेष को HI में रखता है।
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
