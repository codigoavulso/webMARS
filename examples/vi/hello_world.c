//Ví dụ C0-S1: đầu ra chuỗi và trả về bình thường từ main.
//Trình biên dịch hạ thấp các trình trợ giúp này xuống cùng các tòa nhà in MIPS được sử dụng bởi Assembly.
int main(void) {
  //Chuỗi ký tự được phát ra trong phân đoạn dữ liệu có byte 0 ở cuối.
  print_string("Hello from C on webMARS!");
  //ASCII 10 là nguồn cấp dữ liệu dòng; print_char phát ra chính xác một ký tự.
  print_char(10);
  //Trở về từ main sẽ trở thành một lối thoát chương trình sạch.
  return 0;
}
