#বুদ্বুদ সাজানোর ডেমো
#একটি নির্দিষ্ট অ্যারে সাজায় এবং সাজানো মান প্রিন্ট করে।
#ধারণা: সূচিবদ্ধ শব্দ অ্যাক্সেস, নেস্টেড লুপ, স্বাক্ষরিত তুলনা এবং ইন-প্লেস অদলবদল।
#রেজিস্টার প্ল্যান: $s0 = অ্যারে বেস, $s1 = দৈর্ঘ্য, $t0/$t1 = লুপ ইনডেক্স।

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #i
outer:
  #I পাস করার পরে, i বৃহত্তম মানগুলি ইতিমধ্যে ডান প্রান্তে স্থির করা হয়েছে।
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #একটি শব্দ চার বাইট দখল করে, তাই arr[j] বেস + j*4।
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #সংলগ্ন মানগুলি অর্ডারের বাইরে: তাদের মেমরিতে বিনিময় করুন।
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4 এলিমেন্ট-বাই-এলিমেন্ট ট্রাভার্সালের আগে লেবেল প্রিন্ট করে।
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #arr[index] আনতে একই ঠিকানা গণনা পুনরায় ব্যবহার করুন।
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
