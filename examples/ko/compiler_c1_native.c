#include <stdio.h>
#include <string.h>

//C1-NATIVE 필요: 네이티브 argc/argv, 바이트 주소가 지정된 문자 배열
//함수 포인터를 통해 호출합니다.
//설정에서 프로그램 인수를 활성화하고 다음을 시도하십시오: mul
//webMARS argv[0]은 실행 파일 이름이 아니라 처음으로 제공된 토큰입니다.
typedef int (*binary_op)(int left, int right);

int add(int left, int right) {
  return left + right;
}

int multiply(int left, int right) {
  return left * right;
}

int apply(binary_op operation, int left, int right) {
  return operation(left, right);
}

int main(int argc, char** argv) {
  binary_op operation = add;
  char* operation_name = "add";

  if (argc > 0 && strcmp(argv[0], "mul") == 0) {
    operation = multiply;
    operation_name = "multiply";
  }

  char buffer[24] = "byte";
  strcat(buffer, "-addressed");
  int stored = 42;
  void* generic = (void*)&stored;
  int* recovered = (int*)generic;

  printf("argc=%d\n", argc);
  if (argc > 0) printf("argv[0]=%s\n", argv[0]);
  printf("operation=%s\n", operation_name);
  printf("result=%d\n", apply(operation, 6, 7));
  printf("buffer=%s length=%d\n", buffer, (int)strlen(buffer));
  printf("void pointer value=%d\n", *recovered);
  return 0;
}
