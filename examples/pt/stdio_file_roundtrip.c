#use <stdio>

int main(void) {
  // Demo roundtrip: escreve bytes num ficheiro e le de volta.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  // O zero final permite também tratar payload como texto terminado por NUL.
  int read_back[32];

  puts("=== roundtrip de ficheiro stdio ===");

  // Um descritor negativo indica que o runtime não conseguiu abrir o ficheiro.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Nao foi possivel abrir o ficheiro para escrita.");
    return 0;
  }

  // fwrite devolve quantos elementos completos conseguiu escrever.
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

  // SEEK_SET mede a nova posição a partir do início do ficheiro.
  printf("Resultado de fseek para o byte 6: ");
  print_int(fseek(reader, 6, SEEK_SET));
  print_char(10);
  printf("ftell depois do seek: ");
  print_int(ftell(reader));
  print_char(10);
  printf("Primeiro caractere depois do seek: ");
  putchar(fgetc(reader));
  print_char(10);
  fclose(reader);

  // Reabrir cria um novo cursor posicionado novamente no byte zero.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes lidos: ");
  print_int(read_count);
  print_char(10);

  printf("ftell depois da leitura: ");
  print_int(ftell(reader));
  print_char(10);

  // feof/ferror são estados do stream; clearerr limpa ambos sem fechar o descritor.
  printf("Flag feof: ");
  print_int(feof(reader));
  print_char(10);

  printf("Flag ferror: ");
  print_int(ferror(reader));
  print_char(10);

  clearerr(reader);
  printf("feof apos clearerr: ");
  print_int(feof(reader));
  print_char(10);

  puts("Conteudo do ficheiro:");
  int i = 0;
  // Usar read_count evita imprimir bytes do buffer que nunca foram preenchidos.
  while (i < read_count) {
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
