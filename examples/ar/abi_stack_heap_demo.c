//الحد الأدنى من العرض التوضيحي ABI:
//- إطار المكدس (السكان المحليين في الوظائف الرئيسية/الوظائف)
//- تخصيص الكومة عبر التخصيص (int)
//- تمرير الوسيطة ($a0-$a3 + الوسيطة الخامسة على المكدس)
//- القيمة المرجعة في $v0

int sum5(int a, int b, int c, int d, int e) {
  //تستخدم الوسائط الأربع الأولى $a0-$a3؛ تتم قراءة الخامس من مكدس المتصل.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //كتابة المؤشر في ذاكرة الكومة.
  *slot = x + y;
  //يقوم إلغاء المرجع بقراءة القيمة مرة أخرى من ذاكرة MIPS التي تمت محاكاتها.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //كومة المحلية
  int* heap_value = alloc(int); //كومة (سيسكال sbrk)

  //يظل المؤشر صالحًا بعد إرجاع المستدعي لأنه يشير إلى ذاكرة الكومة.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //تنسكب الوسيطة الخامسة إلى المكدس

  //الناتج المتوقع: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
