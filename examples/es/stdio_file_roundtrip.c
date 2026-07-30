#use <stdio>

int main(void) {
  // Demo roundtrip: escribe bytes en archivo y luego los vuelve a leer.
  // Cada entero representa un byte; el cero final sirve como terminador.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== roundtrip de archivo stdio ===");

  // Las funciones de archivo devuelven descriptor >= 0 o un valor negativo al fallar.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("No se pudo abrir el archivo para escritura.");
    return 0;
  }

  // Escribir 17 elementos de un byte; el terminador no se escribe.
  int written = fwrite(payload, 1, 17, writer);
  fclose(writer);
  printf("Bytes escritos: ");
  print_int(written);
  print_char(10);

  int reader = fopen_read("stdio_demo.txt");
  if (reader < 0) {
    puts("No se pudo abrir el archivo para lectura.");
    return 0;
  }

  // SEEK_SET interpreta el offset 6 desde el inicio del archivo.
  printf("Resultado de fseek al byte 6: ");
  print_int(fseek(reader, 6, SEEK_SET));
  print_char(10);
  printf("ftell despues del seek: ");
  print_int(ftell(reader));
  print_char(10);
  printf("Primer caracter despues del seek: ");
  putchar(fgetc(reader));
  print_char(10);
  fclose(reader);

  // Reabrir reinicia el cursor antes de leer el contenido completo.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes leidos: ");
  print_int(read_count);
  print_char(10);

  printf("ftell despues de leer: ");
  print_int(ftell(reader));
  print_char(10);

  // Los flags EOF/error pertenecen al stream y clearerr reinicia ambos.
  printf("Bandera feof: ");
  print_int(feof(reader));
  print_char(10);

  printf("Bandera ferror: ");
  print_int(ferror(reader));
  print_char(10);

  clearerr(reader);
  printf("feof tras clearerr: ");
  print_int(feof(reader));
  print_char(10);

  puts("Contenido del archivo:");
  int i = 0;
  while (i < read_count) {
    // fread indica cuántos bytes son válidos; aquí no hace falta terminador.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
