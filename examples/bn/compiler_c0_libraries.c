#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //সম্পূর্ণ C0 + লাইব্রেরি উদাহরণ: পার্স, স্ট্রিং, ইউটিল এবং র্যান্ড একসাথে কাজ করা।
  int* parsed = parse_int("1f", 16);   //parse_int একটি পয়েন্টার প্রদান করে: null মানে এটি ব্যর্থ হয়েছে
  rand_t a = init_rand(17);   //একই বীজ একই ক্রম দেয়, যা রান পুনরাবৃত্তিযোগ্য রাখে
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex সংখ্যাটিকে ফরম্যাট করে যেভাবে ডিবাগার এটিকে দেখায়

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //পার্স লাইব্রেরি ম্যানুয়াল পয়েন্টার কাজ ছাড়াই পাঠ্যকে বিভক্ত করে
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



