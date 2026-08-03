//ন্যূনতম ABI ডেমো:
//- স্ট্যাক ফ্রেম (প্রধান/ফাংশনে স্থানীয়)
//- alloc(int) এর মাধ্যমে হিপ বরাদ্দ
//- আর্গুমেন্ট পাসিং ($a0-$a3 + স্ট্যাকের উপর 5ম আর্গ)
//- রিটার্ন মান $v0 এ

int sum5(int a, int b, int c, int d, int e) {
  //প্রথম চারটি আর্গুমেন্ট $a0-$a3 ব্যবহার করে; পঞ্চমটি কলারের স্ট্যাক থেকে পড়া হয়।
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //পয়েন্টার গাদা মেমরি লিখুন.
  *slot = x + y;
  //ডিরেফারেন্সিং সিমুলেটেড MIPS মেমরি থেকে মানকে রিড করে।
  return *slot * 2;
}

int main(void) {
  int local = 7;                //স্থানীয় স্ট্যাক
  int* heap_value = alloc(int); //গাদা (syscall sbrk)

  //কলে ফিরে আসার পর পয়েন্টারটি বৈধ থাকে কারণ এটি হিপ মেমরিকে বোঝায়।
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //5 তম আর্গুমেন্ট স্ট্যাক করার জন্য ছড়িয়ে পড়ে

  //প্রত্যাশিত আউটপুট: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
