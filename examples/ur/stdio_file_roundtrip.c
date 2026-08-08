#use <stdio>

int main(void) {
  //راؤنڈ ٹرپ ڈیمو: فائل میں بائٹس لکھیں، پھر انہیں واپس پڑھیں۔
  //ذیل میں ہر ایک عدد ایک بائٹ کی نمائندگی کرتا ہے۔ آخری صفر ایک آسان ٹرمینیٹر ہے۔
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //فائل فنکشنز کامیابی پر تفصیلی >= 0 اور ناکامی پر منفی قدر واپس کرتے ہیں۔
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //17 ایک بائٹ عناصر لکھیں؛ ٹرمینیٹر جان بوجھ کر نہیں لکھا گیا ہے۔
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

  //SEEK_SET فائل کے آغاز سے متعلق آفسیٹ 6 بناتا ہے۔
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

  //مکمل پے لوڈ پڑھنے سے پہلے کرسر کو دوبارہ ترتیب دینے کے لیے دوبارہ کھولیں۔
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  // EOF/غلطی کے جھنڈے سٹریم سے تعلق رکھتے ہیں اور کلیئرر دونوں اشارے کو دوبارہ ترتیب دیتا ہے۔
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
    //fread درست بائٹ گنتی کی اطلاع دیتا ہے، لہذا یہاں کسی سٹرنگ ٹرمنیٹر کی ضرورت نہیں ہے۔
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
