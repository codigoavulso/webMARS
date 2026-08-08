#Điểm chuẩn hành vi của bộ đệm: truy cập tuần tự so với bước 16.
#Mở Công cụ > Công cụ mô phỏng bộ nhớ đệm dữ liệu, kết nối nó với MIPS và chọn Đã bật.
#
#Mỗi lần thực thi đo chính xác một mẫu bộ nhớ đệm nguội. Đặt ACCESS_PATTERN
#về 1 hoặc 2, đặt lại số liệu thống kê của trình mô phỏng, sau đó tập hợp và chạy lại.
#Cả hai mẫu đều thực hiện 1024 lần tải; không khởi tạo ghi làm ô nhiễm dữ liệu.

.eqv ACCESS_PATTERN 1    #1 = tuần tự, 2 = sải bước 16 từ
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #Mẫu 1: địa chỉ tuần tự.
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #Mẫu 2: truy cập từng từ thứ 16, sau đó tiến tới phần bù bắt đầu.
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
