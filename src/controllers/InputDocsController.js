const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { filial, produto, top, desc } = req.query

    let filial_condition
    let produto_condition
    let top_condition
    let desc_condition

    if (filial != null) {
      filial_condition = `SD1.D1_FILIAL IN (${filial}) AND`
    } else {
      filial_condition = ``
    }

    if (top != null) {
      top_condition = `TOP ${top}`
    } else {
      top_condition = ``
    }

    if (desc != null && desc === 'true') {
      desc_condition = `SD1.D1_DTDIGIT DESC`
    } else {
      desc_condition = `SD1.D1_DTDIGIT`
    }

    if (produto != null) {
      produto_condition = `SD1.D1_COD IN ('${produto}') AND`
    } else {
      produto_condition = ``
    }

    // query to the database and get the records
    await request.query(
      `
            SELECT  ${top_condition}
                    SD1.D1_PEDIDO AS PEDIDO,
                    SD1.D1_QUANT AS QTD,
                    SD1.D1_VUNIT AS PRECO,
                    CONCAT(SUBSTRING(SD1.D1_DTDIGIT,7,2),'/',SUBSTRING(SD1.D1_DTDIGIT,5,2),'/',SUBSTRING(SD1.D1_DTDIGIT,1,4)) AS ENTREGUE,
                    RTRIM(SA2.A2_NREDUZ) AS DESC_FORN

            FROM	  SD1010 AS SD1 WITH (NOLOCK) LEFT OUTER JOIN
                    SF1010 AS SF1 WITH (NOLOCK) ON SD1.D1_LOJA = SF1.F1_LOJA AND SD1.D1_FORNECE = SF1.F1_FORNECE AND SD1.D1_FILIAL = SF1.F1_FILIAL AND SD1.D1_DOC = SF1.F1_DOC AND SD1.D1_SERIE = SF1.F1_SERIE LEFT OUTER JOIN
                    SA2010 AS SA2 WITH (NOLOCK) ON SA2.D_E_L_E_T_ = '' AND SA2.A2_FILIAL = LEFT('${filial}', 2) AND SA2.A2_COD = SD1.D1_FORNECE

            WHERE
                    ${filial_condition}
                    ${produto_condition}
                    SF1.F1_TIPO <> 'B' AND
                    SD1.D_E_L_E_T_ = '' AND
                    SF1.D_E_L_E_T_ = '' AND
                    SA2.D_E_L_E_T_ = ''

            ORDER BY ${desc_condition}
            `,
      function (err, recordset) {
        if (err) console.log(err)

        return res.json(recordset.recordsets[0])
        // send records as a response
      }
    )
  }
}
