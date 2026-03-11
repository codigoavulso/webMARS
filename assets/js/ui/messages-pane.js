function trimToLimit(text, limit) {
  if (text.length <= limit) {
    return text;
  }
  return text.slice(text.length - limit);
}

export function createMessagesPane(refs, limit) {
  const { messages } = refs;

  const append = (node, message) => {
    const next = `${node.textContent}${message}`;
    node.textContent = trimToLimit(next, limit);
    node.scrollTop = node.scrollHeight;
  };

  const clear = () => {
    messages.mars.textContent = "";
    messages.run.textContent = "";
  };

  return {
    clear,
    postMars: (message) => append(messages.mars, message),
    postRun: (message) => append(messages.run, message)
  };
}
