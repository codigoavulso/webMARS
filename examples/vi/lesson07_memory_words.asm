# 07 - Từ ngữ trong trí nhớ
#
# Địa chỉ bộ nhớ đếm byte. Mỗi từ chiếm bốn byte, vì vậy `lw` và `sw` sử dụng các giá trị bù 0,
# 4 và 8 ở đây.
#
# Địa chỉ từ phải là bội số của bốn. Việc sử dụng offset 1 thay vì 4 sẽ gây ra ngoại lệ căn
# chỉnh trong chương trình này.
#
# Sau các cửa hàng, hãy xem `cell` trong Phân đoạn dữ liệu. Ba từ liền kề phải chứa 111, 222 và
# 333.

        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #địa chỉ cơ sở

        #Mọi phần bù bên dưới đều liên quan đến $t0 và vẫn được căn chỉnh theo từ.
        li   $t1, 111
        sw   $t1, 0($t0)        #từ đầu tiên
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 byte = từ tiếp theo
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 byte

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw xây dựng lại các giá trị 32-bit tương tự được viết trước đó bởi sw.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
