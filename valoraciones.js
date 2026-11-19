export function ratingForm(previous, save) {
  const form = document.createElement('form');
  form.className = 'review-form';
  const label = document.createElement('label');
  label.textContent = 'Tu valoración';
  const select = document.createElement('select');
  select.required = true;
  select.append(new Option('Elige las estrellas',''));
  for (let score = 1; score <= 5; score++)
    select.add(new Option(score + (score === 1 ? ' estrella' : ' estrellas'),String(score)));
  select.value = previous == null ? '' : String(previous);
  label.append(select);
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = previous == null ? 'Valorar' : 'Actualizar valoración';
  const message = document.createElement('span');
  message.setAttribute('role','status');
  form.append(label,button,message);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    try {
      await save(Number(select.value));
      message.textContent = 'Valoración guardada.';
      button.textContent = 'Actualizar valoración';
    } catch {
      message.textContent = 'No se pudo guardar la valoración. Vuelve a intentarlo.';
    } finally { button.disabled = false; }
  });
  return form;
}
