#use <stdio>

int main(void) {
  // Demo roundtrip: escreve bytes num ficheiro e le de volta.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== roundtrip de ficheiro stdio ===");

  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Nao foi possivel abrir o ficheiro para escrita.");
    return 0;
  }

  int written = fwrite(payload, 1, 17, writer);
  fclose(writer);
  printf("Bytes escritos: ");
  print_int(written);
  print_char(10);

  int reader = fopen_read("stdio_demo.txt");
  if (reader < 0) {
    puts("Nao foi possivel abrir o ficheiro para leitura.");
    return 0;
  }

  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes lidos: ");
  print_int(read_count);
  print_char(10);

  printf("ftell depois da leitura: ");
  print_int(ftell(reader));
  print_char(10);

  printf("fseek(0, SEEK_CUR) resultado: ");
  print_int(fseek(reader, 0, SEEK_CUR));
  print_char(10);

  printf("Flag feof: ");
  print_int(feof(reader));
  print_char(10);

  printf("Flag ferror: ");
  print_int(ferror(reader));
  print_char(10);

  clearerr(reader);
  printf("ferror apos clearerr: ");
  print_int(ferror(reader));
  print_char(10);

  puts("Conteudo do ficheiro:");
  int i = 0;
  while (i < read_count) {
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}

