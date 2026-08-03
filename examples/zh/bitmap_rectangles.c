#use <bitmap_rect>

//打开工具 > 位图显示并连接到 MIPS。
//该程序配置单元 1x1、显示器 128x64 和基本 0x10020000。
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //程序本身通过 MMIO 设置分辨率和帧缓冲区基础

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //清除意味着写入每个像素字：没有硬件填充

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //颜色是 0x00RRGGBB 字，直接写入内存
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
