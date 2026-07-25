#use <bitmap_rect>

// Open Tools > Bitmap Display.
// Configure Unit 1x1, Display 128x64, Base 0x10020000, then connect to MIPS.
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_set_base_address(0x10020000);

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
