#use <stdio>

int main(void) {
  //نسخه ی نمایشی رفت و برگشت: بایت ها را در یک فایل بنویسید، سپس آنها را دوباره بخوانید.
  //هر عدد صحیح زیر یک بایت را نشان می دهد. صفر نهایی یک پایان دهنده مناسب است.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //توابع فایل در صورت موفقیت یک توصیفگر >= 0 و در صورت شکست یک مقدار منفی را برمی گرداند.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //17 عنصر یک بایتی بنویسید. پایان دهنده عمداً نوشته نشده است.
  int written = fwrite(payload, 1, 17, writer);
  fclose(writer);
  printf("Bytes written: ");
  print_int(written);
  print_char(10);

  int reader = fopen_read("stdio_demo.txt");
  if (reader < 0) {
    puts("Could not open file for reading.");
    return 0;
  }

  //SEEK_SET نسبت به ابتدای فایل 6 افست می کند.
  printf("fseek to byte 6 result: ");
  print_int(fseek(reader, 6, SEEK_SET));
  print_char(10);
  printf("ftell after seek: ");
  print_int(ftell(reader));
  print_char(10);
  printf("First character after seek: ");
  putchar(fgetc(reader));
  print_char(10);
  fclose(reader);

  //قبل از خواندن بار کامل، مکان نما را دوباره باز کنید.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/پرچم‌های خطا متعلق به جریان است و پاک‌کننده هر دو نشانگر را بازنشانی می‌کند.
  printf("feof flag: ");
  print_int(feof(reader));
  print_char(10);

  printf("ferror flag: ");
  print_int(ferror(reader));
  print_char(10);

  clearerr(reader);
  printf("feof after clearerr: ");
  print_int(feof(reader));
  print_char(10);

  puts("File contents:");
  int i = 0;
  while (i < read_count) {
    //fread تعداد بایت های معتبر را گزارش می دهد، بنابراین در اینجا نیازی به پایان دهنده رشته نیست.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
