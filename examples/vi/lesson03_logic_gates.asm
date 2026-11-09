# 03 - Cổng logic trên 32 bit
#
# Mỗi bit kết quả chỉ phụ thuộc vào các bit tương ứng của hai toán hạng. Không có sự mang theo
# giữa các vị trí bit.
#
# Với mặt nạ `0x0F`, AND giữ bốn bit thấp và xóa phần còn lại. HOẶC đặt bốn bit thấp và XOR lật
# chúng.
#
# So sánh ba kết quả ở dạng thập lục phân, sau đó thử mặt nạ `0xF0` để xử lý nhóm bốn bit tiếp
# theo.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F mặt nạ

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND xóa mọi vị trí mà mặt nạ chứa số 0.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR chỉ chuyển đổi các vị trí được chọn bởi các vị trí trong mặt nạ.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
