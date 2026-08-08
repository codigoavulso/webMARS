#デジタルラボシミュレーションテスト
#ツールマッピング (デフォルト MMIO ベース 0xFFFF0000):
#右の桁を表示: 0xFFFF0010
#表示左桁：0xFFFF0011
#キーボード Ctrl : 0xFFFF0012
#キーボード出力コード: 0xFFFF0014
#
#Digital Lab Sim キーパッドのキーをクリックします。
#プログラムはスキャン コードをデコードし、押されたキーの値 (0..f) を表示します。

.data
msg0:   .asciiz "\n=== Digital Lab Sim demo ===\n"
msg1:   .asciiz "Open Tools > Digital Lab Sim and click keypad buttons.\n"
msg2:   .asciiz "Displaying pressed key value (0..f) on 7-segment.\n"
segmap: .byte 0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f,0x77,0x7c,0x39,0x5e,0x79,0x71

.text
main:
  li $v0, 4
  la $a0, msg0
  syscall
  li $v0, 4
  la $a0, msg1
  syscall
  li $v0, 4
  la $a0, msg2
  syscall

  lui $t0, 0xffff
  li $t1, 0x0f
  sb $t1, 0x12($t0)      #すべての行をスキャンする

  sb $zero, 0x11($t0)    #左の桁が空白
  move $s1, $zero        #最後に処理されたスキャンコード

wait_key:
  lbu $t2, 0x14($t0)     #キーボード スキャン コード (col<<4 | row)
  beq $t2, $zero, key_idle
  nop
  bne $t2, $s1, key_ready
  nop
key_idle:
  move $s1, $t2
  li  $v0, 32            #協調 4 ミリ秒待機
  li  $a0, 4
  syscall
  b   wait_key
  nop

key_ready:
  move $s1, $t2
  #行ビット (下位ニブル) と列ビット (上位ニブル)
  andi $t3, $t2, 0x0f    #行ビット: 1、2、4、8
  srl  $t4, $t2, 4       #コルビット: 1、2、4、8

  #行インデックス = log2(rowBit)
  li $t5, 0
row_idx_loop:
  li $t6, 1
  beq $t3, $t6, row_idx_done
  srl $t3, $t3, 1
  addiu $t5, $t5, 1
  j row_idx_loop
row_idx_done:

  #列インデックス = log2(colBit)
  li $t6, 0
col_idx_loop:
  li $t7, 1
  beq $t4, $t7, col_idx_done
  srl $t4, $t4, 1
  addiu $t6, $t6, 1
  j col_idx_loop
col_idx_done:

  #キーニブル = 行*4 + 列 (値 0..15)
  sll $t5, $t5, 2
  addu $a0, $t5, $t6

  jal nibble_to_7seg
  sb $v0, 0x10($t0)      #押されたキーを右の桁に表示

  j wait_key

#a0: ニブル 0..15
#v0: 7 セグメント パターン
nibble_to_7seg:
  la $t5, segmap
  addu $t5, $t5, $a0
  lbu $v0, 0($t5)
  jr $ra
