#複数ファイルの例: メインモジュール
#このファイルをアクティブなままにして、「Assemble」を押します。
#以下の .include ディレクティブは、他の 2 つのファイルを取り込みます。
#- parity.asm は、数値が偶数か奇数かを示すメッセージを返します。
#- prime.asm は、数値が素数の場合、$v0 に 1 を返します
#
#フロー:
#1. [1,100] の数字を入力するか、終了するには 0 を入力してください
#2. 数値が偶数か奇数かを出力します
#3. 数値が素数かどうかを出力します
#4. 繰り返します

.data
#このモジュールはユーザー向けの文字列を所有します。ヘルパー モジュールはプライベート データ/コードを所有します。
title:         .asciiz "\n=== Multi-file number analyzer ===\n"
hint:          .asciiz "This example uses 3 separate files assembled together.\n"
prompt:        .asciiz "Enter a number [1..100] (0 to exit): "
invalid_msg:   .asciiz "Please enter a value between 1 and 100.\n"
result_prefix: .asciiz "Number "
parity_prefix: .asciiz " is "
prime_yes_msg: .asciiz " and it is prime.\n"
prime_no_msg:  .asciiz " and it is not prime.\n"
goodbye_msg:   .asciiz "Bye!\n"

.text
.globl main
main:
  li $v0, 4
  la $a0, title
  syscall

  li $v0, 4
  la $a0, hint
  syscall

input_loop:
  #Syscall 5 は、$v0 に入力された整数を返します。
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  move $s0, $v0

  beq $s0, $zero, exit_program
  nop

  #符号付き比較を使用して下限と上限を検証します。
  slti $t0, $s0, 1
  bne $t0, $zero, invalid_input
  nop

  slti $t0, $s0, 101
  beq $t0, $zero, invalid_input
  nop

  li $v0, 4
  la $a0, result_prefix
  syscall

  li $v0, 1
  #o32 呼び出し規約: $a0 の引数、$v0 の結果ポインタ。
  move $a0, $s0
  syscall

  li $v0, 4
  la $a0, parity_prefix
  syscall

  #2 番目のモジュールは $v0 でブール値を返します。
  move $a0, $s0
  jal get_parity_message
  nop

  move $s1, $v0
  li $v0, 4
  move $a0, $s1
  syscall

  move $a0, $s0
  jal is_prime
  nop

  bne $v0, $zero, print_prime_yes
  nop

  li $v0, 4
  la $a0, prime_no_msg
  syscall
  j input_loop
  nop

print_prime_yes:
  li $v0, 4
  la $a0, prime_yes_msg
  syscall
  j input_loop
  nop

invalid_input:
  li $v0, 4
  la $a0, invalid_msg
  syscall
  j input_loop
  nop

exit_program:
  li $v0, 4
  la $a0, goodbye_msg
  syscall

  li $v0, 10
  syscall

#インクルードは、アセンブリ中にプロジェクト ファイルから解決されます。
.include "learn/multi_file_number_analyzer/parity.asm"
.include "learn/multi_file_number_analyzer/prime.asm"
