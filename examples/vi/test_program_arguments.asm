#Ví dụ về đối số chương trình
#Sử dụng ví dụ này để kiểm tra khả năng hỗ trợ argc/argv trong MARS.
#Để dùng thử, hãy đi tới Cài đặt > Đối số chương trình được cung cấp cho chương trình MIPS,
#nhập một số đối số, sau đó Lắp ráp và chạy chương trình.
#Đối số ví dụ: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #Chương trình demo cho các đối số của chương trình.
  #Khi vào:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #Lưu argc.
  move $s1, $a1          #Lưu argv.

  #In argc.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #Lặp lại argv[i].
  li   $t0, 0            #tôi = 0

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

  #argv là một mảng các con trỏ, vì vậy argv[i] có giá trị là argv + i * 4.
  sll  $t1, $t0, 2       #bù đắp = tôi * 4
  addu $t2, $s1, $t1     #địa chỉ của argv[i]
  lw   $a0, 0($t2)       #tải argv[i]

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
