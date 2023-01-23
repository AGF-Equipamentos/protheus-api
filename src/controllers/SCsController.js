const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { filial, sc, produto, aberto } = req.query

    let filial_condition
    let sc_condition
    let produto_condition
    let aberto_condition

    if (filial != null) {
      filial_condition = `SC1.C1_FILIAL IN (${filial}) AND`
    } else {
      filial_condition = ``
    }

    if (sc != null) {
      sc_condition = `SC1.C1_NUM = ('${sc}') AND`
    } else {
      sc_condition = ``
    }

    if (produto != null) {
      if (typeof produto === 'object') {
        produto_condition = `SC1.C1_PRODUTO IN ('${produto.join(`','`)}') AND`
      } else {
        produto_condition = `SC1.C1_PRODUTO IN ('${produto}') AND`
      }
    } else {
      produto_condition = ``
    }

    if (aberto != null && aberto === 'true') {
      aberto_condition = `SC1.C1_QUANT <> SC1.C1_QUJE AND SC1.C1_RESIDUO = '' AND`
    } else {
      aberto_condition = ``
    }

    // query to the database and get the records
    await request.query(
      `
            SELECT  SC1.C1_NUM AS SC,
                    SC1.C1_ITEM AS ITEM,
                    CONCAT(SUBSTRING(SC1.C1_EMISSAO,7,2),'/',SUBSTRING(SC1.C1_EMISSAO,5,2),'/',SUBSTRING(SC1.C1_EMISSAO,1,4)) AS EMISSAO,
                    RTRIM(SC1.C1_PRODUTO) AS PRODUTO,
                    RTRIM(SC1.C1_DESCRI) AS DESCRICAO,
                    SC1.C1_UM AS UM,
                    SC1.C1_QUANT AS QTD,
                    SC1.C1_QUJE AS QTD_ENT,
                    SC1.C1_QUANT - SC1.C1_QUJE AS SALDO,
                    RTRIM(SC1.C1_OBS) AS OBS,
                    CONCAT(SUBSTRING(SC1.C1_DATPRF,7,2),'/',SUBSTRING(SC1.C1_DATPRF,5,2),'/',SUBSTRING(SC1.C1_DATPRF,1,4)) AS ENTREGA,
                    SC1.C1_PEDIDO AS PC,
                    CONCAT(SUBSTRING(SC7.C7_DATPRF,7,2),'/',SUBSTRING(SC7.C7_DATPRF,5,2),'/',SUBSTRING(SC7.C7_DATPRF,1,4)) AS PC_ENTREGA,
                    RTRIM(SC1.C1_OP) AS OP

            FROM	  SC1010 AS SC1 WITH (NOLOCK) LEFT OUTER JOIN
                    SC7010 AS SC7 WITH (NOLOCK) ON SC7.D_E_L_E_T_ = '' AND ((SC7.C7_NUM = SC1.C1_PEDIDO) AND (SC7.C7_ITEM = SC1.C1_ITEMPED))

            WHERE	  ${sc_condition}
                    ${filial_condition}
                    ${produto_condition}
                    ${aberto_condition}
                    SC1.C1_RESIDUO = '' AND
                    SC1.D_E_L_E_T_ = ''

            ORDER BY SC1.C1_DATPRF, SC1.C1_NUM, SC1.C1_ITEM
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

        return res.json(recordset.recordsets[0])
        // send records as a response
      }
    )
  }
}
