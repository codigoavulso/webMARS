# ==========================================================
#Bài 12 - Đệ quy cần một khung cho mỗi lệnh gọi
#
#THE PROBLEM
#Cuộc gọi đệ quy ghi đè $ra và thanh ghi đối số.
#Cuộc gọi bên ngoài sau đó không có đường quay lại và không biết nó là gì
#riêng n là.
#
#WHAT THE HARDWARE DOES
#Nó cung cấp một $ra, không phải một chồng chúng. Không có gì được lưu
#tự động; nếu mã không lưu nó, nó sẽ biến mất.
#
#THE SOLUTION
#Mỗi lần kích hoạt sẽ mở một khung trên ngăn xếp, giữ lại những gì nó
#vẫn sẽ cần sau cuộc gọi và khôi phục nó trên đường đi
#ra ngoài. Độ sâu ngăn xếp là độ sâu đệ quy.
#
#WATCH FOR
#Đặt điểm dừng trên mul và xem $sp giảm 8 mỗi
#cấp độ. Năm bản sao được lưu của n là điều tạo nên
#phép nhân trên đường trở về có thể.
# ==========================================================
        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- thực tế int(int n) ----
fact:
        #Mỗi lệnh gọi sở hữu một khung 8 byte riêng biệt.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #địa chỉ trả lại của cuộc gọi này
        sw   $a0, 4($sp)        #cuộc gọi này là n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #trường hợp cơ bản: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #lần nữa của chúng ta
        mul  $v0, $v0, $a0

factend:
        #Khôi phục trạng thái callee và loại bỏ chính xác khung được phân bổ khi nhập.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
