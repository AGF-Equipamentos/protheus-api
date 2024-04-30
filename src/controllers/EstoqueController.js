const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    //query request need to declare all the variables!
    const { filial, produto, grupo, armazem } = req.query

    let filial_condition
    let produto_condition
    let grupo_condition
    let armazem_condition

    if (filial != null) {
      if (typeof filial === 'object') {
        filial_condition = `FILIAL IN ('${filial.join(`','`)}') AND`
      } else {
        filial_condition = `FILIAL IN (${filial}) AND`
      }
    } else {
      filial_condition = ``
    }

    if (produto != null) {
      if (typeof produto === 'object') {
        produto_condition = `PRODUTO IN ('${produto.join(`','`)}') AND`
      } else {
        produto_condition = `PRODUTO IN ('${produto}') AND`
      }
    } else {
      produto_condition = ``
    }

    if (grupo != null) {
      if (typeof grupo === 'object') {
        grupo_condition = `GRUPO IN ('${grupo.join(`','`)}') AND`
      } else {
        grupo_condition = `GRUPO IN ('${grupo}') AND`
      }
    } else {
      grupo_condition = ``
    }

    if (armazem != null) {
      armazem_condition = `ARMAZEM IN (${armazem}) AND`
    } else {
      armazem_condition = ``
    }

    // query to the database and get the records
    await request.query(
      `
      SELECT *
      FROM (
        SELECT FILIAL, PRODUTO, DESCRICAO, SALDO, ARMAZEM, GRUPO
        FROM SALDO_ESTOQUE WITH (NOLOCK)
        WHERE
        SALDO > 0
                  
        UNION ALL
                  
        SELECT SB6.B6_FILIAL AS FILIAL, SB6.B6_PRODUTO AS PRODUTO, SB1.B1_DESC AS DESCRICAO, SB6.B6_SALDO AS SALDO, 'FEIRA' AS ARMAZEM, SB1.B1_GRUPO AS GRUPO
        FROM dbo.SB6010 AS SB6 WITH (NOLOCK)
        LEFT OUTER JOIN dbo.SB1010 AS SB1 ON LEFT(SB6.B6_FILIAL, 2) = LEFT('0101,0102,0103,0104,0105,0106', 2) AND SB6.B6_PRODUTO = SB1.B1_COD
        WHERE
        SB6.B6_TES IN ('554', '680') AND
        SB6.B6_ATEND <> 'S' AND
        SB6.B6_SALDO > 0 AND
        SB6.D_E_L_E_T_ = ''
        GROUP BY B6_FILIAL, B6_PRODUTO, B1_DESC, B6_SALDO, B1_GRUPO
                  
      ) AS QUERY

      WHERE
          ${produto_condition}
          ${grupo_condition}
          ${filial_condition}
          ${armazem_condition}
              SALDO > 0 
            `,

      function (err, recordset) {
        console.log(`
        SELECT *
        FROM (
          SELECT FILIAL, PRODUTO, DESCRICAO, SALDO, ARMAZEM, GRUPO
          FROM SALDO_ESTOQUE WITH (NOLOCK)
          WHERE
          SALDO > 0
                    
          UNION ALL
                    
          SELECT
          SB6.B6_FILIAL AS FILIAL,
          SB6.B6_PRODUTO AS PRODUTO,
          SB1.B1_DESC AS DESCRICAO,
          SUM(SB6.B6_SALDO) AS SALDO,
          'FEIRA' AS ARMAZEM,
          SB1.B1_GRUPO AS GRUPO
          FROM dbo.SB6010 AS SB6 WITH (NOLOCK)
          LEFT OUTER JOIN dbo.SB1010 AS SB1 ON LEFT(SB6.B6_FILIAL, 2) = LEFT('0101,0102,0103,0104,0105,0106', 2) AND SB6.B6_PRODUTO = SB1.B1_COD
          WHERE
          SB6.B6_TES IN ('554', '680') AND
          SB6.B6_ATEND <> 'S' AND
          SB6.B6_SALDO > 0 AND
		      SB6.D_E_L_E_T_ = ''
		      GROUP BY B6_FILIAL, B6_PRODUTO, B1_DESC, B6_SALDO, B1_GRUPO
                    
        ) AS QUERY
  
        WHERE
              ${produto_condition}
              ${grupo_condition}
              ${filial_condition}
              ${armazem_condition}
                SALDO > 0
              `)
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
