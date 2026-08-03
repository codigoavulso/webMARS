#use <stdio>

int main(void) {
  //قراءة سطر كامل وتحليل عدد صحيح منه.
  //يستخدم C0 مصفوفة int كمخزن مؤقت للإدخال قابل للتغيير تتوقعه المكتبة.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //تُرجع الدالة fgets عدد البايتات المقروءة، أو قيمة غير موجبة في نهاية الإدخال.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //تقوم sscanf بإرجاع عدد الحقول التي تم تحويلها بنجاح.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //قم بإظهار ungetc من خلال قراءة حرف واحد مرتين.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //يقوم ungetc بدفع بايت واحد للخلف، لذا فإن fgetc التالي يلاحظ نفس البايت.
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
