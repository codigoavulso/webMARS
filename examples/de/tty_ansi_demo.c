#use <tty>

void tty_frame(int left, int top, int width, int height) {   //Zeichnet ein Feld mit dem Strichzeichnungszeichensatz des Terminals
  int col = 0;
  int row = 0;

  tty_box_on();   //schaltet den Zeichensatz um: „l“ und „q“ werden zu Ecken und Linien
  tty_move(top, left);   //Jede ANSI-Escape-Sequenz läuft über den MMIO-Sender
  tty_putc('l');
  col = 0;
  while (col < width - 2) {   //ein Zeichen pro Iteration: Das Terminal hat kein Füllprimitiv
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
  //Öffnen Sie das Tool „TTY Gerät + ANSI Terminal“ und verbinden Sie es mit MIPS.
  //Diese Demo zeichnet einen Textrahmen mit ANSI/DEC Strichzeichnung unter Verwendung von MMIO.
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
