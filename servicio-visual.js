const categories = [
  ['barberia', /barber|corte|barba/],
  ['belleza', /maquilla|novia|ceja|salon|belleza|unas|peina/],
  ['clases', /clase|tutori|educa|idioma|conta/],
  ['cafe', /cafe|bebida|trago/],
  ['comida', /comida|restaurante|cocina|mesa|chef|bar\b/],
  ['oficios', /plom|elec|repara|carpin|mecani|pintura|ferreter|tecnic/],
  ['tienda', /tienda|producto|colmado|supli|mercado/]
];

export function categoryPhoto(service = '', category = '') {
  const hint = (service + ' ' + category).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const name = categories.find(([, pattern]) => pattern.test(hint))?.[0] || 'local';
  const photo = document.createElement('img');
  photo.src = './imagenes/' + name + '.webp';
  photo.alt = 'Imagen ilustrativa de la categoría';
  photo.loading = 'lazy';
  return photo;
}

export function money(value, country = "DO") {
  if (value == null || value === '') return 'A convenir';
  return (country === 'US' ? 'US$' : 'RD$') + Number(value).toLocaleString('es-DO', {maximumFractionDigits: 2});
}
