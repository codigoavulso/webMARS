#Bản demo sắp xếp bong bóng
#Sắp xếp một mảng cố định và in các giá trị đã sắp xếp.
#Các khái niệm: truy cập từ được lập chỉ mục, vòng lặp lồng nhau, so sánh có dấu và hoán đổi tại chỗ.
#Gói đăng ký: $s0 = cơ sở mảng, $s1 = chiều dài, $t0/$t1 = chỉ mục vòng lặp.

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #tôi
outer:
  #Sau khi vượt qua i, giá trị lớn nhất của i đã được cố định ở cạnh phải.
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #Một từ chiếm bốn byte, vì vậy arr[j] có cơ sở + j*4.
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #Các giá trị liền kề không theo thứ tự: trao đổi chúng trong bộ nhớ.
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4 in nhãn trước khi duyệt từng phần tử.
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #Sử dụng lại phép tính địa chỉ tương tự để tìm nạp arr[index].
  bge $t7, $s1, end
  sll $t3, $t7, 2
  addu $t4, $s0, $t3
  lw  $a0, 0($t4)
  li  $v0, 1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addiu $t7, $t7, 1
  j print_loop

end:
  li $v0, 11
  li $a0, '\n'
  syscall
  li $v0, 10
  syscall
