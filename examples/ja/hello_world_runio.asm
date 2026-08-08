#実行 I/O の Hello World
#簡単なメッセージを出力して終了します。
#これは、データ/テキストの分割と syscall 規約の最小の例です。

.data
#.asciiz には、syscall 4 で必要なゼロ ターミネータが後に続く文字が格納されます。
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #$v0 で print-string (4) を選択し、文字列アドレスを $a0 に渡します。
  li $v0, 4
  la $a0, msg
  syscall

  #終了 (10) は、シミュレートされたプログラムを正常に停止します。
  li $v0, 10
  syscall
