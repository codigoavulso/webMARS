#use <conio>
#use <string>

int main(void) {
  //需要 C0-S4- 或更高版本：bool、char、string 和字符串库。
  char suffix = 'M';   //一个 char 是一个保存代码的字节，这里是 77
  string joined = string_join("web", string_fromchar(suffix));   //字符串构建在堆中，而不是寄存器中
  bool matches = string_equal(joined, "webM");   //比较文本意味着逐字节比较

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //bool 仍然是一个单词：0 或 1
  printchar('\n');
  return 0;
}



