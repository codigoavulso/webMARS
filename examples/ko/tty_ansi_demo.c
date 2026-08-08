#use <tty>

void tty_frame(int left, int top, int width, int height) {   //터미널의 선 그리기 문자 집합을 사용하여 상자를 그립니다.
  int col = 0;
  int row = 0;

  tty_box_on();   //문자 세트를 전환합니다. 'l' 및 'q'는 모서리와 선이 됩니다.
  tty_move(top, left);   //모든 ANSI 이스케이프 시퀀스는 MMIO 송신기를 통해 이동합니다.
  tty_putc('l');
  col = 0;
  while (col < width - 2) {   //반복당 문자 1개: 터미널에 채우기 프리미티브가 없습니다.
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
  //"TTY 장치 + ANSI 터미널" 도구를 열고 MIPS에 연결합니다.
  //이 데모는 ANSI/DEC 선 그리기로 MMIO를 사용하여 텍스트 프레임을 그립니다.
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
