# ==========================================================
#Bài 15 - Tại sao sải chân làm thay đổi tốc độ
#
#THE PROBLEM
#Hai vòng lặp bên dưới đọc cùng một mảng và thực hiện cùng một
#số lượng tải. Trên máy thật thì tốc độ chậm hơn rất nhiều. các
#số lượng hướng dẫn không thể giải thích nó.
#
#WHAT THE HARDWARE DOES
#Trí nhớ không cung cấp những từ đơn lẻ. Một lần bỏ lỡ lấy toàn bộ
#chặn, cá rằng các từ lân cận sẽ sớm bị truy nã.
#Một bước tiến của một người sẽ thu được số tiền đặt cược đó; một bước tiến mười sáu lần trả lương
#cho một khối và đọc một từ của nó.
#
#THE SOLUTION
#Không có gì trong mã thay đổi. Địa phương là tài sản của
#mẫu truy cập và đó là mẫu phải được sửa.
#
#WATCH FOR
#Mở Công cụ > Trình mô phỏng bộ đệm dữ liệu, nhấn Kết nối với MIPS,
#sau đó chạy. So sánh tốc độ trúng của hai vòng. Cả hai tổng
#in 0 vì mảng bằng 0 - số không phải là
#điểm ở đây, tỷ lệ trúng là.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
#---- từng từ của mỗi khối ----
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

#---- một từ mỗi khối, cách nhau mười sáu từ ----
        li   $t1, 0
        li   $t3, 0
far:
        #Thêm 16 lần bỏ qua 64 byte mỗi lần lặp: thường là toàn bộ khối bộ đệm.
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
