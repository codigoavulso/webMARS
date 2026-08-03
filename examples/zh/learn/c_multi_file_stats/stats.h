//标头是一个契约：它说明存在什么，而不是它如何工作。
//main.c 包含它是为了了解下面的两个签名，以及 stats.c
//包含它，以便编译器根据它们检查实现。
//该文件不会生成任何代码。

int array_sum(int values[], int length);   //仅声明：编译器学习签名
int array_max(int values[], int length);   //任何包含此标头的人都可以调用它
