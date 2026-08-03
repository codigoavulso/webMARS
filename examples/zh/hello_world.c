//C0-S1 示例：字符串输出并从 main 正常返回。
//编译器将这些帮助程序降低为与 Assembly 使用的相同的 MIPS 打印系统调用。
int main(void) {
  //字符串文字在数据段中发出，并带有尾随零字节。
  print_string("Hello from C on webMARS!");
  //ASCII 10 为换行； print_char 只发出一个字符。
  print_char(10);
  //从 main 返回成为一个干净的程序退出。
  return 0;
}
