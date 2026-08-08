# ==========================================================
#Bài 08 - Byte bên trong một từ và thứ tự byte
#
#THE PROBLEM
#Một từ chiếm bốn địa chỉ. Byte nào thấp nhất
#tên của những địa chỉ đó?
#
#WHAT THE HARDWARE DOES
#Lựa chọn đó là thứ tự byte và đó là quyết định nối dây được thực hiện
#một lần cho toàn bộ máy. MIPS đây là little-endian:
#byte có ý nghĩa nhỏ nhất tồn tại ở địa chỉ thấp nhất.
#
#THE SOLUTION
#Lưu trữ một từ, sau đó đọc lại từng byte một và để
#Lệnh trả lời câu hỏi cho bạn.
#
#WATCH FOR
#0x04030201 trả về là 1 2 3 4. Byte được ghi cuối cùng trong
#nghĩa đen được đọc đầu tiên. lbu được sử dụng thay vì lb nên a
#byte trên 127 không được mở rộng bằng dấu.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #byte 01 ít quan trọng nhất
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #bù byte
bloop:
        #Vòng lặp truy cập offset 0, 1, 2 và 3 bên trong từ được lưu trữ.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Địa chỉ hiệu dụng = địa chỉ cơ sở + độ lệch byte hiện tại.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #byte không dấu
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
