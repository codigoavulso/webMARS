#कार्यक्रम तर्क उदाहरण.
#MARS में argc/argv समर्थन का परीक्षण करने के लिए इस उदाहरण का उपयोग करें।
#इसे आज़माने के लिए, सेटिंग्स > प्रोग्राम तर्कों पर जाएं जो MIPS प्रोग्राम को दिए गए हैं,
#कुछ तर्क दर्ज करें, फिर प्रोग्राम को असेंबल करें और चलाएं।
#उदाहरण तर्क: ओला 123 "एबीसी डीईएफ़"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #प्रोग्राम तर्कों के लिए डेमो प्रोग्राम।
  #प्रवेश पर:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #Argc सहेजें.
  move $s1, $a1          #Argv सहेजें.

  #Argc प्रिंट करें.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #Argv[i] पर लूप करें।
  li   $t0, 0            #मैं = 0

print_loop:
  beq  $t0, $s0, done

  li   $v0, 4
  la   $a0, argv_msg
  syscall

  li   $v0, 1
  move $a0, $t0
  syscall

  li   $v0, 4
  la   $a0, mid_msg
  syscall

  #argv पॉइंटर्स की एक सरणी है, इसलिए argv[i] argv + i * 4 पर है।
  sll  $t1, $t0, 2       #ऑफसेट = मैं *4
  addu $t2, $s1, $t1     #argv का पता[i]
  lw   $a0, 0($t2)       #argv लोड करें[i]

  li   $v0, 4
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  addiu $t0, $t0, 1
  j    print_loop

done:
  li   $v0, 10
  syscall
