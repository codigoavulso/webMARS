#use <conio>
#use <string>

int main(void) {
  //C0-S4- या उच्चतर की आवश्यकता है: बूल, चार, स्ट्रिंग और स्ट्रिंग लाइब्रेरी।
  char suffix = 'M';   //एक चार एक बाइट है जिसमें एक कोड होता है, यहां 77
  string joined = string_join("web", string_fromchar(suffix));   //तार ढेर में बनाए जाते हैं, रजिस्टरों में नहीं
  bool matches = string_equal(joined, "webM");   //पाठ की तुलना करने का अर्थ है बाइट दर बाइट की तुलना करना

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //बूल अभी भी एक शब्द है: 0 या 1
  printchar('\n');
  return 0;
}



