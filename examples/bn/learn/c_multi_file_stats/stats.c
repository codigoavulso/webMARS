#include "stats.h"   //মডিউল তার নিজস্ব ঘোষণার বিরুদ্ধে নিজেকে পরীক্ষা করে

int array_sum(int values[], int length) {   //মানগুলি কলারের অ্যারেতে একটি পয়েন্টার হিসাবে আসে
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //প্রতিটি সূচক MIPS এ একটি ঠিকানা গণনা হয়ে যায়
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //প্রথম উপাদান থেকে শুরু, তারপর বাকি তুলনা
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //উপাদান প্রতি একটি তুলনা: এই লুপ রৈখিক
  }
  return result;
}
