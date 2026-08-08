#use <tty>

void tty_frame(int left, int top, int width, int height) {   //ٹرمینل کے لائن ڈرائنگ چارسیٹ کا استعمال کرتے ہوئے ایک باکس کھینچتا ہے۔
  int col = 0;
  int row = 0;

  tty_box_on();   //کریکٹر سیٹ کو تبدیل کرتا ہے: 'l' اور 'q' کونے اور لائنیں بن جاتے ہیں۔
  tty_move(top, left);   //ہر ANSI فرار کی ترتیب MMIO ٹرانسمیٹر کے ذریعے سفر کرتی ہے
  tty_putc('l');
  col = 0;
  while (col < width - 2) {   //ایک حرف فی تکرار: ٹرمینل میں کوئی فل پرائمیٹو نہیں ہے۔
    tty_putc('q');
    col++;
  }
  tty_putc('k');

  row = 0;
  while (row < height - 2) {
    tty_move(top + 1 + row, left);
    tty_putc('x');
    tty_move(top + 1 + row, left + width - 1);
    tty_putc('x');
    row++;
  }

  tty_move(top + height - 1, left);
  tty_putc('m');
  col = 0;
  while (col < width - 2) {
    tty_putc('q');
    col++;
  }
  tty_putc('j');
  tty_box_off();
}

int main(void) {
  //"TTY ڈیوائس + ANSI ٹرمینل" ٹول کھولیں اور اسے MIPS سے جوڑیں۔
  //یہ ڈیمو ANSI/DEC لائن ڈرائنگ کے ساتھ MMIO کا استعمال کرتے ہوئے ٹیکسٹ فریم کھینچتا ہے۔
  tty_reset();
  tty_clear();
  tty_set_bright_fg(6);
  tty_frame(2, 2, 44, 10);

  tty_move(4, 5);
  tty_puts("webMARS TTY + ANSI demo");
  tty_style_reset();

  tty_move(6, 5);
  tty_puts("Press any key inside the terminal tool...");

  {
    char key = tty_getchar();
    tty_move(8, 5);
    tty_set_fg(2);
    tty_puts("Key code: ");
    tty_putint((int)key);
    tty_style_reset();
  }

  tty_move(12, 2);
  tty_puts("Supports ANSI cursor movement, clear screen, colors, and box drawing.");
  tty_move(25, 1);
  return 0;
}
