#अपवाद-हैंडलर डेमो पुनर्प्राप्त किया जा रहा है।
#असंरेखित स्टोर एड्रेस एरर (स्टोर) बढ़ाता है। हैंडलर रिकॉर्ड करता है
#कारण, EPC और BadVAddr, दोषपूर्ण निर्देश को छोड़ देता है और ERET के साथ लौटता है।

.data
recovered:     .asciiz "Recovered from the exception.\n"
cause_label:   .asciiz "Cause: "
epc_label:     .asciiz "EPC: "
badvaddr_label:.asciiz "BadVAddr: "
newline:       .asciiz "\n"
saved_cause:   .word 0
saved_epc:     .word 0
saved_badvaddr:.word 0

.text
main:
  li $t0, 0x12345678
  #पता 1 शब्द-संरेखित नहीं है, इसलिए यह निर्देश जानबूझकर गलतियाँ करता है।
  sw $t0, 1($zero)

  #हैंडलर द्वारा एक निर्देश द्वारा EPC आगे बढ़ाने के बाद यहां निष्पादन फिर से शुरू होता है।
  li $v0, 4
  la $a0, recovered
  syscall

  la $a0, cause_label
  syscall
  lw $a0, saved_cause
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, epc_label
  syscall
  lw $a0, saved_epc
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, badvaddr_label
  syscall
  lw $a0, saved_badvaddr
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

.ktext 0x80000180
exception_handler:
  #CP0 रजिस्टर 13 = कारण, 14 = EPC, 8 = BadVAddr.
  #कर्नेल रजिस्टर $k0/$k1 बाधित उपयोगकर्ता रजिस्टरों को दूषित करने से बचें।
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #ज्ञात दोषपूर्ण 4-बाइट अनुदेश को छोड़ें; इसे दोबारा प्रयास करने पर हमेशा के लिए गलती हो जाएगी।
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
