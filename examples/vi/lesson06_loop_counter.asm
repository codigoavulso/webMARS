# 06 - Vòng lặp như một bộ đếm
#
# `$t0` là số tiếp theo cần in. `$t1` là giới hạn trên độc quyền, vì vậy giới hạn 11 sẽ in từ 1
# đến 10.
#
# Việc so sánh chạy trước mỗi lần lặp. Việc tăng tiến tới giới hạn và bước nhảy lặp lại quá
# trình kiểm tra.
#
# Thay đổi giới hạn thành 1 và chạy. Nhánh thoát được lấy trước lần in đầu tiên.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #sổ đăng ký đếm
        li   $t1, 11            #giới hạn

loop:
        # Ở bài kiểm tra vòng lặp, $t0 là ứng cử viên tiếp theo. Chỉ in nếu nó ở dưới $t1.
        slt  $t2, $t0, $t1      #so sánh
        beq  $t2, $zero, endl   #thoát khi số lượng đạt đến giới hạn

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #Cập nhật bộ đếm trước khi nhảy đảm bảo tiến trình chấm dứt.
        addi $t0, $t0, 1        #bộ cộng
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
