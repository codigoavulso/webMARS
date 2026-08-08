#use <stdio>

int main(void) {
  //Roundtrip-Demo: Bytes in eine Datei schreiben und dann zurücklesen.
  //Jede Ganzzahl unten stellt ein Byte dar; Die letzte Null ist ein praktischer Abschluss.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //Dateifunktionen geben bei Erfolg einen Deskriptor >= 0 und bei Fehler einen negativen Wert zurück.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //Schreiben Sie 17 Ein-Byte-Elemente. Der Terminator wird absichtlich nicht geschrieben.
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

  //SEEK_SET macht den Offset 6 relativ zum Anfang der Datei.
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

  //Öffnen Sie erneut, um den Cursor zurückzusetzen, bevor Sie die gesamte Nutzlast lesen.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/error-Flags gehören zum Stream und clearerr setzt beide Indikatoren zurück.
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
    //fread meldet die gültige Byteanzahl, daher ist hier kein String-Abschlusszeichen erforderlich.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
