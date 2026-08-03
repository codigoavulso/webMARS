#缓存行为基准：顺序访问与 stride-16 访问。
#打开“工具”>“数据缓存模拟工具”，将其连接到MIPS，然后选中“已启用”。
#
#每次执行只测量一种冷缓存模式。设置 ACCESS_PATTERN
#为1或2，重置模拟器统计信息，然后再次组装并运行。
#两种模式均执行 1024 次负载；没有初始化写入会污染数据。

.eqv ACCESS_PATTERN 1    #1 = 顺序，2 = 跨度 16 个字
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #模式 1：顺序地址。
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #模式2：每访问16个字，然后前进起始偏移量。
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
