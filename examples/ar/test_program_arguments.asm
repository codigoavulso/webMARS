#مثال على وسيطات البرنامج.
#استخدم هذا المثال لاختبار دعم argc/argv في MARS.
#لتجربتها، انتقل إلى الإعدادات > وسائط البرنامج المتوفرة لبرنامج MIPS،
#أدخل بعض الوسائط، ثم قم بتجميع البرنامج وتشغيله.
#أمثلة على الوسائط: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #برنامج تجريبي لحجج البرنامج.
  #عند الدخول:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #احفظ argc.
  move $s1, $a1          #حفظ argv.

  #طباعة ارجك.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #حلقة فوق argv[i].
  li   $t0, 0            #ط = 0

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

  #argv عبارة عن مصفوفة من المؤشرات، لذا فإن argv[i] موجود عند argv + i * 4.
  sll  $t1, $t0, 2       #الإزاحة = ط * 4
  addu $t2, $s1, $t1     #عنوان argv[i]
  lw   $a0, 0($t2)       #تحميل argv[i]

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
