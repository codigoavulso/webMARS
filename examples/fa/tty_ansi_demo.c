#use <tty>

void tty_frame(int left, int top, int width, int height) {   //با استفاده از مجموعه نویسه های خط کشی ترمینال، کادری را ترسیم می کند
  int col = 0;
  int row = 0;

  tty_box_on();   //مجموعه کاراکترها را تغییر می دهد: 'l' و 'q' تبدیل به گوشه ها و خطوط می شوند
  tty_move(top, left);   //هر ANSI دنباله فرار از فرستنده MMIO عبور می کند
  tty_putc('l');
  col = 0;
  while (col < width - 2) {   //یک کاراکتر در هر تکرار: ترمینال فاقد پر کردن اولیه است
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
  //ابزار "TTY Device + ANSI ترمینال" را باز کنید و آن را به MIPS متصل کنید.
  //این نسخه نمایشی یک قاب متن را با ANSI/DEC طراحی خطی با استفاده از MMIO ترسیم می‌کند.
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
