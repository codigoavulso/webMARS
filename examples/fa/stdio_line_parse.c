#use <stdio>

int main(void) {
  //یک خط کامل را بخوانید و یک عدد صحیح را از آن تجزیه کنید.
  //C0 از یک آرایه int به عنوان بافر ورودی قابل تغییر مورد انتظار کتابخانه استفاده می کند.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets تعداد بایت های خوانده شده یا یک مقدار غیر مثبت را در انتهای ورودی برمی گرداند.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf تعداد فیلدهایی که با موفقیت تبدیل شده اند را برمی گرداند.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //با دوبار خواندن یک کاراکتر، ungetc را نشان دهید.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc یک بایت را به عقب می راند، بنابراین fgetc بعدی همان بایت را مشاهده می کند.
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
