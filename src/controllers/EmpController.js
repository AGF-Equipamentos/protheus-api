const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    // kanban true = filtrar tudo que S
    // kanban false = filtrar tudo que é diferente de S
    // kanban null = filtrar nada

    const { filial, op, produto, kanban, supermercado } = req.query

    let filial_condition
    let op_condition
    let produto_condition
    let supermercado_condition
    let kanban_condition

    if (filial != null) {
      filial_condition = `SD4.D4_FILIAL IN (${filial}) AND`
    } else {
      filial_condition = ``
    }

    if (op != null) {
      op_condition = `SD4.D4_OP = ('${op}') AND`
    } else {
      op_condition = ``
    }

    if (produto != null) {
      if (typeof produto === 'object') {
        produto_condition = `SD4.D4_COD IN ('${produto.join(`','`)}') AND`
      } else {
        produto_condition = `SD4.D4_COD IN ('${produto}') AND`
      }
    } else {
      produto_condition = ``
    }

    if (kanban === 'true') {
      kanban_condition = `SB1.B1_ZZKANBA = 'S' AND`
    } else if (kanban === 'false') {
      kanban_condition = `(SB1.B1_ZZKANBA = 'N') AND`
    } else {
      kanban_condition = ``
    }

    if (supermercado === 'true') {
      supermercado_condition = `SB1.B1_APROPRI = 'I' AND`
    } else if (supermercado === 'false') {
      supermercado_condition = `SB1.B1_APROPRI <> 'I' AND`
    } else {
      supermercado_condition = ``
    }
    //CONCAT(SUBSTRING(SC2.C2_DATPRI,7,2),'/',SUBSTRING(SC2.C2_DATPRI,5,2),'/',SUBSTRING(SC2.C2_DATPRI,1,4)) AS ENTREGA

    // query to the database and get the records
    await request.query(
      `
            SELECT
                    RTRIM(SD4.D4_COD) AS CODIGO,
                    RTRIM(SB1.B1_DESC) AS DESCRICAO,
                    RTRIM(SB1.B1_ZZLOCA) AS LOCACAO,
                    SD4.D4_LOCAL AS ARMAZEM,
                    SD4.D4_QTDEORI AS QUANTIDADE,
                    SD4.D4_QUANT AS SALDO,
                    SB1.B1_ZZKANBA AS KANBAN,
                    SB1.B1_APROPRI AS SUPERMERCADO,
                    RTRIM(SD4.D4_OP) AS OP,
                    RTRIM(SC2.C2_PRODUTO) AS DEC_OP,
                    CONCAT(SUBSTRING(SC2.C2_DATPRI,7,2),'/',SUBSTRING(SC2.C2_DATPRI,5,2),'/',SUBSTRING(SC2.C2_DATPRI,1,4)) AS ENTREGA

            FROM	  SD4010 AS SD4 WITH (NOLOCK) INNER JOIN
                    SB1010 AS SB1 WITH (NOLOCK) ON SB1.D_E_L_E_T_ = '' AND SB1.B1_COD = SD4.D4_COD AND LEFT(SB1.B1_FILIAL, 2) = LEFT(SD4.D4_FILIAL, 2) LEFT OUTER JOIN
                    SC2010 AS SC2 WITH (NOLOCK) ON SC2.D_E_L_E_T_ = '' AND SC2.C2_FILIAL = SD4.D4_FILIAL AND SC2.C2_NUM + SC2.C2_ITEM + SC2.C2_SEQUEN = SD4.D4_OP

            WHERE	  ${op_condition}
                    ${filial_condition}
                    ${produto_condition}
                    ${kanban_condition}
                    ${supermercado_condition}
                    SD4.D4_QUANT > 0 AND
                    SD4.D_E_L_E_T_ = ''

            ORDER BY SC2.C2_DATPRI
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
