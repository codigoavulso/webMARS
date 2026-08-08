#use <stdio>

int main(void) {
  //Demo w obie strony: zapisz bajty do pliku, a następnie odczytaj je z powrotem.
  //Każda liczba całkowita poniżej reprezentuje jeden bajt; końcowe zero jest wygodnym terminatorem.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //Funkcje plikowe zwracają deskryptor >= 0 w przypadku powodzenia i wartość ujemną w przypadku niepowodzenia.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //Zapisz 17 elementów jednobajtowych; terminator celowo nie jest zapisany.
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

  //SEEK_SET powoduje przesunięcie 6 względem początku pliku.
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

  //Otwórz ponownie, aby zresetować kursor przed odczytaniem całego ładunku.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //Flagi EOF/error należą do strumienia i clearerr resetuje oba wskaźniki.
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
    //fread zgłasza prawidłową liczbę bajtów, więc nie jest tu wymagany żaden terminator łańcucha.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
