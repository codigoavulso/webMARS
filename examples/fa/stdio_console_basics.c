#use <stdio>

int main(void) {
  //ورودی/خروجی کنسول پایه با بسته بندی های stdio.
  //آرایه های تک عنصری به عنوان پارامترهای خروجی قابل نوشتن در زیر مجموعه C0 عمل می کنند.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //scanf کنسول منتظر یک عدد صحیح معتبر است و بنابراین یک مورد را برمی گرداند.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char کد کاراکتر را در char_box[0] ذخیره می کند.
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar عدد صحیح را به عنوان یک کاراکتر ASCII تفسیر می‌کند.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
