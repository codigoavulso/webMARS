#use <stdio>

int main(void) {
  //往返演示：将字节写入文件，然后读回。
  //下面每个整数代表一个字节；最后的零是一个方便的终止符。
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //文件函数在成功时返回描述符 >= 0，在失败时返回负值。
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //写入17个一字节元素；终止符是故意不写的。
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

  //SEEK_SET 相对于文件开头偏移 6。
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

  //在读取完整的有效负载之前重新打开以重置光标。
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/错误标志属于流，clearerr 重置两个指示器。
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
    //fread 报告有效字节数，因此此处不需要字符串终止符。
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
