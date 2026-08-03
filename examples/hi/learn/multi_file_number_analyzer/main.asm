#मल्टी-फ़ाइल उदाहरण: मुख्य मॉड्यूल
#इस फ़ाइल को सक्रिय रखें और Assemble दबाएँ।
#नीचे दिए गए .include निर्देश अन्य दो फ़ाइलों को खींचते हैं।
#-parity.asm एक संदेश लौटाता है जो बताता है कि संख्या सम है या विषम
#- prime.asm $v0 में 1 लौटाता है जब संख्या अभाज्य हो
#
#प्रवाह:
#1. बाहर निकलने के लिए [1,100] या 0 में एक नंबर मांगें
#2. प्रिंट करें कि संख्या सम है या विषम
#3. प्रिंट करें कि संख्या अभाज्य है या नहीं
#4. दोहराएँ

.data
#इस मॉड्यूल के पास उपयोगकर्ता-सामना वाली स्ट्रिंग्स हैं; सहायक मॉड्यूल अपने निजी डेटा/कोड के स्वामी होते हैं।
title:         .asciiz "\n=== Multi-file number analyzer ===\n"
hint:          .asciiz "This example uses 3 separate files assembled together.\n"
prompt:        .asciiz "Enter a number [1..100] (0 to exit): "
invalid_msg:   .asciiz "Please enter a value between 1 and 100.\n"
result_prefix: .asciiz "Number "
parity_prefix: .asciiz " is "
prime_yes_msg: .asciiz " and it is prime.\n"
prime_no_msg:  .asciiz " and it is not prime.\n"
goodbye_msg:   .asciiz "Bye!\n"

.text
.globl main
main:
  li $v0, 4
  la $a0, title
  syscall

  li $v0, 4
  la $a0, hint
  syscall

input_loop:
  #Syscall 5 $v0 में दर्ज पूर्णांक लौटाता है।
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #हस्ताक्षरित तुलनाओं के साथ निचली और ऊपरी सीमाओं को मान्य करें।
  slti $t0, $s0, 1
  bne $t0, $zero, invalid_input
  nop

  slti $t0, $s0, 101
  beq $t0, $zero, invalid_input
  nop

  li $v0, 4
  la $a0, result_prefix
  syscall

  li $v0, 1
  #o32 कॉल कन्वेंशन: $a0 में तर्क, $v0 में परिणाम सूचक।
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #दूसरा मॉड्यूल $v0 में एक बूलियन लौटाता है।
  move $a0, $s0
  jal get_parity_message
  nop

  move $s1, $v0
  li $v0, 4
  move $a0, $s1
  syscall

  move $a0, $s0
  jal is_prime
  nop

  bne $v0, $zero, print_prime_yes
  nop

  li $v0, 4
  la $a0, prime_no_msg
  syscall
  j input_loop
  nop

print_prime_yes:
  li $v0, 4
  la $a0, prime_yes_msg
  syscall
  j input_loop
  nop

invalid_input:
  li $v0, 4
  la $a0, invalid_msg
  syscall
  j input_loop
  nop

exit_program:
  li $v0, 4
  la $a0, goodbye_msg
  syscall

  li $v0, 10
  syscall

#असेंबली के दौरान प्रोजेक्ट फ़ाइलों से समाधान शामिल हैं।
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
