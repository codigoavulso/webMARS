#运行 I/O 的 Hello World
#打印一条简单的消息并退出。
#这是数据/文本分割和系统调用约定的最小示例。

.data
#.asciiz 存储系统调用 4 所需的后跟零终止符的字符。
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #在 $v0 中选择打印字符串 (4)，并在 $a0 中传递字符串地址。
  li $v0, 4
  la $a0, msg
  syscall

  #Exit (10) 完全停止模拟程序。
  li $v0, 10
  syscall
