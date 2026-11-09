# 12 - Đệ quy và khung
#
# Lệnh gọi đệ quy ghi đè `$ra` và sử dụng `$a0` cho đối số của chính nó. Lưu cả hai giá trị
# trước khi thực hiện cuộc gọi.
#
# Nhập vào `fact` cho mỗi giá trị từ 5 đến 1. Mỗi lệnh gọi đều dự trữ 8 byte, bao gồm cả lệnh
# gọi trả về 1.
#
# Đặt điểm ngắt trên `mul` để xem đường dẫn quay lại. Mỗi cuộc gọi sẽ tải lại đối số của chính
# nó, nhân lên và giải phóng khung của nó.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- thực tế int(int n) ----
fact:
        #Mỗi lệnh gọi sở hữu một khung 8 byte riêng biệt.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #địa chỉ trả lại của cuộc gọi này
        sw   $a0, 4($sp)        #cuộc gọi này là n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #trường hợp cơ bản: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #lần nữa của chúng ta
        mul  $v0, $v0, $a0

factend:
        # Khôi phục địa chỉ trả lại đã lưu trước khi giải phóng khung của cuộc gọi này.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
