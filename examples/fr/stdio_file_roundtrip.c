#use <stdio>

int main(void) {
  //Démo aller-retour : écrivez des octets dans un fichier, puis relisez-les.
  //Chaque entier ci-dessous représente un octet ; le zéro final est un terminateur pratique.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //Les fonctions de fichier renvoient un descripteur >= 0 en cas de succès et une valeur négative en cas d'échec.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //Écrivez 17 éléments d'un octet ; le terminateur n'est intentionnellement pas écrit.
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

  //SEEK_SET effectue un décalage de 6 par rapport au début du fichier.
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

  //Rouvrez pour réinitialiser le curseur avant de lire la charge utile complète.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //Les indicateurs EOF/error appartiennent au flux et clearerr réinitialise les deux indicateurs.
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
    //fread rapporte le nombre d'octets valides, donc aucun terminateur de chaîne n'est requis ici.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
