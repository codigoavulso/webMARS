#use <stdio>

int main(void) {
  //الإدخال/الإخراج الأساسي لوحدة التحكم مع أغلفة stdio.
  //تعمل المصفوفات ذات العنصر الواحد كمعلمات إخراج قابلة للكتابة في المجموعة الفرعية C0.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //تنتظر وحدة التحكم scanf عددًا صحيحًا صالحًا، وبالتالي تقوم بإرجاع عنصر واحد.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //يقوم scanf_char بتخزين رمز الحرف في char_box[0].
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //يفسر putchar العدد الصحيح كحرف ASCII.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
