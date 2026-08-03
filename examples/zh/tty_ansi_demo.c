#use <tty>

void tty_frame(int left, int top, int width, int height) {   //使用终端的画线字符集绘制一个框
  int col = 0;
  int row = 0;

  tty_box_on();   //切换字符集：“l”和“q”变成角和线
  tty_move(top, left);   //每个 ANSI 转义序列都会通过 MMIO 发射器
  tty_putc('l');
  col = 0;
  while (col < width - 2) {   //每次迭代一个字符：终端没有填充原语
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
  //打开“TTY设备+ANSI终端”工具并将其连接到MIPS。
  // 该演示使用以下命令绘制一个文本框架 ANSI/DEC 线条画使用 MMIO.
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
