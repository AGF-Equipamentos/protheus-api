const { singleProductPriceMapper, multiProductPriceMapper } = require('.')

describe('singleProductPriceMapper()', () => {
  it.todo('should return an warning when the part number does not exists')
  it.todo('should return an warning when the products is out of stock')

  it('should return a product with the price formatted', () => {
    const productFormatted = singleProductPriceMapper(
      [
        {
          part_number: '02022CH',
          price: 327.42,
          table_pn: '013'
        }
      ],
      '02022CH',
      3
    )

    expect(productFormatted).toStrictEqual({
      id: productFormatted.id,
      budget_text: 'Código: 02022CH\nPreço: R$\xa0327,42\nQtd: 3',
      total: 'R$\xa0982,26'
    })
  })

  it('should return a product when do not have price with under consult', () => {
    const productFormatted = singleProductPriceMapper([], '02022CE', 3)

    expect(productFormatted).toStrictEqual({
      id: productFormatted.id,
      budget_text: 'Código: 02022CE\nPreço: Sob consulta\nQtd: 3',
      total: 'Sob consulta'
    })
  })
})

describe('multiProductPriceMapper', () => {
  it.todo('should return an warning when the part number does not exists')
  it.todo('should return an warning when the products is out of stock')

  it('should return the products with price formatted', () => {
    const productsFormatted = multiProductPriceMapper(
      [
        {
          part_number: '02022CH',
          price: 327.42,
          table_pn: '013'
        },
        {
          part_number: '02022UN',
          price: 326.78,
          table_pn: '013'
        }
      ],
      [
        { part_number: '02022CH', qty: '2' },
        { part_number: '02022UN', qty: '3' },
        { part_number: '02022CE', qty: '4' }
      ]
    )

    expect(productsFormatted).toStrictEqual({
      id: productsFormatted.id,
      budget_text: [
        'Código: 02022CH\nPreço: R$\xa0327,42\nQtd: 2',
        'Código: 02022UN\nPreço: R$\xa0326,78\nQtd: 3',
        'Código: 02022CE\nPreço: Sob consulta\nQtd: 4'
      ].join('\n\n'),
      total: 'R$\xa01.635,18'
    })
  })
})
