#webMARS सिस्टम क्लॉक इंटरप्ट डेमो
#टूल्स > सिस्टम क्लॉक और टाइमर खोलें, इसे MIPS से कनेक्ट करें, असेंबल करें और चलाएं।
#एक नियतात्मक सिम्युलेटेड टाइमर हर 200 निर्देशों पर प्रोग्राम को बाधित करता है।

.eqv CLOCK_CONTROL 0xffff0050   #डिवाइस रजिस्टर MMIO ब्लॉक में रहते हैं
.eqv CLOCK_PERIOD  0xffff0058
.data
ticks: .word 0
message: .asciiz "Timer interrupts handled: "
.text
.globl main
main:
  li $t0, CLOCK_PERIOD
  li $t1, 200   #अवधि को निष्पादित निर्देशों में मापा जाता है, इसलिए रन बिल्कुल दोहराया जाता है
  sw $t1, 0($t0)
  li $t0, CLOCK_CONTROL
  li $t1, 3   #बिट 0 टाइमर प्रारंभ करता है, बिट 1 इसे व्यवधान उत्पन्न करने देता है
  sw $t1, 0($t0)
wait_for_ticks:
  lw $t2, ticks   #मुख्य कभी भी हैंडलर को कॉल नहीं करता है: CPU अपने आप उस पर पहुंच जाता है
  blt $t2, 5, wait_for_ticks
  nop
  sw $zero, 0($t0)   #समाप्त करने से पहले टाइमर बंद कर दें
  li $v0, 4
  la $a0, message
  syscall
  li $v0, 1
  move $a0, $t2
  syscall
  li $v0, 11
  li $a0, 10
  syscall
  li $v0, 10
  syscall
.ktext 0x80000180
timer_handler:
  mfc0 $k0, $13
  andi $k0, $k0, 0x0400
  beq $k0, $zero, handler_done
  nop
  la $k1, ticks
  lw $k0, 0($k1)
  addiu $k0, $k0, 1
  sw $k0, 0($k1)
handler_done:
  eret
