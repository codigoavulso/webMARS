#use <bitmap_rect>

//Buka Alat > Tampilan Bitmap dan sambungkan ke MIPS.
//Program ini mengkonfigurasi Unit 1x1, Tampilan 128x64 dan Basis 0x10020000.
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //program itu sendiri menetapkan resolusi dan basis framebuffer melalui MMIO

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //membersihkan berarti menulis setiap kata piksel: tidak ada pengisian perangkat keras

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //warna adalah kata-kata 0x00RRGGBB, ditulis langsung ke dalam memori
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
