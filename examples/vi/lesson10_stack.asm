# 10 - Ngăn xếp
#
# Theo quy ước, ngăn xếp sẽ phát triển về các địa chỉ thấp hơn. Trừ 8 từ `$sp` để dành chỗ cho
# hai từ.
#
# Chương trình lưu hai thanh ghi với `sw`, xóa chúng, sau đó khôi phục giá trị của chúng bằng
# `lw`.
#
# Xem `$sp` trước khi đặt chỗ, trong thời gian mở cửa hàng và sau khi ra mắt. Giá trị cuối cùng
# của nó phải khớp với giá trị ban đầu của nó.

        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Ngăn xếp tăng dần xuống dưới, do đó phân bổ sẽ trừ đi $sp.
        addi $sp, $sp, -8       #dự trữ hai từ
        sw   $t0, 0($sp)        #đẩy
        sw   $t1, 4($sp)

        li   $t0, 0             #ghi đè sổ đăng ký
        li   $t1, 0

        lw   $t0, 0($sp)        #bật lên
        lw   $t1, 4($sp)
        #Mọi phân bổ phải được cân bằng để người gọi nhìn thấy $sp ban đầu của nó.
        addi $sp, $sp, 8        #phát hành

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
