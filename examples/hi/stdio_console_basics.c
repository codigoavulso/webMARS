#use <stdio>

int main(void) {
  //स्टूडियो रैपर के साथ बेसिक कंसोल I/O।
  //एक-तत्व सरणियाँ C0 उपसमुच्चय में लिखने योग्य आउटपुट पैरामीटर के रूप में कार्य करती हैं।
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //कंसोल स्कैनफ़ एक वैध पूर्णांक की प्रतीक्षा करता है और इसलिए एक आइटम लौटाता है।
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char कैरेक्टर कोड को char_box[0] में संग्रहीत करता है।
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //पुचर पूर्णांक की व्याख्या ASCII वर्ण के रूप में करता है।
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
