# ==========================================================
#Bài 11 - Gọi hàm
#
#THE PROBLEM
#Nhảy vào một thói quen là dễ dàng. Quay lại thì không, bởi vì
#cùng một thói quen có thể được gọi từ nhiều nơi và
#địa chỉ trả lại khác nhau mỗi lần.
#
#WHAT THE HARDWARE DOES
#jal thực hiện hai việc trong một lệnh: nó lưu trữ
#địa chỉ của lệnh sau trong $ra, sau đó nhảy. jr
#nhảy tới bất cứ thứ gì mà thanh ghi giữ, vì vậy jr $ra trả về.
#
#THE SOLUTION
#Mọi thứ khác đều là sự đồng thuận, không phải mạch lạc: những lập luận trong
#$a0..$a3, kết quả là $v0. Phá vỡ quy ước và mã
#vẫn lắp ráp - nó chỉ đơn giản là ngừng tương tác.
#
#WATCH FOR
#Bước lên jal và đọc $ra. So sánh nó với địa chỉ
#của dòng sau cuộc gọi trong Phân đoạn văn bản.
# ==========================================================
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
        #jal thay đổi cả luồng điều khiển và $ra trong một thao tác kiến trúc.
        jal  maxof              #$ra = địa chỉ của dòng tiếp theo

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
