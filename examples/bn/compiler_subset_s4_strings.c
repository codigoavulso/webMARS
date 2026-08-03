#use <conio>
#use <string>

int main(void) {
  //প্রয়োজন C0-S4- বা উচ্চতর: bool, char, স্ট্রিং, এবং স্ট্রিং লাইব্রেরি।
  char suffix = 'M';   //একটি char একটি কোড ধরে এক বাইট, এখানে 77
  string joined = string_join("web", string_fromchar(suffix));   //স্ট্রিংগুলি স্তূপে তৈরি করা হয়, রেজিস্টারে নয়
  bool matches = string_equal(joined, "webM");   //টেক্সট তুলনা মানে বাইট দ্বারা বাইট তুলনা করা

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //একটি বুল এখনও একটি শব্দ: 0 বা 1
  printchar('\n');
  return 0;
}



