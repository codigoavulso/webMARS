#use <conio>
#use <string>

int main(void) {
  //درکار ہے C0-S4- یا اس سے زیادہ: bool, char, string, and string library.
  char suffix = 'M';   //چار ایک بائٹ ہے جس میں ایک کوڈ ہوتا ہے، یہاں 77 ہے۔
  string joined = string_join("web", string_fromchar(suffix));   //تاریں ڈھیر میں بنتی ہیں، رجسٹروں میں نہیں۔
  bool matches = string_equal(joined, "webM");   //متن کا موازنہ کرنے کا مطلب ہے بائٹ بائٹ کا موازنہ کرنا

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //ایک بول اب بھی ایک لفظ ہے: 0 یا 1
  printchar('\n');
  return 0;
}



