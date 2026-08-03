#use <stdio>

int main(void) {
  //Baca satu baris penuh dan parsing bilangan bulat darinya.
  //C0 menggunakan array int sebagai buffer input yang dapat diubah yang diharapkan oleh perpustakaan.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets mengembalikan jumlah byte yang dibaca, atau nilai non-positif di akhir input.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf mengembalikan jumlah bidang yang berhasil dikonversi.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //Tunjukkan ungetc dengan membaca satu karakter dua kali.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc mendorong satu byte ke belakang, sehingga fgetc berikutnya mengamati byte yang sama.
    ungetc(ch, stdin_fd);
    int again = fgetc(stdin_fd);
    printf("Read twice (same code expected): ");
    print_int(ch);
    printf(" / ");
    print_int(again);
    print_char(10);
  }

  return 0;
}
