#use <stdio>

int main(void) {
  //عرض توضيحي لرحلة ذهابًا وإيابًا: اكتب بايتات إلى ملف، ثم قم بقراءتها مرة أخرى.
  //يمثل كل عدد صحيح أدناه بايت واحد؛ الصفر النهائي هو فاصل مناسب.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //تُرجع وظائف الملف واصفًا >= 0 عند النجاح وقيمة سالبة عند الفشل.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //اكتب 17 عنصرًا ذات بايت واحد؛ لم يتم كتابة الفاصل عمدا.
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

  //SEEK_SET يجعل الإزاحة 6 نسبة إلى بداية الملف.
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

  //أعد الفتح لإعادة ضبط المؤشر قبل قراءة الحمولة الكاملة.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/ تنتمي إشارات الخطأ إلى الدفق ويقوم Clearr بإعادة تعيين كلا المؤشرين.
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
    //يُبلغ fread عن عدد البايتات الصالح، لذلك لا يلزم وجود فاصل سلسلة هنا.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
