#程序参数示例。
#使用此示例来测试 MARS 中的 argc/argv 支持。
#要尝试它，请转至设置 > 提供给 MIPS 程序的程序参数，
#输入一些参数，然后汇编并运行程序。
#参数示例：ola 123“abc def”

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #程序参数的演示程序。
  #入场时：
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #保存argc。
  move $s1, $a1          #保存argv。

  #打印argc。
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #循环 argv[i]。
  li   $t0, 0            #我=0

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

  #argv 是一个指针数组，因此 argv[i] 位于 argv + i * 4 处。
  sll  $t1, $t0, 2       #偏移量 = i * 4
  addu $t2, $s1, $t1     #argv[i] 的地址
  lw   $a0, 0($t2)       #加载argv[i]

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
