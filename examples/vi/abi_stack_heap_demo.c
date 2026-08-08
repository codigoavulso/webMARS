//Bản trình diễn ABI tối thiểu:
//- khung ngăn xếp (cục bộ trong hàm chính/chức năng)
//- phân bổ heap thông qua alloc(int)
//- truyền đối số ($a0-$a3 + đối số thứ 5 trên ngăn xếp)
//- giá trị trả về trong $v0

int sum5(int a, int b, int c, int d, int e) {
  //Bốn đối số đầu tiên sử dụng $a0-$a3; thứ năm được đọc từ ngăn xếp của người gọi.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //Con trỏ ghi vào bộ nhớ heap.
  *slot = x + y;
  //Hội thảo hủy đọc giá trị trở lại từ bộ nhớ MIPS mô phỏng.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //ngăn xếp cục bộ
  int* heap_value = alloc(int); //đống (syscall sbrk)

  //Con trỏ vẫn hợp lệ sau khi callee trả về vì nó đề cập đến bộ nhớ heap.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //đối số thứ 5 tràn vào ngăn xếp

  //Sản lượng dự kiến: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
