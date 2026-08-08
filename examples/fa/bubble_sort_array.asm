#نسخه ی نمایشی مرتب سازی حباب
#یک آرایه ثابت را مرتب می کند و مقادیر مرتب شده را چاپ می کند.
#مفاهیم: دسترسی به کلمات نمایه شده، حلقه های تو در تو، مقایسه امضا شده و مبادله در محل.
#طرح ثبت: $s0 = پایه آرایه، $s1 = طول، $t0/$t1 = فهرست‌های حلقه.

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #من
outer:
  #پس از پاس i، بزرگترین مقادیر i قبلاً در لبه سمت راست ثابت شده اند.
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #یک کلمه چهار بایت را اشغال می کند، بنابراین arr[j] در پایه + j*4 است.
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #مقادیر مجاور نامرتب هستند: آنها را در حافظه مبادله کنید.
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4 برچسب را قبل از پیمایش عنصر به عنصر چاپ می کند.
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #از همان محاسبه آدرس برای واکشی arr[index] دوباره استفاده کنید.
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
