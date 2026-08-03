#कीबोर्ड और डिस्प्ले MMIO सिम्युलेटर डेमो
#टूल्स > कीबोर्ड और डिस्प्ले MMIO सिम्युलेटर खोलें
#निचले कीबोर्ड क्षेत्र में टाइप करें; अक्षर ऊपरी प्रदर्शन क्षेत्र में प्रतिध्वनित होते हैं।

.data
msg0: .asciiz "\n=== Keyboard/Display MMIO demo ===\n"
msg1: .asciiz "Open Tools > Keyboard and Display MMIO Simulator and connect to MIPS.\n"
msg2: .asciiz "Typed characters will be echoed by MMIO transmitter.\n"

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

  lui $s0, 0xffff         #MMIO आधार 0xFFFF0000

mmio_loop:
  #प्रतीक्षा करें कीबोर्ड रिसीवर तैयार (bit0 @ 0x0000)
wait_rx:
  lbu  $t0, 0x0000($s0)
  andi $t0, $t0, 1
  bne  $t0, $zero, receiver_ready
  nop
  li   $v0, 32             #सहकारी 4 एमएस प्रतीक्षा करें
  li   $a0, 4
  syscall
  b    wait_rx
  nop

receiver_ready:
  #चार पढ़ें @ 0x0004
  lbu  $t1, 0x0004($s0)

  #प्रतीक्षा करें डिस्प्ले ट्रांसमीटर तैयार है (bit0 @ 0x0008)
wait_tx:
  lbu  $t2, 0x0008($s0)
  andi $t2, $t2, 1
  bne  $t2, $zero, transmitter_ready
  nop
  li   $v0, 32             #सहकारी 4 एमएस प्रतीक्षा करें
  li   $a0, 4
  syscall
  b    wait_tx
  nop

transmitter_ready:
  #चार लिखें @ 0x000C
  sb   $t1, 0x000c($s0)

  j mmio_loop
