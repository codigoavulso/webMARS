#数字を当ててください (1..100)
#乱数の生成には syscall 42 を使用し、整数入力には syscall 5 を使用します。
#$s0 はシステムコール全体で秘密を保持します。 $s1 は、ループ反復全体の試行をカウントします。

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #任意のシードを持つランダム ストリーム ID=1 をシードします。
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #範囲 [0,100) のランダムな整数、その後 [1,100] にシフトします。
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  # Syscall 42 は生成された値を次のように返します。 $a0、ではありません $v0.
  addiu $s0, $a0, 1      #秘密の番号
  li $s1, 0              #試み

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #システムコールは引数/結果レジスタを上書きする可能性があるため、永続的な状態は $s レジスタに残ります。
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #整数入力は $v0 に返されます。
  move $t0, $v0          #推測する
  addiu $s1, $s1, 1

  #推測 < 秘密 => が低すぎる場合
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #if 秘密 < 推測 => 高すぎます
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #等しい => 勝つ
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #両方のフィードバック ブランチは次の反復で収束します。
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
