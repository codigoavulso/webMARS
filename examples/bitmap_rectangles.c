#use <bitmap_rect>

int main(void) {
  int cols = 512;
  int rows = 256;
  bitmap_set_base_address(0x10010000);

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);

  bitmap_fill_rect(24, 20, 132, 84, cols, rows, 0x00ff3a3a);
  bitmap_fill_rect(174, 36, 150, 92, cols, rows, 0x0036d15b);
  bitmap_fill_rect(344, 56, 122, 78, cols, rows, 0x003b82f6);
  bitmap_fill_rect(110, 146, 210, 72, cols, rows, 0x00ffd166);

  return 0;
}
