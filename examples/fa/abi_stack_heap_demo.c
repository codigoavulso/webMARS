//حداقل نسخه نمایشی ABI:
//- قاب پشته (محلی ها در اصلی / توابع)
//- تخصیص پشته از طریق alloc(int)
//- ارسال آرگومان ($a0-$a3 + آرگ پنجم روی پشته)
//- مقدار بازگشتی در $v0

int sum5(int a, int b, int c, int d, int e) {
  //چهار آرگومان اول از $a0-$a3 استفاده می‌کنند. پنجم از پشته تماس گیرنده خوانده می شود.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //نوشتن اشاره گر در حافظه پشته
  *slot = x + y;
  //ارجاع مجدد مقدار را از حافظه شبیه سازی شده MIPS می خواند.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //پشته محلی
  int* heap_value = alloc(int); //heap (sycall sbrk)

  //اشاره گر پس از بازگشت تماس گیرنده معتبر می ماند زیرا به حافظه پشته اشاره دارد.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //آرگومان پنجم به پشته می ریزد

  //خروجی مورد انتظار: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
