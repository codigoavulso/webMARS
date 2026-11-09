# 15 - Tại sao sải chân làm thay đổi tốc độ
#
# Cả hai vòng lặp đều sử dụng cùng một mảng. Đầu tiên đọc tất cả 256 từ; cái thứ hai đọc mỗi từ
# thứ 16, chỉ thực hiện được 16 lần tải.
#
# Với các khối bộ đệm gồm 16 từ, các lần đọc tuần tự có thể sử dụng lại từng khối được tìm nạp.
# Vòng lặp thứ hai tiến tới một khối mới ở mỗi lần tải.
#
# Kết nối bộ mô phỏng với MIPS, đánh dấu «Đã bật» và đặt kích thước khối thành 16 từ.
# Sử dụng Trình mô phỏng bộ đệm dữ liệu với điểm dừng ở `far` để kiểm tra vòng lặp đầu tiên. Đặt
# lại số liệu thống kê bộ đệm ở đó trước khi chạy vòng lặp thứ hai và so sánh tỷ lệ trúng.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Pass tuần tự: tất cả 256 từ.
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Chỉ mục tuần tự sử dụng lại các từ từ mỗi khối bộ đệm trước khi tiếp tục.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# Strided pass: tải một lần cho mỗi mười sáu từ.
        li   $t1, 0
        li   $t3, 0
far:
        # Địa chỉ tiếp theo cách đó 64 byte: mười sáu từ, mỗi từ bốn byte.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
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
