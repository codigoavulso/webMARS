//मल्टी-फ़ाइल सी प्रोजेक्ट। stats.c अपनी घोषणाएँ stats.h से आयात करता है।
#include "stats.h"   //हेडर घोषित करता है कि क्या मौजूद है
#use "stats.c"   //और यह पंक्ति उस फ़ाइल को लाती है जो इसे कार्यान्वित करती है

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //सरणी मुख्य फ़्रेम में रहती है
  print_string("sum=");
  print_int(array_sum(values, 6));   //सरणी को एक पते के रूप में पारित किया गया है, कॉपी नहीं किया गया है
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //वही सरणी, उसी मॉड्यूल से दूसरा फ़ंक्शन
  print_char(10);
  return 0;
}
