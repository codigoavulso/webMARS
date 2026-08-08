#擬似動作を下げるための手動パリティ テスト。
#実行後、結果のデータ セグメントを検査します。
#結果[0] = 1 シーケンス 5,5
#結果[1] = 1 sge 5,5
#結果[2] = 5 腹筋 -5
#結果[3] = 0xfffffffa ではありません 5

.data
results: .word 0, 0, 0, 0

.text
main:
  ori $t0, $zero, 5
  ori $t1, $zero, 5
  addiu $t2, $zero, -5

  seq $s0, $t0, $t1
  sge $s1, $t0, $t1
  abs $s2, $t2
  not $s3, $t0

  lui $t4, 0x1001
  ori $t4, $t4, 0x0000
  sw $s0, 0($t4)
  sw $s1, 4($t4)
  sw $s2, 8($t4)
  sw $s3, 12($t4)

  ori $v0, $zero, 10
  syscall
