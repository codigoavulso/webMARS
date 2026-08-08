#プログラムの引数の例。
#この例を使用して、MARS での argc/argv サポートをテストします。
#これを試すには、[設定] > MIPS プログラムに提供されるプログラム引数に移動します。
#いくつかの引数を入力し、プログラムをアセンブルして実行します。
#引数の例: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #プログラム引数のデモ プログラム。
  #入場時：
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #引数を保存します。
  move $s1, $a1          #引数を保存します。

  #argc を出力します。
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #argv[i] をループします。
  li   $t0, 0            #i = 0

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

  #argv はポインターの配列であるため、argv[i] は argv + i * 4 になります。
  sll  $t1, $t0, 2       #オフセット = i * 4
  addu $t2, $s1, $t1     #argv[i]のアドレス
  lw   $a0, 0($t2)       #argv[i]をロードします

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
