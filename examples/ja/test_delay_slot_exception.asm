#手動パリティテスト:
#遅延分岐を有効にすると、遅延スロットでオーバーフローが発生します。
#予想される動作:
#- 例外メッセージ: 算術オーバーフロー
#- 原因.BDセット
#- EPC は beq 命令を指します

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
