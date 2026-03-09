function getCaretLineColumn(text, offset) {
  const upToOffset = text.slice(0, offset);
  const lines = upToOffset.split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

export function setupEditor(refs, store) {
  const { editor, status } = refs;

  const updateStatus = () => {
    const text = editor.value;
    const lineCount = text.length === 0 ? 1 : text.split("\n").length;
    const caretPosition = editor.selectionStart ?? 0;
    const { line, column } = getCaretLineColumn(text, caretPosition);

    status.lines.textContent = `lines: ${lineCount}`;
    status.caret.textContent = `Ln ${line}, Col ${column}`;
  };

  editor.addEventListener("input", () => {
    store.setState({ sourceCode: editor.value });
    updateStatus();
  });

  editor.addEventListener("click", updateStatus);
  editor.addEventListener("keyup", updateStatus);

  const setSource = (source) => {
    editor.value = source;
    store.setState({ sourceCode: source });
    updateStatus();
  };

  updateStatus();

  return {
    setSource,
    updateStatus,
    focus: () => editor.focus()
  };
}
