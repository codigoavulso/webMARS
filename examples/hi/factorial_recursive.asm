#पुनरावर्ती तथ्यात्मक (संकाय क्लासिक)
#n पढ़ता है और n प्रिंट करता है! (छोटे एन के लिए)।

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

  jal fact   #n $a0 में है; परिणाम $v0 में वापस आता है
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

#पूर्णांक तथ्य(पूर्णांक n)
fact:
  addiu $sp, $sp, -8   #प्रति कॉल एक फ्रेम: दो शब्द
  sw    $ra, 4($sp)   #दोबारा कॉल करने से पहले रिटर्न एड्रेस सेव करें
  sw    $a0, 0($sp)   #n रखें: पुनरावर्ती कॉल ओवरराइट करता है $a0

  blez  $a0, fact_base   #रुकने की स्थिति: इसके बिना स्टैक कभी नहीं खुलता
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #हमारा अपना n फिर से, नीचे दी गई कॉल से अछूता
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #लौटने से पहले फ़्रेम को पुनर्स्थापित करें और रिलीज़ करें
  addiu $sp, $sp, 8
  jr    $ra
