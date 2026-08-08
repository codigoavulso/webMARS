# ==========================================================
#Bài 13 - Lệnh là một số
#
#THE PROBLEM
#Bộ xử lý lấy từ từ bộ nhớ. Mã sống ở
#trí nhớ cũng vậy. Vậy điều gì phân biệt một chỉ dẫn với một
#phần dữ liệu?
#
#WHAT THE HARDWARE DOES
#Không có gì, ngoài thanh ghi mà từ được tải vào. các
#PC chọn các từ đi đến bộ giải mã; tôi chọn từ
#đi đến tập tin đăng ký. Các bit đều cùng loại.
#
#THE SOLUTION
#Đọc mã hóa trực tiếp. Lắp ráp và mở
#Chính > Thực thi: cột Mã hiển thị từng lệnh dưới dạng
#thực tế là từ 32-bit.
#
#WATCH FOR
#Bài học này không có mục đích in gì cả - đầu ra là
#Phân đoạn văn bản chính nó. So sánh hai phần bổ sung: cùng một opcode và
#trường chức năng, số thanh ghi khác nhau. Sau đó tìm
#nghĩa đen 100 bên trong từ addi.
# ==========================================================
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
