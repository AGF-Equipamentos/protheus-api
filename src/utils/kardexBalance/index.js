const balanceTotalkardex = (kardexItens) => {
  const balanceTotal = kardexItens.reduce((acc, kardexItem, idx) => {
    acc.push({
      ...kardexItem,
      ...(idx === 0
        ? {
            saldoCustoTotal: Number(kardexItem['Custo Total'].toFixed(2)),
            saldoQtde: kardexItem['Qtde.']
          }
        : {
            saldoCustoTotal: Number(
              (
                acc[idx - 1].saldoCustoTotal + kardexItem['Custo Total']
              ).toFixed(2)
            ),
            saldoQtde: acc[idx - 1].saldoQtde + kardexItem['Qtde.']
          })
    })
    return acc
  }, [])
  return balanceTotal
}

module.exports = {
  balanceTotalkardex
}