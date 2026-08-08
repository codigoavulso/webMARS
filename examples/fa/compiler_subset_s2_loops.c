int main(void) {
  //به C0-S2- یا بالاتر نیاز دارد: برای حلقه‌ها، break/continue و ++/--.
  int sum = 0;   //پس از کامپایل شدن، انباشت کننده در یک ثبات زندگی می کند

  for (int i = 0; i < 10; i++) {   //یک حلقه for به یک مقایسه به اضافه یک شاخه عقب تبدیل می شود
    if ((i % 2) == 0) continue;   //به جهش ها به سمت افزایش ادامه دهید و بدن را پرش کنید
    if (i > 7) break;   //شکستن از انتهای حلقه عبور می کند
    sum += i;
  }

  int down = 3;
  down--;   //پس از کاهش و قبل از افزایش به همان افزودنی کامپایل
  int up = 3;
  ++up;

  //خروجی مورد انتظار: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
