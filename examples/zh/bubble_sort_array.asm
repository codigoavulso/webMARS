#冒泡排序演示
#对固定数组进行排序并打印排序值。
#概念：索引字访问、嵌套循环、有符号比较和就地交换。
#寄存器计划：$s0 = 数组基址，$s1 = 长度，$t0/$t1 = 循环索引。

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #我
outer:
  #经过 i 次后，第 i 个最大值已经固定在右边缘。
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #一个字占用四个字节，因此arr[j]位于base + j*4处。
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #相邻值无序：在内存中交换它们。
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #系统调用 4 在逐元素遍历之前打印标签。
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #重复使用相同的地址计算来获取 arr[index]。
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
