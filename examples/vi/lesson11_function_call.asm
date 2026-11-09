# 11 - Gọi hàm
#
# Chạy với việc phân nhánh bị trì hoãn. `jal` nhảy tới hàm và đặt địa chỉ của lệnh tiếp theo vào
# `$ra`.
#
# Quy ước gọi vượt qua 17 và 42 trong `$a0` và `$a1`. Hàm trả về giá trị lớn hơn trong `$v0`.
#
# Bước vào cuộc gọi, so sánh `$ra` với địa chỉ sau `jal`, sau đó theo dõi `jr $ra` quay lại với
# người gọi.

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #đối số đầu tiên
        li   $a1, 42            #đối số thứ hai
        jal  maxof

        move $a0, $v0           #kết quả được trả về trong $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof là một hàm lá nên nó có thể trả về mà không cần lưu $ra vào ngăn xếp.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
