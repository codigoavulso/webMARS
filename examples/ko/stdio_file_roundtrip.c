#use <stdio>

int main(void) {
  //왕복 데모: 파일에 바이트를 쓴 다음 다시 읽습니다.
  //아래의 각 정수는 1바이트를 나타냅니다. 마지막 0은 편리한 종결자입니다.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //파일 함수는 성공 시 설명자 >= 0을 반환하고 실패 시 음수 값을 반환합니다.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //17개의 1바이트 요소를 씁니다. 터미네이터는 의도적으로 작성되지 않았습니다.
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

  //SEEK_SET는 파일의 시작 부분을 기준으로 오프셋 6을 만듭니다.
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

  //전체 페이로드를 읽기 전에 다시 열어 커서를 재설정하세요.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/error 플래그는 스트림에 속하며 Clearerr는 두 표시기를 모두 재설정합니다.
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
    //fread는 유효한 바이트 수를 보고하므로 여기에는 문자열 종결자가 필요하지 않습니다.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
