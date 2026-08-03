#use <stdio>

int main(void) {
  //राउंडट्रिप डेमो: किसी फ़ाइल में बाइट्स लिखें, फिर उन्हें वापस पढ़ें।
  //नीचे दिया गया प्रत्येक पूर्णांक एक बाइट का प्रतिनिधित्व करता है; अंतिम शून्य एक सुविधाजनक टर्मिनेटर है।
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //फ़ाइल फ़ंक्शंस सफलता पर एक डिस्क्रिप्टर >= 0 और विफलता पर एक नकारात्मक मान लौटाते हैं।
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //17 एक-बाइट तत्व लिखें; टर्मिनेटर जानबूझकर नहीं लिखा गया है।
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

  //SEEK_SET फ़ाइल की शुरुआत के सापेक्ष ऑफसेट 6 बनाता है।
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

  //संपूर्ण पेलोड पढ़ने से पहले कर्सर को रीसेट करने के लिए पुनः खोलें।
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/त्रुटि झंडे स्ट्रीम से संबंधित हैं और क्लियरर दोनों संकेतकों को रीसेट करता है।
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
    //फ़्रेड वैध बाइट गिनती की रिपोर्ट करता है, इसलिए यहां किसी स्ट्रिंग टर्मिनेटर की आवश्यकता नहीं है।
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
