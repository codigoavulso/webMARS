# ==========================================================
#Bài 07 - Từ trong bộ nhớ và tại sao địa chỉ nhảy lên bốn
#
#THE PROBLEM
#Bộ nhớ được đánh địa chỉ một byte mỗi lần, nhưng một thanh ghi vẫn giữ
#bốn byte. Một địa chỉ thực sự chọn gì?
#
#WHAT THE HARDWARE DOES
#lw và sw di chuyển bốn byte trong một lần truy cập, sao cho liên tiếp
#các từ ngồi cách nhau bốn địa chỉ. Hai bit thấp của
#địa chỉ phải bằng 0: sự căn chỉnh đó là điều cho phép
#phần cứng lấy toàn bộ một từ trong một chu kỳ.
#
#THE SOLUTION
#Số học địa chỉ được thực hiện theo byte, do đó chỉ mục thành các từ
#luôn được chia tỷ lệ bằng bốn.
#
#WATCH FOR
#Lắp ráp, sau đó mở Data Segment tại 0x10010000. các
#ba giá trị xuất hiện trong các cột liền kề của một hàng.
# ==========================================================
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
