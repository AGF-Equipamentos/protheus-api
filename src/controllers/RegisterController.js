const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { filial, produto, top, busca_cod_produto, busca_desc_produto } =
      req.query

    let filial_condition
    let produto_condition
    let top_condition
    let busca_cod_produto_condition
    let busca_desc_produto_condition

    if (filial != null) {
      filial_condition = `SB1.B1_FILIAL IN ('${filial.slice(0, 2)}') AND`
    } else {
      filial_condition = ``
    }

    if (top != null) {
      top_condition = `TOP ${top}`
    } else {
      top_condition = ``
    }

    if (produto != null) {
      if (typeof produto === 'object') {
        produto_condition = `SB1.B1_COD IN ('${produto.join(`','`)}') AND`
      } else {
        produto_condition = `SB1.B1_COD IN ('${produto}') AND`
      }
    } else {
      produto_condition = ``
    }

    if (busca_cod_produto != null) {
      busca_cod_produto_condition = `SB1.B1_COD LIKE ('%${busca_cod_produto.toUpperCase()}%') AND`
    } else {
      busca_cod_produto_condition = ``
    }

    if (busca_desc_produto != null) {
      busca_desc_produto_condition = `SB1.B1_DESC LIKE ('%${busca_desc_produto.toUpperCase()}%') AND`
    } else {
      busca_desc_produto_condition = ``
    }

    //CONCAT(SUBSTRING(SC2.C2_DATPRI,7,2),'/',SUBSTRING(SC2.C2_DATPRI,5,2),'/',SUBSTRING(SC2.C2_DATPRI,1,4)) AS ENTREGA

    // query to the database and get the records
    await request.query(
      `
            SELECT  ${top_condition}
                    RTRIM(SB1.B1_COD) AS CODIGO,
                    RTRIM(SB1.B1_DESC) AS DESCRICAO,
                    RTRIM(SB1.B1_ZZLOCA) AS LOCACAO,
                    SB1.B1_GRUPO AS GRUPO,
                    SB1.B1_EMIN AS PP,
                    SB1.B1_LE AS LE,
                    SB1.B1_UM AS UM,
                    SB1.B1_BASE3 AS FAMILIA,
                    SB1.B1_APROPRI AS APROPRI,
                    SB1.B1_TIPO AS TIPO,
                    SB1.B1_POSIPI AS NCM,
                    CASE WHEN B1_MSBLQL = 1 THEN CAST(1 AS BIT) WHEN B1_MSBLQL = 2 THEN CAST(0 AS BIT) END AS BLOQUEADO,
                    COALESCE(SUM(EST_TERC.B6_SALDO), 0) AS SALDO_TERCEIRO

            FROM	  SB1010 AS SB1 WITH (NOLOCK) LEFT JOIN 
                      (SELECT 
                          B6_FILIAL,
                          B6_PRODUTO,
                          B6_TIPO,
                          B6_SALDO
                      FROM dbo.VW_ESTOQUE_TERCEIRO
                      WHERE (B6_TIPO = 'E')) AS EST_TERC ON LEFT(SB1.B1_FILIAL, 2) = LEFT(EST_TERC.B6_FILIAL, 2) AND
                      SB1.B1_COD = EST_TERC.B6_PRODUTO

            WHERE	  ${produto_condition}
                    ${busca_cod_produto_condition}
                    ${busca_desc_produto_condition}
                    ${filial_condition}
                    SB1.D_E_L_E_T_ = ''
            
            GROUP BY
                    RTRIM(SB1.B1_COD),
                    RTRIM(SB1.B1_DESC),
                    RTRIM(SB1.B1_ZZLOCA),
                    SB1.B1_GRUPO,
                    SB1.B1_EMIN,
                    SB1.B1_LE,
                    SB1.B1_UM,
                    SB1.B1_BASE3,
                    SB1.B1_APROPRI,
                    SB1.B1_TIPO,
                    SB1.B1_POSIPI,
                    CASE WHEN B1_MSBLQL = 1 THEN CAST(1 AS BIT) WHEN B1_MSBLQL = 2 THEN CAST(0 AS BIT) END

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
