#संख्या का अनुमान लगाएं (1..100)
#यादृच्छिक संख्या निर्माण के लिए syscall 42 और पूर्णांक इनपुट के लिए syscall 5 का उपयोग करता है।
#$s0 syscalls में रहस्य रखता है; $s1 लूप पुनरावृत्तियों में प्रयासों की गणना करता है।

.data
title:      .asciiz "\n=== Guess the Number ===\n"
prompt:     .asciiz "Enter your guess (1..100): "
lowMsg:     .asciiz "Too low!\n"
highMsg:    .asciiz "Too high!\n"
winMsg:     .asciiz "Correct! Number of attempts: "
newline:    .asciiz "\n"

.text
main:
  #एक मनमाना बीज के साथ यादृच्छिक स्ट्रीम आईडी = 1 बीज।
  li $v0, 40
  li $a0, 1
  li $a1, 20260308
  syscall

  #रेंज में यादृच्छिक पूर्णांक [0,100), फिर [1,100] पर शिफ्ट करें।
  li $v0, 42
  li $a0, 1
  li $a1, 100
  syscall
  #Syscall 42 उत्पन्न मान को $a0 में लौटाता है, $v0 में नहीं।
  addiu $s0, $a0, 1      #गुप्त संख्या
  li $s1, 0              #प्रयास

  li $v0, 4
  la $a0, title
  syscall

guess_loop:
  #Syscalls तर्क/परिणाम रजिस्टरों को अधिलेखित कर सकते हैं, इसलिए लगातार स्थिति $s रजिस्टरों में बनी रहती है।
  li $v0, 4
  la $a0, prompt
  syscall

  li $v0, 5
  syscall
  #पूर्णांक इनपुट $v0 में लौटाया जाता है।
  move $t0, $v0          #अंदाज़ा लगाओ
  addiu $s1, $s1, 1

  #यदि अनुमान <गुप्त => बहुत कम है
  slt $t1, $t0, $s0
  bne $t1, $zero, too_low

  #यदि रहस्य <अनुमान => बहुत अधिक है
  slt $t1, $s0, $t0
  bne $t1, $zero, too_high

  #बराबर => जीत
  li $v0, 4
  la $a0, winMsg
  syscall

  li $v0, 1
  move $a0, $s1
  syscall

  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

too_low:
  #दोनों फीडबैक शाखाएं अगले पुनरावृत्ति पर एकत्रित होती हैं।
  li $v0, 4
  la $a0, lowMsg
  syscall
  j guess_loop

too_high:
  li $v0, 4
  la $a0, highMsg
  syscall
  j guess_loop
