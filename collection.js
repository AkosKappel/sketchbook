// Renders the category filters and project cards from the lists in projects.js.
const filters = document.querySelector('.filters');
const grid = document.querySelector('.grid');
const cardTemplate = document.getElementById('card-template');
const categoryColor = Object.fromEntries(CATEGORIES.map((category) => [category.id, category.color]));

function addFilter(id, name, count, color) {
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'filter';
  input.id = `filter-${id}`;
  input.value = id;
  input.checked = id === 'all';

  const label = document.createElement('label');
  label.htmlFor = input.id;
  label.style.setProperty('--dot', color);
  const countElement = document.createElement('span');
  countElement.textContent = count;
  label.append(`${name} `, countElement);

  filters.append(input, label);
}

function createCard(project) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.category = project.category;
  card.style.setProperty('--dot', categoryColor[project.category]);
  for (const link of card.querySelectorAll('a')) link.href = `${project.folder}/`;
  card.querySelector('img').src = `thumbs/${project.folder}.webp`;
  card.querySelector('.category').textContent = project.label;
  card.querySelector('h2 a').textContent = project.title;
  card.querySelector('.summary').textContent = project.summary;
  card.querySelector('details p').textContent = project.how;
  return card;
}

addFilter('all', 'All', PROJECTS.length, 'var(--text)');
for (const category of CATEGORIES) {
  const count = PROJECTS.filter((project) => project.category === category.id).length;
  addFilter(category.id, category.name, count, category.color);
}
grid.append(...PROJECTS.map(createCard));

filters.addEventListener('change', (event) => {
  const selected = event.target.value;
  for (const card of grid.children) {
    card.hidden = selected !== 'all' && card.dataset.category !== selected;
  }
});
