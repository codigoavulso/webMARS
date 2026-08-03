#手动奇偶校验测试：
#启用延迟分支后，溢出发生在延迟槽中。
#预期行为：
#- 异常消息：算术溢出
#- Cause.BD设置
#- EPC 指向beq指令

.text
main:
  lui $t1, 0x7fff
  ori $t1, $t1, 0xffff
  ori $t2, $zero, 1
  beq $zero, $zero, done
  add $t0, $t1, $t2

done:
  ori $v0, $zero, 10
  syscall
