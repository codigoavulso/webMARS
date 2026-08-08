int main(void) {
  //Yêu cầu C0-S2- hoặc cao hơn: vòng lặp for, ngắt/tiếp tục và ++/--.
  int sum = 0;   //bộ tích lũy nằm trong một sổ đăng ký sau khi được biên dịch

  for (int i = 0; i < 10; i++) {   //vòng lặp for trở thành phép so sánh cộng với nhánh lùi
    if ((i % 2) == 0) continue;   //tiếp tục nhảy đến phần tăng, bỏ qua phần thân
    if (i > 7) break;   //break nhảy qua cuối vòng lặp
    sum += i;
  }

  int down = 3;
  down--;   //biên dịch giảm sau và tăng trước thành cùng một phần bổ sung
  int up = 3;
  ++up;

  //Sản lượng dự kiến: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
