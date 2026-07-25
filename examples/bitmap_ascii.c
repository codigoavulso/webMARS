#use <bitmap_ascii>
#use <bitmap_rect>

// Open Tools > Bitmap Display.
// Configure Unit 1x1, Display 128x64, Base 0x10010000, then connect to MIPS.
void draw_ascii_line(int x, int y, int cols, int rows, int glyphs[], int length, int fg, int bg) {
  int index = 0;
  while (index < length) {
    bitmap_ascii_put_char(x + index * 6, y, cols, rows, glyphs[index], fg, bg);
    index = index + 1;
  }
}

int main(void) {
  int cols = 128;
  int rows = 64;
  int bg = 0x00000000;
  int fg = 0x00ffffff;
  bitmap_set_base_address(0x10010000);

  int line1[] = {104, 101, 108, 108, 111, 32, 77, 65, 82, 83};
  int line2[] = {
    67, 32, 66, 73, 84, 77, 65, 80, 32, 65, 83, 67, 73, 73
  };

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, bg);
  draw_ascii_line(8, 12, cols, rows, line1, 10, fg, bg);
  draw_ascii_line(8, 28, cols, rows, line2, 14, fg, bg);
  return 0;
}
