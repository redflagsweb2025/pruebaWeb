import { faker } from '@faker-js/faker';

export function generateFakeCards(n = 5) {
  const cards = [];
  for (let i = 0; i < n; i++) {
    cards.push({
      title: faker.commerce.productName(),
      desc: faker.commerce.productDescription()
    });
  }
  return cards;
}
