#use <stdio>

int main(void) {
  //Gidiş-dönüş demosu: bir dosyaya bayt yazın, ardından bunları tekrar okuyun.
  //Aşağıdaki her tam sayı bir baytı temsil eder; son sıfır kullanışlı bir sonlandırıcıdır.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //Dosya işlevleri başarı durumunda >= 0, başarısızlık durumunda negatif bir değer döndürür.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //17 adet tek baytlık öğe yazın; sonlandırıcı kasıtlı olarak yazılmamıştır.
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

  //SEEK_SET dosyanın başlangıcına göre 6 ofsetini yapar.
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

  //Yükün tamamını okumadan önce imleci sıfırlamak için yeniden açın.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/hata bayrakları akışa aittir ve clearerr her iki göstergeyi de sıfırlar.
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
    //fread geçerli bayt sayısını bildirir, dolayısıyla burada dize sonlandırıcıya gerek yoktur.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
