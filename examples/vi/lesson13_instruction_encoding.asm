# 13 - Lệnh là một số
#
# Tập hợp và kiểm tra cột Mã trong Đoạn văn bản. Mỗi lệnh cơ bản là một từ 32 bit được chia
# thành các trường.
#
# So sánh hai hướng dẫn `add`. Các trường thao tác khớp nhau, trong khi các trường thanh ghi mã
# hóa các toán hạng khác nhau.
#
# Trong `addi`, 16 bit thấp giữ 100 ngay lập tức, tức là `0x0064`. Thay đổi nó thành 101 và lắp
# ráp lại để xem sự thay đổi.

        .text
        .globl main
main:
        #Kiểm tra cột Mã sau khi lắp ráp: những từ ghi nhớ này không được lưu dưới dạng văn bản.
        add  $t0, $t1, $t2      #Loại R: opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      #hình dạng giống nhau, thanh ghi khác nhau
        addi $t0, $t1, 100      #I-type: hằng số có trong từ
        sll  $t0, $t1, 4        #số lượng ca có trường riêng
        j    tail               #Loại J: địa chỉ, không phải sổ đăng ký
tail:
        #li tự nó được mở rộng trước khi thực thi; bộ xử lý chỉ nhìn thấy các từ được mã hóa.
        li   $v0, 10
        syscall
