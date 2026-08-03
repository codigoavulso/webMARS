//न्यूनतम ABI डेमो:
//- स्टैक फ़्रेम (मुख्य/कार्यों में स्थानीय)
//- आवंटन (int) के माध्यम से ढेर आवंटन
//- तर्क पारित करना ($a0-$a3 + स्टैक पर 5वां तर्क)
//- $v0 में वापसी मान

int sum5(int a, int b, int c, int d, int e) {
  //पहले चार तर्क $a0-$a3 का उपयोग करते हैं; पांचवें को कॉलर के स्टैक से पढ़ा जाता है।
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //सूचक ढेर स्मृति में लिखें।
  *slot = x + y;
  //डीरेफ़रेंसिंग सिम्युलेटेड MIPS मेमोरी से मान को वापस पढ़ता है।
  return *slot * 2;
}

int main(void) {
  int local = 7;                //स्थानीय ढेर
  int* heap_value = alloc(int); //ढेर (syscall sbrk)

  //कैली के वापस आने के बाद पॉइंटर वैध रहता है क्योंकि यह हीप मेमोरी को संदर्भित करता है।
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //5वाँ तर्क ढेर में फैल जाता है

  //अपेक्षित आउटपुट: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
