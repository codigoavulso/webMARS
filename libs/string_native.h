#include <stddef.h>

int string_length(string s) {
  return __wm_string_length(s);
}

//@requires 0 <= idx && idx < string_length(s);
char string_charat(string s, int idx) {
  return __wm_string_charat(s, idx);
}

//@ensures string_length(\result) == string_length(a) + string_length(b);
string string_join(string a, string b) {
  return __wm_string_join(a, b);
}

//@requires 0 <= start && start <= end && end <= string_length(a);
//@ensures string_length(\result) == end - start;
string string_sub(string a, int start, int end) {
  return __wm_string_sub(a, start, end);
}

bool string_equal(string a, string b) {
  return __wm_string_compare(a, b) == 0;
}

int string_compare(string a, string b) {
  return __wm_string_compare(a, b);
}

string string_fromint(int i) {
  return __wm_string_fromint(i);
}

string string_frombool(bool b) {
  if (b) return "true";
  return "false";
}

//@requires c != '\0';
//@ensures string_length(\result) == 1;
//@ensures string_charat(\result, 0) == c;
string string_fromchar(char c) {
  return __wm_string_fromchar(c);
}

string string_tolower(string s) {
  return __wm_string_tolower(s);
}

bool string_terminated(char* A, int n) {
  return __wm_cstr_terminated(A, n);
}

char* string_to_chararray(string s) {
  return __wm_cstr_from_string(s);
}

string string_from_chararray(char* A) {
  return __wm_string_from_cstr(A);
}

int char_ord(char c) {
  return (int)c;
}

char char_chr(int n) {
  return __wm_char_chr(n);
}

size_t strlen(char* s) {
  return __wm_string_length(s);
}

size_t strnlen(char* s, size_t maxCount) {
  size_t index = 0;
  while (index < maxCount && s[index] != '\0') {
    index = index + 1;
  }
  return index;
}

int strcmp(char* a, char* b) {
  return __wm_string_compare(a, b);
}

int strncmp(char* a, char* b, int count) {
  if (count <= 0) return 0;

  int index = 0;
  while (index < count) {
    int left = (int)a[index];
    int right = (int)b[index];
    if (left != right) {
      if (left < right) return -1;
      return 1;
    }
    if (left == 0) return 0;
    index = index + 1;
  }

  return 0;
}

char* strcpy(char* dst, char* src) {
  int index = 0;
  while (true) {
    char value = src[index];
    dst[index] = value;
    if (value == '\0') return dst;
    index = index + 1;
  }
  return dst;
}

char* strncpy(char* dst, char* src, int count) {
  if (count <= 0) return dst;

  int index = 0;
  while (index < count && src[index] != '\0') {
    dst[index] = src[index];
    index = index + 1;
  }
  while (index < count) {
    dst[index] = '\0';
    index = index + 1;
  }
  return dst;
}

char* strcat(char* dst, char* src) {
  int dstIndex = (int)strlen(dst);
  int srcIndex = 0;
  while (true) {
    char value = src[srcIndex];
    dst[dstIndex + srcIndex] = value;
    if (value == '\0') return dst;
    srcIndex = srcIndex + 1;
  }
  return dst;
}

char* strncat(char* dst, char* src, int count) {
  int dstIndex = (int)strlen(dst);
  int srcIndex = 0;
  while (srcIndex < count && src[srcIndex] != '\0') {
    dst[dstIndex + srcIndex] = src[srcIndex];
    srcIndex = srcIndex + 1;
  }
  dst[dstIndex + srcIndex] = '\0';
  return dst;
}

int memcmp(char* left, char* right, size_t count) {
  size_t index = 0;
  while (index < count) {
    int a = (int)left[index] & 255;
    int b = (int)right[index] & 255;
    if (a != b) {
      if (a < b) return -1;
      return 1;
    }
    index = index + 1;
  }
  return 0;
}

char* memcpy(char* dst, char* src, size_t count) {
  size_t index = 0;
  while (index < count) {
    dst[index] = src[index];
    index = index + 1;
  }
  return dst;
}

char* memmove(char* dst, char* src, size_t count) {
  if ((int)dst == (int)src || count <= 0) return dst;

  if ((int)dst < (int)src) {
    size_t index = 0;
    while (index < count) {
      dst[index] = src[index];
      index = index + 1;
    }
    return dst;
  }

  int index = (int)count - 1;
  while (index >= 0) {
    dst[index] = src[index];
    index = index - 1;
  }
  return dst;
}

char* memset(char* dst, int value, size_t count) {
  size_t index = 0;
  char fill = (char)(value & 255);
  while (index < count) {
    dst[index] = fill;
    index = index + 1;
  }
  return dst;
}
