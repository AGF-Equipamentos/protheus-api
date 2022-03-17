const { randomUUID } = require('crypto')

const singleProductPriceMapper = (products, part_number, quantity) => {
  return products.length > 0
    ? {
        id: randomUUID(),
        budget_text: products
          .map(
            (product) =>
              `Código: ${product.part_number}\nPreço: ${new Intl.NumberFormat(
                'pt-BR',
                {
                  style: 'currency',
                  currency: 'BRL'
                }
              ).format(product.price)}\nQtd: ${quantity}`
          )
          .toString(),
        total: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(quantity * products[0].price)
      }
    : {
        id: randomUUID(),
        budget_text: `Código: ${part_number}\nPreço: Sob consulta\nQtd: ${quantity}`,
        total: 'Sob consulta'
      }
}

const multiProductPriceMapper = (products, budget_items_splitted) => {
  return {
    id: randomUUID(),
    budget_text: budget_items_splitted
      .map((budgetItem) => {
        const productItem = products.find(
          (p) => p.part_number === budgetItem.part_number
        )
        return `Código: ${budgetItem.part_number}\nPreço: ${
          productItem
            ? new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(productItem.price)
            : 'Sob consulta'
        }\nQtd: ${budgetItem.qty}`
      })
      .join('\n\n'),
    total: new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(
      products.reduce((acc, product) => {
        const budgetItem = budget_items_splitted.find(
          (p) => p.part_number === product.part_number
        )
        return acc + product.price * budgetItem.qty
      }, 0)
    )
  }
}

module.exports = {
  singleProductPriceMapper,
  multiProductPriceMapper
}
