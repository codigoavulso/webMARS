# ==========================================================
#Bài 06 - Bộ đếm trong phần mềm và phần cứng
#
#THE PROBLEM
#Bộ đếm phần cứng là một thanh ghi, một bộ tăng và một
#bộ so sánh. Cùng một chiếc máy trông như thế nào được viết
#như hướng dẫn?
#
#WHAT THE HARDWARE DOES
#Chính xác là ba phần đó, mỗi phần một hướng dẫn: thanh ghi
#giữ số đếm, addi là số tăng, slt có nhánh
#là bộ so sánh quyết định ở vòng khác.
#
#THE SOLUTION
#Vòng lặp không phải là một khái niệm mới. Đó là logic tuần tự được đánh vần
#ra ngoài, với PC là đồng hồ.
#
#WATCH FOR
#$t0 là thanh ghi đếm và $t1 là giới hạn. Bước qua
#một vòng đầy đủ và gọi tên dòng nào là phần nào.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #sổ đăng ký đếm
        li   $t1, 11            #giới hạn

loop:
        #Bất biến vòng lặp: $t0 là giá trị tiếp theo được in và vẫn nằm dưới $t1.
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
