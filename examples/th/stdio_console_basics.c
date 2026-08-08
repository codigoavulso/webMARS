#use <stdio>

int main(void) {
  //I/O คอนโซลพื้นฐานพร้อม stdio wrappers
  //อาร์เรย์องค์ประกอบเดียวทำหน้าที่เป็นพารามิเตอร์เอาต์พุตที่เขียนได้ในชุดย่อย C0
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //Console scanf รอจำนวนเต็มที่ถูกต้องจึงส่งคืนหนึ่งรายการ
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char เก็บโค้ดอักขระไว้ใน char_box[0]
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar ตีความจำนวนเต็มเป็นอักขระ ASCII
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
