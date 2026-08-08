#use <bitmap_rect>

//Araçlar > Bit Eşlem Görünümü'nü açın ve MIPS öğesine bağlanın.
//Program, Ünite 1x1, Ekran 128x64 ve Tabanı 0x10020000 yapılandırır.
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //programın kendisi çözünürlüğü ve çerçeve arabellek tabanını MMIO aracılığıyla ayarlar

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //Temizleme, her piksel sözcüğünün yazılması anlamına gelir: donanım dolgusu yoktur

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //renkler 0x00RRGGBB sözcükleridir ve doğrudan belleğe yazılır
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
