//C0-S1 Beispiel: String-Ausgabe und eine normale Rückkehr von main.
//Der Compiler reduziert diese Helfer auf die gleichen MIPS-Drucksystemaufrufe, die von Assembly verwendet werden.
int main(void) {
  //String-Literale werden im Datensegment mit einem abschließenden Null-Byte ausgegeben.
  print_string("Hello from C on webMARS!");
  //ASCII 10 ist Zeilenvorschub; print_char gibt genau ein Zeichen aus.
  print_char(10);
  //Die Rückkehr von main wird zu einem sauberen Programmausgang.
  return 0;
}
