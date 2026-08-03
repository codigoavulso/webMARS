#मल्टी-फ़ाइल उदाहरण सहायक 1/2
#इनपुट: $a0 = संख्या
#आउटपुट: $v0 = "सम" या "विषम" संदेश का पता

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #सबसे कम महत्वपूर्ण बिट सम संख्याओं के लिए 0 और विषम संख्याओं के लिए 1 है।
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #यहां प्रिंट करने के बजाय पता लौटाएं; कॉल करने वाला चुनता है कि इसका उपयोग कैसे करना है।
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
