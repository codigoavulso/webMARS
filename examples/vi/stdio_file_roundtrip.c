#use <stdio>

int main(void) {
  //Bản trình diễn khứ hồi: ghi byte vào một tệp, sau đó đọc lại chúng.
  //Mỗi số nguyên bên dưới đại diện cho một byte; số 0 cuối cùng là dấu kết thúc thuận tiện.
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //Các hàm tệp trả về một bộ mô tả >= 0 nếu thành công và giá trị âm nếu thất bại.
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //Viết 17 phần tử một byte; dấu chấm dứt được cố ý không viết.
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

  //SEEK_SET tạo offset 6 so với phần đầu của tệp.
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

  //Mở lại để đặt lại con trỏ trước khi đọc toàn bộ tải trọng.
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/cờ lỗi thuộc về luồng và trình dọn dẹp sẽ đặt lại cả hai chỉ báo.
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
    //fread báo cáo số byte hợp lệ, do đó không cần có bộ kết thúc chuỗi ở đây.
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
