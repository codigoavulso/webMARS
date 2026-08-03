#use <tty>

void tty_frame(int left, int top, int width, int height) {   //টার্মিনালের লাইন-ড্রয়িং অক্ষর সেট ব্যবহার করে একটি বাক্স আঁকে
  int col = 0;
  int row = 0;

  tty_box_on();   //অক্ষর সেটটি পরিবর্তন করে: 'l' এবং 'q' কোণ এবং লাইনে পরিণত হয়
  tty_move(top, left);   //প্রতিটি ANSI এস্কেপ সিকোয়েন্স MMIO ট্রান্সমিটারের মধ্য দিয়ে ভ্রমণ করে
  tty_putc('l');
  col = 0;
  while (col < width - 2) {   //প্রতি পুনরাবৃত্তির জন্য একটি অক্ষর: টার্মিনালের কোন ভরাট আদিম নেই
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
  //"TTY ডিভাইস + ANSI টার্মিনাল" টুল খুলুন এবং এটি MIPS এর সাথে সংযুক্ত করুন।
  // এই ডেমো এর সাথে একটি পাঠ্য ফ্রেম আঁকে ANSI/DEC ব্যবহার করে লাইন অঙ্কন MMIO.
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
