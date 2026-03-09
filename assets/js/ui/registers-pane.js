export function createRegistersPane(refs) {
  const { registers } = refs;

  const render = (registerRows) => {
    registers.body.innerHTML = registerRows
      .map(
        (register) => `<tr>
          <td>${register.index}</td>
          <td>${register.name}</td>
          <td>${register.valueHex}</td>
          <td>${register.value}</td>
        </tr>`
      )
      .join("");
  };

  return {
    render
  };
}
