//মাল্টি-ফাইল সি প্রকল্প। stats.c stats.h থেকে তার ঘোষণা আমদানি করে।
#include "stats.h"   //শিরোনাম ঘোষণা করে কি বিদ্যমান
#use "stats.c"   //এবং এই লাইনটি ফাইলে নিয়ে আসে যা এটি বাস্তবায়ন করে

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //অ্যারে প্রধান এর ফ্রেমে বসবাস করে
  print_string("sum=");
  print_int(array_sum(values, 6));   //অ্যারে একটি ঠিকানা হিসাবে পাস করা হয়, অনুলিপি করা হয় না
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //একই অ্যারে, একই মডিউল থেকে অন্য ফাংশন
  print_char(10);
  return 0;
}
