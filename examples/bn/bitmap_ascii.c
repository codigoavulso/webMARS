#use <bitmap_ascii>
#use <bitmap_rect>

//টুল খুলুন > বিটম্যাপ প্রদর্শন এবং MIPS এর সাথে সংযোগ করুন।
//প্রোগ্রামটি ইউনিট 1x1, ডিসপ্লে 128x64 এবং বেস 0x10020000 কনফিগার করে।
void draw_ascii_line(int x, int y, int cols, int rows, int glyphs[], int length, int fg, int bg) {   //প্রতিটি গ্লাইফ ফ্রেমবাফারে পিক্সেল দ্বারা পিক্সেল আঁকা হয়
  int index = 0;
  while (index < length) {
    bitmap_ascii_put_char(x + index * 6, y, cols, rows, glyphs[index], fg, bg);   //প্রতি অক্ষর 6 পিক্সেল: ফন্টের নিজস্ব কোনো ব্যবধান নেই
    index = index + 1;
  }
}

int main(void) {
  int cols = 128;
  int rows = 64;
  int bg = 0x00000000;   //পিক্সেল প্রতি একটি শব্দ, 0x00RRGGBB
  int fg = 0x00ffffff;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);

  int line1[] = {104, 101, 108, 108, 111, 32, 77, 65, 82, 83};
  int line2[] = {
    67, 32, 66, 73, 84, 77, 65, 80, 32, 65, 83, 67, 73, 73
  };

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, bg);
  draw_ascii_line(8, 12, cols, rows, line1, 10, fg, bg);
  draw_ascii_line(8, 28, cols, rows, line2, 14, fg, bg);
  return 0;
}
