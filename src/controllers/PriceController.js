const sql = require('mssql')
const {
  singleProductPriceMapper,
  multiProductPriceMapper
} = require('../utils/mappers')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const {
      branch,
      part_number,
      table_pn,
      quantity = '1',
      budget_items
    } = req.query
    let part_number_condition
    let branch_condition
    let table_pn_condition
    let budget_items_splitted

    if (budget_items) {
      budget_items_splitted = budget_items.split('\n').map((item) => {
        const itemSplitted = item.split(';')
        return {
          part_number: `${itemSplitted[0].toUpperCase().trim()}`,
          part_number_query: `'${itemSplitted[0].toUpperCase().trim()}'`,
          qty: itemSplitted[1]
        }
      })

      part_number_condition = `DA1.DA1_CODPRO IN (${budget_items_splitted
        .map((item) => item.part_number_query)
        .toString()}) AND`
      console.log(
        budget_items.split('\n'),
        budget_items_splitted,
        part_number_condition
      )
    } else {
      if (part_number != null) {
        part_number_condition = `DA1.DA1_CODPRO IN ('${part_number
          .toUpperCase()
          .trim()}') AND`
      } else {
        part_number_condition = ``
      }
    }

    if (branch != null) {
      branch_condition = `DA1.DA1_FILIAL IN ('${branch.slice(0, 2)}') AND`
    } else {
      branch_condition = ``
    }

    if (table_pn != null) {
      table_pn_condition = `DA1.DA1_CODTAB IN ('${table_pn}') AND`
    } else {
      table_pn_condition = ``
    }

    await request.query(
      `
            SELECT
                    RTRIM(DA1.DA1_CODPRO) AS part_number,
                    DA1.DA1_PRCVEN AS price,
                    DA1.DA1_CODTAB AS table_pn

            FROM	  DA1010 AS DA1 WITH (NOLOCK)

            WHERE	  ${part_number_condition}
                    ${table_pn_condition}
                    ${branch_condition}
                    DA1.D_E_L_E_T_ = ''

            `,
      function (err, recordset) {
        if (err) {
          console.log(err)
          return res.json({
            error: {
              message: err
            }
          })
        }
        console.log(recordset.recordsets[0])
        return res.json(
          recordset.recordsets[0].length > 1
            ? multiProductPriceMapper(
                recordset.recordsets[0],
                budget_items_splitted
              )
            : singleProductPriceMapper(
                recordset.recordsets[0],
                part_number,
                quantity
              )
        )
      }
    )
  }
}
