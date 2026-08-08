#Xin chào thế giới cho Chạy I/O
#In một tin nhắn đơn giản và thoát.
#Đây là ví dụ nhỏ nhất về phân chia dữ liệu/văn bản và quy ước tòa nhà.

.data
#.asciiz lưu trữ các ký tự theo sau là dấu kết thúc bằng 0 theo yêu cầu của syscall 4.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #Chọn chuỗi in (4) trong $v0 và chuyển địa chỉ chuỗi trong $a0.
  li $v0, 4
  la $a0, msg
  syscall

  #Thoát (10) dừng chương trình mô phỏng một cách rõ ràng.
  li $v0, 10
  syscall
