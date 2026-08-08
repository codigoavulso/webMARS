# ==========================================================
#Bài 10 - Ngăn xếp là một thanh ghi và một offset
#
#THE PROBLEM
#Có 32 thanh ghi và chúng được chia sẻ bởi mọi phần của
#mã. Một giá trị sẽ đi đâu khi nó phải tồn tại trong công việc đó
#sẽ sử dụng lại những sổ đăng ký đó?
#
#WHAT THE HARDWARE DOES
#Không có gì đặc biệt cả. $sp là một thanh ghi thông thường
#tình cờ trỏ vào bộ nhớ và ngăn xếp tăng dần về phía
#địa chỉ thấp hơn hoàn toàn theo quy ước.
#
#THE SOLUTION
#Đặt trước dung lượng là một phép trừ khỏi $sp, giải phóng nó
#bổ sung. Đẩy và bật chỉ là sw và lw.
#
#WATCH FOR
#Các sổ đăng ký được cố tình xóa giữa các cửa hàng
#và tải, vì vậy các giá trị được in chỉ có thể đến
#trở về từ ký ức. Xem $sp di chuyển 8 và quay lại.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Ngăn xếp tăng dần xuống dưới, do đó phân bổ sẽ trừ đi $sp.
        addi $sp, $sp, -8       #dự trữ hai từ
        sw   $t0, 0($sp)        #đẩy
        sw   $t1, 4($sp)

        li   $t0, 0             #ghi đè sổ đăng ký
        li   $t1, 0

        lw   $t0, 0($sp)        #bật lên
        lw   $t1, 4($sp)
        #Mọi phân bổ phải được cân bằng để người gọi nhìn thấy $sp ban đầu của nó.
        addi $sp, $sp, 8        #phát hành

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
