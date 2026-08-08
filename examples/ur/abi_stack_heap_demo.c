//کم سے کم ABI ڈیمو:
//- اسٹیک فریم (مین/فنکشنز میں مقامی)
//- alloc(int) کے ذریعے ہیپ ایلوکیشن
//- آرگیومینٹ پاسنگ ($a0-$a3 + اسٹیک پر پانچواں آرگ)
//- $v0 میں واپسی کی قیمت

int sum5(int a, int b, int c, int d, int e) {
  //پہلے چار دلائل $a0-$a3 کا استعمال کرتے ہیں؛ پانچواں کالر کے اسٹیک سے پڑھا جاتا ہے۔
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //ہیپ میموری میں پوائنٹر لکھیں۔
  *slot = x + y;
  //ڈیریفرنسنگ مصنوعی MIPS میموری سے قدر کو واپس پڑھتی ہے۔
  return *slot * 2;
}

int main(void) {
  int local = 7;                //مقامی اسٹیک
  int* heap_value = alloc(int); //ہیپ (syscall sbrk)

  //کالی کے واپس آنے کے بعد پوائنٹر درست رہتا ہے کیونکہ اس سے مراد ہیپ میموری ہے۔
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //5 ویں دلیل اسٹیک پر پھیل جاتی ہے۔

  //متوقع پیداوار: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
