# 字加载需要可被四整除的地址。本例使用0x10010001触发异常。
#预期行为：
#- 0x10010001 上引发加载异常
#- 错误地址/vaddr 显示 0x10010001

.data
value: .word 0x12345678

.text
main:
  lui $t0, 0x1001
  ori $t0, $t0, 0x0001
  lw $t1, 0($t0)
  ori $v0, $zero, 10
  syscall
