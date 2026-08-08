#use <stdio>

int main(void) {
  //اسٹڈیو ریپرز کے ساتھ بنیادی کنسول I/O۔
  //ایک عنصر کی صفیں C0 سب سیٹ میں قابل تحریر آؤٹ پٹ پیرامیٹرز کے طور پر کام کرتی ہیں۔
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //کنسول اسکینف ایک درست عدد کا انتظار کرتا ہے اور اس لیے ایک آئٹم واپس کرتا ہے۔
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char کریکٹر کوڈ کو char_box[0] میں محفوظ کرتا ہے۔
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar انٹیجر کو ASCII کردار سے تعبیر کرتا ہے۔
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
