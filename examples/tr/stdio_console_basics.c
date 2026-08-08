#use <stdio>

int main(void) {
  //Stdio sarmalayıcılarla temel konsol G/Ç'si.
  //Tek öğeli diziler, C0 alt kümesinde yazılabilir çıktı parametreleri olarak işlev görür.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //Konsol scanf geçerli bir tamsayı bekler ve bu nedenle bir öğe döndürür.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char, karakter kodunu char_box[0] içinde saklar.
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar tamsayıyı ASCII karakteri olarak yorumlar.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
