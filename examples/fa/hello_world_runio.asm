#Hello World for Run I/O
#یک پیام ساده چاپ می کند و خارج می شود.
#این کوچکترین مثال از تقسیم داده/متن و قرارداد syscall است.

.data
#.asciiz کاراکترهایی را ذخیره می کند که به دنبال آن پایان دهنده صفر مورد نیاز syscall 4 قرار می گیرد.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #print-string (4) را در $v0 انتخاب کنید و آدرس رشته را در $a0 ارسال کنید.
  li $v0, 4
  la $a0, msg
  syscall

  #خروجی (10) برنامه شبیه سازی شده را به طور کامل متوقف می کند.
  li $v0, 10
  syscall
