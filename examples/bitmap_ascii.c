#use <bitmap_ascii>
#use <bitmap_rect>

void draw_ascii_line(int x, int y, int cols, int rows, int glyphs[], int length, int fg, int bg) {
  int index = 0;
  while (index < length) {
    bitmap_ascii_put_char(x + index * 6, y, cols, rows, glyphs[index], fg, bg);
    index = index + 1;
  }
}

int main(void) {
  int cols = 512;
  int rows = 256;
  int bg = 0x00000000;
  int fg = 0x00ffffff;
  bitmap_set_base_address(0x10010000);

  int line1[] = {104, 101, 108, 108, 111, 32, 77, 65, 82, 83};
  int line2[] = {
    67, 32, 99, 111, 109, 112, 105, 108, 101, 114, 32,
    119, 114, 105, 116, 101, 100, 32, 98, 121, 32,
    78, 101, 108, 115, 111, 110, 32,
    70, 101, 114, 114, 101, 105, 114, 97, 32,
    64, 32, 50, 48, 50, 54
  };

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, bg);
  draw_ascii_line(8, 12, cols, rows, line1, 10, fg, bg);
  draw_ascii_line(8, 28, cols, rows, line2, 43, fg, bg);
  return 0;
}
