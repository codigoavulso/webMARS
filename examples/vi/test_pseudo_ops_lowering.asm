#Kiểm tra tính chẵn lẻ bằng tay để hạ thấp pseudo-op.
#Sau khi chạy, kiểm tra đoạn dữ liệu có kết quả:
#kết quả[0] = 1 giây 5,5
#results[1] = 1 sge 5,5
#kết quả[2] = 5 cơ bụng -5
#kết quả[3] = 0xfffffffa không phải 5

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
