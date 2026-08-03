#মাল্টি-ফাইল উদাহরণ সহকারী 1/2
#ইনপুট: $a0 = সংখ্যা
#আউটপুট: $v0 = "জোড়" বা "বিজোড়" বার্তার ঠিকানা

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #সবচেয়ে কম-গুরুত্বপূর্ণ বিটটি জোড় সংখ্যার জন্য 0 এবং বিজোড় সংখ্যার জন্য 1।
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #এখানে প্রিন্ট করার পরিবর্তে একটি ঠিকানা ফেরত দিন; কলকারী এটি কীভাবে ব্যবহার করবেন তা বেছে নেয়।
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
