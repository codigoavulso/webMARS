# ==========================================================
#Bài 04 - Phép dịch, hay phép nhân bằng dây
#
#THE PROBLEM
#Hệ số nhân tổng quát là một trong những khối đắt nhất trong
#một đường dẫn dữ liệu. Nhân với 8 sẽ không tốn nhiều tiền như vậy.
#
#WHAT THE HARDWARE DOES
#Một sự thay đổi hoàn toàn không phải là số học: đó là cùng một bit được đọc
#từ các dây khác nhau. Dịch sang trái với n nhân với 2^n
#và chỉ tốn chi phí định tuyến.
#
#THE SOLUTION
#Sức mạnh của hai trở thành sự thay đổi. Lưu ý hai ca bên phải: srl
#đưa số 0 vào ở trên cùng, sra sao chép bit dấu, vì vậy chỉ
#sra chia số âm một cách chính xác.
#
#WATCH FOR
#-16 >> 2 cho -4 với sra nhưng là một giá trị dương rất lớn với srl. các
#các bit di chuyển giống hệt nhau; chỉ những gì được nhập ở trên cùng là khác.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #Ba ca trái nhân với 2^3 trong khi chỉ giữ lại 32 bit kết quả.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #So sánh $t3 và $t4 theo hệ thập lục phân để xem các bit đến khác nhau.
        sra  $t3, $t2, 2        #dấu hiệu được bảo toàn: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #số không chuyển vào: dương rất lớn
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
