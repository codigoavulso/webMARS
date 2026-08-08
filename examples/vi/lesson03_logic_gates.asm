# ==========================================================
#Bài 03 - Cổng logic trên 32 bit
#
#THE PROBLEM
#AND, OR và XOR là các cổng một bit. Một thanh ghi chứa 32 bit.
#Một cánh cổng có ý nghĩa gì ở chiều rộng đó?
#
#WHAT THE HARDWARE DOES
#Nó đặt 32 bản sao của cổng cạnh nhau. Bit 0 của
#kết quả chỉ phụ thuộc vào bit 0 của mỗi toán hạng, chỉ phụ thuộc vào bit 1
#bit 1, v.v. Không có hành trình mang theo giữa chúng.
#
#THE SOLUTION
#Sự độc lập đó là điều khiến chiếc mặt nạ hoạt động: hãy chọn cái nào
#các bit cần giữ với AND, buộc thành một bằng OR, lật bằng XOR.
#
#WATCH FOR
#0xCC là 11001100 và mặt nạ 0x0F là 00001111. AND giữ nguyên
#bốn bit thấp, OR đặt chúng, XOR lật chúng. Chỉ có
#nibble thấp bao giờ thay đổi.
# ==========================================================
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
