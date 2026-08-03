#use <stdio>

int main(void) {
  //I/O konsol dasar dengan pembungkus stdio.
  //Array satu elemen bertindak sebagai parameter keluaran yang dapat ditulis dalam subset C0.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //Scanf konsol menunggu bilangan bulat yang valid dan karenanya mengembalikan satu item.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char menyimpan kode karakter di char_box[0].
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar mengartikan integer sebagai karakter ASCII.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
