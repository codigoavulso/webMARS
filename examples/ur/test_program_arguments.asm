#پروگرام کے دلائل کی مثال۔
#MARS میں argc/argv سپورٹ کو جانچنے کے لیے اس مثال کو استعمال کریں۔
#اسے آزمانے کے لیے، MIPS پروگرام کو فراہم کردہ ترتیبات > پروگرام کے دلائل پر جائیں،
#کچھ دلائل درج کریں، پھر اسمبل کریں اور پروگرام چلائیں۔
#مثال کے دلائل: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #پروگرام کے دلائل کے لیے ڈیمو پروگرام۔
  #داخلے پر:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #argc کو محفوظ کریں۔
  move $s1, $a1          #argv کو محفوظ کریں۔

  #پرنٹ argc.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #argv[i] پر لوپ کریں۔
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

  #argv پوائنٹرز کی ایک صف ہے، لہذا argv[i] argv + i * 4 پر ہے۔
  sll  $t1, $t0, 2       #آفسیٹ = i * 4
  addu $t2, $s1, $t1     #argv[i] کا پتہ
  lw   $a0, 0($t2)       #لوڈ argv[i]

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
