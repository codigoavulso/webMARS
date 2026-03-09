function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createExecutePane(refs) {
  const { execute } = refs;

  const renderText = (rows) => {
    if (rows.length === 0) {
      execute.textBody.innerHTML = `<tr><td colspan="5" class="muted">No text segment loaded.</td></tr>`;
      return;
    }

    execute.textBody.innerHTML = rows
      .map((row) => {
        const marker = row.breakpoint ? "checked" : "";
        const currentClass = row.isCurrent ? "current-row" : "";
        return `<tr class="${currentClass}">
          <td><input type="checkbox" data-breakpoint-address="${row.address}" ${marker} /></td>
          <td>${row.addressHex}</td>
          <td>${row.code}</td>
          <td>${escapeHtml(row.basic)}</td>
          <td>${escapeHtml(row.source)}</td>
        </tr>`;
      })
      .join("");
  };

  const renderData = (rows) => {
    execute.dataBody.innerHTML = rows
      .map(
        (row) => `<tr>
          <td>${row.addressHex}</td>
          <td>${row.valueHex}</td>
          <td>${row.value}</td>
        </tr>`
      )
      .join("");
  };

  const renderLabels = (labels) => {
    if (labels.length === 0) {
      execute.labelsList.innerHTML = `<li class="muted">No labels</li>`;
      return;
    }

    execute.labelsList.innerHTML = labels
      .map((entry) => `<li>${escapeHtml(entry.label)} = ${entry.addressHex}</li>`)
      .join("");
  };

  const render = (snapshot) => {
    renderText(snapshot.textRows);
    renderData(snapshot.dataRows);
    renderLabels(snapshot.labels);
  };

  const onToggleBreakpoint = (handler) => {
    execute.textBody.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      const address = target.dataset.breakpointAddress;
      if (!address) {
        return;
      }
      handler(Number(address));
    });
  };

  return {
    render,
    onToggleBreakpoint
  };
}
