#ロード時のアドレス エラーの手動パリティ テスト。
#予想される動作:
#- 0x10010001 で発生したロード例外
#- 不正なアドレス / vaddr が 0x10010001 を示す

.data
value: .word 0x12345678

.text
main:
  lui $t0, 0x1001
  ori $t0, $t0, 0x0001
  lw $t1, 0($t0)
  ori $v0, $zero, 10
  syscall
