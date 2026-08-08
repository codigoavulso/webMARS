#ตัวอย่างอาร์กิวเมนต์ของโปรแกรม
#ใช้ตัวอย่างนี้เพื่อทดสอบการสนับสนุน argc/argv ใน MARS
#หากต้องการลอง ให้ไปที่การตั้งค่า > อาร์กิวเมนต์ของโปรแกรมที่มอบให้กับโปรแกรม MIPS
#ป้อนอาร์กิวเมนต์ จากนั้นประกอบและรันโปรแกรม
#อาร์กิวเมนต์ตัวอย่าง: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #โปรแกรมสาธิตข้อโต้แย้งของโปรแกรม
  #เมื่อเข้า:
  #$a0 = อาร์กิวเมนต์
  #$a1 = อาร์กิวเมนต์
  move $s0, $a0          #บันทึก argc.
  move $s1, $a1          #บันทึก argv.

  #พิมพ์อาร์จีซี
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #วนซ้ำ argv[i]
  li   $t0, 0            #ฉัน = 0

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

  #argv เป็นอาร์เรย์ของพอยน์เตอร์ ดังนั้น argv[i] จึงอยู่ที่ argv + i * 4
  sll  $t1, $t0, 2       #ออฟเซ็ต = i * 4
  addu $t2, $s1, $t1     #ที่อยู่ของ argv[i]
  lw   $a0, 0($t2)       #โหลด argv[i]

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
