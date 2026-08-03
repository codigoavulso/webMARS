#use <stdio>

int main(void) {
  //stdio র‌্যাপার সহ বেসিক কনসোল I/O।
  //এক-উপাদান অ্যারেগুলি C0 উপসেটে লেখারযোগ্য আউটপুট পরামিতি হিসাবে কাজ করে।
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //কনসোল স্ক্যানফ একটি বৈধ পূর্ণসংখ্যার জন্য অপেক্ষা করে এবং তাই একটি আইটেম ফেরত দেয়।
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char char_box[0]-এ অক্ষর কোড সংরক্ষণ করে।
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar পূর্ণসংখ্যাকে একটি ASCII অক্ষর হিসাবে ব্যাখ্যা করে।
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
