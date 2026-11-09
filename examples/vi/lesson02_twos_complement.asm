# 02 - Hai phần bù
#
# Trong phần bù hai 32 bit, đảo ngược các bit của 5 và cộng 1 sẽ tạo ra biểu diễn -5.
#
# Chương trình tính toán cùng một giá trị theo hai cách: `sub` từ 0, sau đó `nor` và `addi`.
#
# Cả hai đường dẫn đều in -5. Kiểm tra `0xFFFFFFFB` trong sổ đăng ký để xem các bit giống nhau
# trông như thế nào trong hệ thập lục phân.

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
