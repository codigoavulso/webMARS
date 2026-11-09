# 09 - Lập chỉ mục một mảng
#
# Mỗi phần tử mảng chiếm bốn byte. Dịch chuyển chỉ số sang trái hai để tính toán độ lệch byte
# của nó.
#
# Thực hiện theo trình tự `sll`, `add`, `lw`: chia tỷ lệ chỉ mục, thêm địa chỉ cơ sở và tải phần
# tử.
#
# Ở chỉ số 2, `$t5` là 8 và `$t6` trỏ đến giá trị 30. Năm phần tử cộng lại bằng 150.

        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #cơ sở
        li   $t1, 0             #tôi
        li   $t2, 5             #chiều dài
        li   $t3, 0             #ắc quy

sum:
        #Bất biến vòng lặp: $t3 là tổng của mảng[0] đến mảng[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #tôi * 4 byte
        add  $t6, $t0, $t5      #chỉ số cơ sở + tỷ lệ
        #$t6 hiện đặt tên chính xác cho một phần tử; lw lấy giá trị 32-bit của nó.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
