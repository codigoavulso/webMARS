# 08 - Byte và thứ tự byte
#
# Trong bộ nhớ endian nhỏ của trình mô phỏng này, byte có ý nghĩa nhỏ nhất của một từ nằm ở địa
# chỉ thấp nhất.
#
# Lưu trữ `0x04030201` dưới dạng Word và đọc các giá trị chênh lệch từ 0 đến 3 dưới dạng byte.
# Đầu ra là 1, 2, 3, 4.
#
# Hãy thử byte thấp `0xFF`. Tải không dấu với `lbu` cho kết quả 255, trong khi tải có dấu với
# `lb` cho kết quả -1.

        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #byte 01 ít quan trọng nhất
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #bù byte
bloop:
        #Vòng lặp truy cập offset 0, 1, 2 và 3 bên trong từ được lưu trữ.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Địa chỉ hiệu dụng = địa chỉ cơ sở + độ lệch byte hiện tại.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #byte không dấu
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
