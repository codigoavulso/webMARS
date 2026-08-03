//@requires \length(row) == 3;
int row_sum(int row[]) {   //पैरामीटर एक पता है: पंक्ति की प्रतिलिपि नहीं बनाई गई है
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //पंक्ति[i] आधार + i*4 पर संकलित होती है
  }
  return total;
}

int main(void) {
  //S3 सरणियाँ विषय: स्थानीय सरणियाँ, आरंभकर्ता सूचियाँ, बहुआयामी आकार और सरणी पैरामीटर।
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //तीन शब्दों की दो पंक्तियाँ, स्मृति में सन्निहित
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //मैट्रिक्स[0] और मैट्रिक्स[1] पते 12 बाइट्स अलग हैं

  //अपेक्षित आउटपुट: 21
  print_int(total);
  print_char(10);
  return 0;
}
