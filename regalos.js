const money = cents => 'RD$' + (cents / 100).toLocaleString('es-DO', {minimumFractionDigits:2});
function element(tag, text) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  return item;
}
function field(form, title, type, props = {}) {
  const label = element('label', title);
  const input = Object.assign(element('input'), {type, required:true}, props);
  label.append(input);
  form.append(label);
  return input;
}
function action(form, title, run) {
  const button = element('button', title);
  const message = element('p');
  message.setAttribute('role','status');
  form.append(button, message);
  form.onsubmit = async event => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    try { await run(message); }
    catch (error) {
      const errors = {gift_balance:'Saldo de prueba insuficiente.', gift_code:'Revisa el código y entra con el correo del destinatario.'};
      message.textContent = errors[error.message] || error.message;
    } finally { button.disabled = false; }
  };
}
function amountField(form) {
  return field(form, 'Monto en pesos dominicanos', 'number', {min:'0.01', max:'100000', step:'0.01'});
}
export async function wallet(box, api) {
  const section = element('details');
  section.append(element('summary','Tarjetas de regalo · prueba'));
  const summary = element('p');
  const history = element('ul');
  section.append(summary);
  box.closest('details').before(section);
  const notifications = document.getElementById('avisos').closest('details');
  const inbox = element('div');
  const badge = element('span');
  notifications.querySelector('summary').append(badge);
  notifications.append(inbox);
  let revision = 0;
  async function refresh() {
    const version = ++revision;
    const state = await api('demo-gifts/');
    if (version !== revision) return;
    const pending = state.pending || [];
    badge.textContent = pending.length ? ' · Regalos (' + pending.length + ')' : '';
    inbox.replaceChildren(...pending.map(gift => {
      const row = element('p','Recibiste una tarjeta de regalo de prueba de ' + money(gift.cents) + '. ');
      const accept = element('a','Aceptar regalo');
      const url = new URL(location.href);
      if (url.searchParams.get('regalo') !== gift.id) url.hash = '';
      url.searchParams.set('regalo',gift.id);
      accept.href = url.href;
      row.append(accept);
      return row;
    }));
    summary.textContent = 'Saldo de prueba: ' + money(state.cents);
    history.replaceChildren(...state.receipts.map(r => element('li', r.business__name + ' · ' + money(r.cents) + ' · Comprobante de prueba ' + r.request_id)));
  }
  const gift = new URL(location.href).searchParams.get('regalo');
  if (gift) {
    section.open = true;

    const claim = element('form');
    const code = field(claim, 'Código privado recibido por correo', 'text', {maxLength:16});
    code.value = new URLSearchParams(location.hash.slice(1)).get('codigo') || '';
    if (code.value) code.parentElement.hidden = true;
    action(claim, 'Aceptar regalo', async () => {
      await api('demo-gifts/'+encodeURIComponent(gift)+'/claim/','POST',{code:code.value.trim()});
      const url = new URL(location.href);
      url.searchParams.delete('regalo');
      url.hash = '';
      window.history.replaceState(null,'',url);
      claim.replaceWith(element('p','Regalo aceptado. El saldo está en tu cuenta.'));
      await refresh();
    });
    section.append(claim);
  }
  const form = element('form');
  form.append(element('p','Crear tarjeta de prueba · Sin valor monetario'));
  const name = field(form,'Nombre de quien recibe','text',{maxLength:100});
  const email = field(form,'Correo de quien recibe','email',{maxLength:254});
  const amountLabel = element('label','Monto de la tarjeta');
  const amount = element('select');
  for (const value of [750, 1500, 3000]) {
    amount.add(new Option('RD$' + value.toLocaleString('es-DO'), String(value)));
  }
  amountLabel.append(amount);
  form.append(amountLabel);
  let requestId = crypto.randomUUID();
  form.oninput = () => { requestId = crypto.randomUUID(); };
  action(form,'Simular compra',async message => {
    const gift = await api('demo-gifts/','POST',{name:name.value,email:email.value,amount:amount.value,request_id:requestId});
    const link = element('a','Compartir enlace por WhatsApp');
    link.href = 'https://wa.me/?text='+encodeURIComponent('Tu tarjeta de regalo ANON de prueba: '+gift.link);
    const copy = element('input');
    copy.readOnly = true; copy.value = gift.link; copy.setAttribute('aria-label','Enlace para compartir');
    message.replaceChildren(element('span',gift.mailed?'Tarjeta enviada por correo.':'Tarjeta creada. El correo con el código sigue pendiente.'),copy,link);
  });
  section.append(form,history);
  notifications.addEventListener('toggle', () => {
    if (notifications.open) refresh().catch(() => {});
  });
  window.addEventListener('focus', () => refresh().catch(() => {}));
  await refresh();
}
export function giftPayment(container, business, api) {
  const section = element('details');
  section.append(element('summary','Usar saldo de regalo · prueba'));
  const form = element('form');
  const amount = amountField(form);
  let requestId = crypto.randomUUID();
  form.oninput = () => { requestId = crypto.randomUUID(); };
  action(form,'Confirmar canje de prueba',async message => {
    const session = await api('auth/session/');
    if (!session.authenticated) {
      const link = element('a','Entrar a mi cuenta');
      link.href = './citas.html?vista=perfil';
      message.replaceChildren(link);
      return;
    }
    const receipt = await api('demo-gifts/spend/','POST',{business:business.id,amount:amount.value,request_id:requestId});
    form.replaceWith(element('p','Canje de prueba en '+business.name+' · '+money(receipt.cents)+' · Comprobante '+receipt.receipt));
  });
  section.append(form);
  container.append(section);
}
