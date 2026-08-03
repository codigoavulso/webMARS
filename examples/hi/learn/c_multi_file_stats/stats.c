#include "stats.h"   //मॉड्यूल अपनी स्वयं की घोषणाओं के विरुद्ध स्वयं की जाँच करता है

int array_sum(int values[], int length) {   //मान कॉलर की सरणी में सूचक के रूप में आते हैं
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //प्रत्येक सूचकांक MIPS में एक पता गणना बन जाता है
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //पहले तत्व से शुरू करें, फिर बाकी की तुलना करें
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //प्रति तत्व एक तुलना: यह लूप रैखिक है
  }
  return result;
}
