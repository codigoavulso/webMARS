bool _ctype_is_lower(int ch) {
  return ch >= 97 && ch <= 122;
}

bool _ctype_is_upper(int ch) {
  return ch >= 65 && ch <= 90;
}

bool _ctype_is_digit(int ch) {
  return ch >= 48 && ch <= 57;
}

int isalpha(int ch) {
  if (_ctype_is_lower(ch) || _ctype_is_upper(ch)) return 1;
  return 0;
}

int isdigit(int ch) {
  if (_ctype_is_digit(ch)) return 1;
  return 0;
}

int isalnum(int ch) {
  if (isalpha(ch) != 0 || isdigit(ch) != 0) return 1;
  return 0;
}

int isspace(int ch) {
  if (ch == 32 || ch == 9 || ch == 10 || ch == 11 || ch == 12 || ch == 13) return 1;
  return 0;
}

int islower(int ch) {
  if (_ctype_is_lower(ch)) return 1;
  return 0;
}

int isupper(int ch) {
  if (_ctype_is_upper(ch)) return 1;
  return 0;
}

int isxdigit(int ch) {
  if (isdigit(ch) != 0 || (ch >= 65 && ch <= 70) || (ch >= 97 && ch <= 102)) return 1;
  return 0;
}

int tolower(int ch) {
  if (_ctype_is_upper(ch)) return ch + 32;
  return ch;
}

int toupper(int ch) {
  if (_ctype_is_lower(ch)) return ch - 32;
  return ch;
}
