#use <stdio>

int main(void) {
  //ایک مکمل لائن پڑھیں اور اس سے ایک عدد کو پارس کریں۔
  //C0 لائبریری کے ذریعہ متوقع تغیر پذیر ان پٹ بفر کے طور پر ایک int سرنی کا استعمال کرتا ہے۔
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets پڑھے ہوئے بائٹس کی تعداد، یا ان پٹ کے آخر میں ایک غیر مثبت قدر واپس کرتا ہے۔
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf کامیابی سے تبدیل شدہ فیلڈز کی تعداد لوٹاتا ہے۔
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //ایک حرف کو دو بار پڑھ کر ungetc کا مظاہرہ کریں۔
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc ایک بائٹ کو پیچھے دھکیلتا ہے، تو اگلا fgetc اسی بائٹ کا مشاہدہ کرتا ہے۔
    ungetc(ch, stdin_fd);
    int again = fgetc(stdin_fd);
    printf("Read twice (same code expected): ");
    print_int(ch);
    printf(" / ");
    print_int(again);
    print_char(10);
  }

  return 0;
}
