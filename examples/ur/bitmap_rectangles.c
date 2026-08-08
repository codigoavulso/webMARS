#use <bitmap_rect>

//ٹولز > بٹ میپ ڈسپلے کھولیں اور MIPS سے جڑیں۔
//پروگرام یونٹ 1x1، ڈسپلے 128x64 اور بیس 0x10020000 کو ترتیب دیتا ہے۔
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //پروگرام خود MMIO کے ذریعے ریزولوشن اور فریم بفر بیس سیٹ کرتا ہے۔

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //صاف کرنے کا مطلب ہے ہر پکسل لفظ لکھنا: کوئی ہارڈ ویئر فل نہیں ہے۔

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //رنگ ہیں 0x00RRGGBB الفاظ، سیدھے میموری میں لکھے گئے
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
