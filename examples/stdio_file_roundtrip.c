#use <stdio>

int main(void) {
  // Roundtrip demo: write bytes to a file, then read them back.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

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

  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  printf("fseek(0, SEEK_CUR) result: ");
  print_int(fseek(reader, 0, SEEK_CUR));
  print_char(10);

  printf("feof flag: ");
  print_int(feof(reader));
  print_char(10);

  printf("ferror flag: ");
  print_int(ferror(reader));
  print_char(10);

  clearerr(reader);
  printf("ferror after clearerr: ");
  print_int(ferror(reader));
  print_char(10);

  puts("File contents:");
  int i = 0;
  while (i < read_count) {
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}

