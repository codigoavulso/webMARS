#include <stddef.h>
#use <util>

int EXIT_SUCCESS = 0;
int EXIT_FAILURE = 1;

bool _stdlib_is_space(int ch) {
  return ch == 32 || ch == 9 || ch == 10 || ch == 11 || ch == 12 || ch == 13;
}

bool _stdlib_is_digit(int ch) {
  return ch >= 48 && ch <= 57;
}

int atoi(string text) {
  int len = __wm_string_length(text);
  int index = 0;

  while (index < len && _stdlib_is_space((int)__wm_string_charat(text, index))) {
    index = index + 1;
  }

  int sign = 1;
  if (index < len) {
    int marker = (int)__wm_string_charat(text, index);
    if (marker == 45) {
      sign = -1;
      index = index + 1;
    } else if (marker == 43) {
      index = index + 1;
    }
  }

  int value = 0;
  while (index < len) {
    int ch = (int)__wm_string_charat(text, index);
    if (!_stdlib_is_digit(ch)) break;
    value = value * 10 + (ch - 48);
    index = index + 1;
  }

  return value * sign;
}

int atol(string text) {
  return atoi(text);
}

int labs(int value) {
  return abs(value);
}

void abort(void) {
  exit(EXIT_FAILURE);
}
