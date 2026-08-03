#use <bitmap_rect>

//টুল খুলুন > বিটম্যাপ প্রদর্শন এবং MIPS এর সাথে সংযোগ করুন।
//প্রোগ্রামটি ইউনিট 1x1, ডিসপ্লে 128x64 এবং বেস 0x10020000 কনফিগার করে।
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //প্রোগ্রাম নিজেই MMIO এর মাধ্যমে রেজোলিউশন এবং ফ্রেমবাফার বেস সেট করে

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //ক্লিয়ারিং মানে প্রতিটি পিক্সেল শব্দ লেখা: কোনো হার্ডওয়্যার ফিল নেই

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //রঙগুলি হল 0x00RRGGBB শব্দ, সরাসরি মেমরিতে লেখা
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
