#use <stdio>

int main(void) {
  //রাউন্ডট্রিপ ডেমো: একটি ফাইলে বাইট লিখুন, তারপর সেগুলি আবার পড়ুন।
  //নীচের প্রতিটি পূর্ণসংখ্যা একটি বাইট প্রতিনিধিত্ব করে; চূড়ান্ত শূন্য একটি সুবিধাজনক টার্মিনেটর।
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //ফাইল ফাংশন সাফল্যের উপর একটি বর্ণনাকারী >= 0 এবং ব্যর্থতার উপর একটি নেতিবাচক মান প্রদান করে।
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //17 এক-বাইট উপাদান লিখুন; টার্মিনেটর ইচ্ছাকৃতভাবে লেখা হয় না।
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

  //SEEK_SET ফাইলের শুরুতে অফসেট 6 তৈরি করে।
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

  //সম্পূর্ণ পেলোড পড়ার আগে কার্সার রিসেট করতে পুনরায় খুলুন।
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/ত্রুটির ফ্ল্যাগ স্ট্রীমের অন্তর্গত এবং ক্লিয়ারার উভয় সূচক রিসেট করে।
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
    //fread বৈধ বাইট গণনা রিপোর্ট করে, তাই এখানে কোন স্ট্রিং টার্মিনেটরের প্রয়োজন নেই।
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
