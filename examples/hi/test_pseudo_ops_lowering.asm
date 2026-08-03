#छद्म-ऑप कम करने के लिए मैनुअल समता परीक्षण।
#चलाने के बाद, परिणामों पर डेटा खंड का निरीक्षण करें:
#परिणाम[0] = 1 सेकंड 5,5
#परिणाम[1] = 1 एसजीई 5,5
#परिणाम[2] = 5 एब्स -5
#परिणाम[3] = 0xfffffffa 5 नहीं

.data
results: .word 0, 0, 0, 0

.text
main:
  ori $t0, $zero, 5
  ori $t1, $zero, 5
  addiu $t2, $zero, -5

  seq $s0, $t0, $t1
  sge $s1, $t0, $t1
  abs $s2, $t2
  not $s3, $t0

  lui $t4, 0x1001
  ori $t4, $t4, 0x0000
  sw $s0, 0($t4)
  sw $s1, 4($t4)
  sw $s2, 8($t4)
  sw $s3, 12($t4)

  ori $v0, $zero, 10
  syscall
