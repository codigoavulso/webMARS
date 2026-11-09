# 01 - Sổ đăng ký và ngay lập tức
#
# Ngay lập tức được mã hóa trong hướng dẫn. Tập hợp và kiểm tra xem mỗi `li` sẽ trở thành hướng
# dẫn cơ bản nào.
#
# Bước qua hai tải và bổ sung. Trong Sổ đăng ký, hãy theo dõi `$t0 = 12`, `$t1 = 30` và
# `$t2 = 42`.
#
# Hãy thử thay thế 30 bằng `0x12345678` và lắp ráp lại. Hằng số lớn hơn cần nhiều hơn một lệnh
# cơ bản.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Syscalls sử dụng $v0 làm bộ chọn dịch vụ và $a0 làm đối số đầu tiên.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li là một lệnh giả; Assemble cho biết nó sẽ trở thành hướng dẫn thực sự nào.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # Tổng được ghi vào một sổ đăng ký khác.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
