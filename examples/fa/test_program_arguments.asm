#مثال آرگومان های برنامه
#از این مثال برای آزمایش پشتیبانی argc/argv در MARS استفاده کنید.
#برای امتحان کردن، به تنظیمات > آرگومان های برنامه ارائه شده به برنامه MIPS بروید،
#چند آرگومان وارد کنید، سپس برنامه را Assemble و اجرا کنید.
#آرگومان های مثال: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #برنامه آزمایشی برای آرگومان های برنامه.
  #هنگام ورود:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #argc را ذخیره کنید.
  move $s1, $a1          #ذخیره argv.

  #چاپ argc.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #حلقه روی argv[i].
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

  #argv آرایه ای از اشاره گرها است، بنابراین argv[i] در argv + i * 4 است.
  sll  $t1, $t0, 2       #افست = i * 4
  addu $t2, $s1, $t1     #آدرس argv[i]
  lw   $a0, 0($t2)       #بارگذاری argv[i]

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
