#बबल सॉर्ट डेमो
#एक निश्चित सरणी को सॉर्ट करता है और क्रमबद्ध मानों को प्रिंट करता है।
#अवधारणाएँ: अनुक्रमित शब्द पहुंच, नेस्टेड लूप, हस्ताक्षरित तुलना और इन-प्लेस स्वैप।
#रजिस्टर योजना: $s0 = सरणी आधार, $s1 = लंबाई, $t0/$t1 = लूप इंडेक्स।

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #मैं
outer:
  #i पास करने के बाद, i का सबसे बड़ा मान पहले से ही दाहिने किनारे पर तय हो गया है।
  bge $t0, $s1, print
  li  $t1, 0              #जे
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #एक शब्द चार बाइट्स घेरता है, इसलिए arr[j] आधार + j*4 पर है।
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #निकटवर्ती मान क्रम से बाहर हैं: उन्हें स्मृति में बदलें।
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4 तत्व-दर-तत्व ट्रैवर्सल से पहले लेबल प्रिंट करता है।
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #गिरफ्तारी[सूचकांक] लाने के लिए उसी पते की गणना का पुन: उपयोग करें।
  bge $t7, $s1, end
  sll $t3, $t7, 2
  addu $t4, $s0, $t3
  lw  $a0, 0($t4)
  li  $v0, 1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addiu $t7, $t7, 1
  j print_loop

end:
  li $v0, 11
  li $a0, '\n'
  syscall
  li $v0, 10
  syscall
