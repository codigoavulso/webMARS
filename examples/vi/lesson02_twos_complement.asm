# ==========================================================
#Bài 02 - Hai phần bù
#
#THE PROBLEM
#Một thanh ghi có 32 dây, mỗi dây cao hoặc thấp. Không có dây
#đối với dấu trừ, số âm vẫn phải hoạt động.
#
#WHAT THE HARDWARE DOES
#Nó đọc bit trên cùng dưới dạng một dấu hiệu, nhưng không phải dưới dạng cờ riêng biệt:
#-n được lưu trữ dưới dạng mẫu bit, được thêm vào n, kết thúc thành
#không. Đảo ngược từng bit và thêm một bit và bạn có nó.
#
#THE SOLUTION
#Phép trừ không cần mạch thứ hai. a - b trở thành
#a + (-b), do đó một bộ cộng phục vụ cả hai thao tác.
#
#WATCH FOR
#Cả hai nửa đều in -5. Người thứ hai đạt được nó một chặng đường dài,
#với nor và addi, hiển thị những gì sub thực hiện trong nội bộ.
#Đặt Giá trị thành thập lục phân để xem 0xFFFFFFFB.
# ==========================================================
        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #Trừ từ 0 tạo thành nghịch đảo cộng không có bit dấu trừ.
        li   $t0, 5
        sub  $t1, $zero, $t0    #bộ cộng thực hiện công việc
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #cũng như với $zero là bitwise NOT; cộng một sẽ hoàn thành phần bù hai.
        nor  $t2, $t0, $zero    #đảo ngược tất cả các bit
        addi $t2, $t2, 1        #thêm một
        move $a0, $t2           #cùng giá trị như trên
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
