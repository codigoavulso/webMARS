#use <stdio>

int main(void) {
  //ラウンドトリップ デモ: ファイルにバイトを書き込み、それを再度読み取ります。
  //以下の各整数は 1 バイトを表します。最後のゼロは便利な終端記号です。
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //ファイル関数は、成功した場合は記述子 >= 0 を返し、失敗した場合は負の値を返します。
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //17 個の半角要素を記述します。ターミネータは意図的に書かれていません。
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

  //SEEK_SET は、ファイルの先頭を基準にしてオフセット 6 を作成します。
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

  //完全なペイロードを読み取る前に、もう一度開いてカーソルをリセットします。
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/error フラグはストリームに属し、clearerr は両方のインジケーターをリセットします。
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
    //fread は有効なバイト数を報告するため、ここでは文字列終端文字は必要ありません。
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
