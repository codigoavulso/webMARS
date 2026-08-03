#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //पूर्ण C0 + लाइब्रेरी उदाहरण: पार्स, स्ट्रिंग, यूटिलिटी और रैंड एक साथ काम करते हैं।
  int* parsed = parse_int("1f", 16);   //parse_int एक सूचक लौटाता है: शून्य का अर्थ है कि यह विफल रहा
  rand_t a = init_rand(17);   //एक ही बीज एक ही क्रम देता है, जिससे रन दोहराए जा सकते हैं
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex संख्या को उसी प्रकार स्वरूपित करता है जिस प्रकार डिबगर उसे दिखाता है

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //पार्स लाइब्रेरी मैन्युअल पॉइंटर कार्य के बिना पाठ को विभाजित करती है
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



