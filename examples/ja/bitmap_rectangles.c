#use <bitmap_rect>

//[ツール] > [ビットマップ表示] を開き、MIPS に接続します。
//このプログラムは、ユニット 1x1、ディスプレイ 128x64、ベース 0x10020000 を構成します。
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //プログラム自体は、MMIO を通じて解像度とフレームバッファーベースを設定します。

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //クリアとは、すべてのピクセル ワードを書き込むことを意味します。ハードウェアによる埋め込みはありません。

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //色は 0x00RRGGBB ワードであり、メモリに直接書き込まれます。
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
