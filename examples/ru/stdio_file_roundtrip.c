#use <stdio>

int main(void) {
  //Демонстрация обратного пути: запись байтов в файл, а затем чтение их обратно.
  //Каждое целое число ниже представляет один байт; последний ноль — удобный терминатор.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //Файловые функции возвращают дескриптор >= 0 в случае успеха и отрицательное значение в случае неудачи.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //Запишите 17 однобайтовых элементов; терминатор намеренно не написан.
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

  //SEEK_SET создает смещение 6 относительно начала файла.
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

  //Откройте повторно, чтобы сбросить курсор перед чтением всей полезной нагрузки.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //Флаги EOF/error принадлежат потоку, иcleerr сбрасывает оба индикатора.
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
    //fread сообщает о допустимом количестве байт, поэтому здесь не требуется терминатор строки.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
