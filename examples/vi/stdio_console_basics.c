#use <stdio>

int main(void) {
  //I/O bảng điều khiển cơ bản với trình bao bọc stdio.
  //Mảng một phần tử đóng vai trò là tham số đầu ra có thể ghi trong tập hợp con C0.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //Console scanf chờ một số nguyên hợp lệ và do đó trả về một mục.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char lưu mã ký tự trong char_box[0].
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar diễn giải số nguyên dưới dạng ký tự ASCII.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
