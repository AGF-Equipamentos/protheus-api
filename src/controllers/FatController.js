const sql = require('mssql')
const { getRedis } = require('../utils/redis/getRedis')
const { setRedis } = require('../utils/redis/setRedis')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { filial, produto, grupo, ano, mes, devolution } = req.query

    let filial_condition
    let produto_condition
    let grupo_condition
    let ano_condition
    let mes_condition
    let devolution_condition

    if (filial != null) {
      filial_condition = `F2_FILIAL IN (${filial}) AND`
    } else {
      filial_condition = ``
    }

    if (produto != null) {
      produto_condition = `D2_COD IN ('${produto}') AND`
    } else {
      produto_condition = ``
    }

    if (grupo != null) {
      grupo_condition = `B1_GRUPO IN ('${grupo}') AND`
    } else {
      grupo_condition = ``
    }

    if (ano != null) {
      ano_condition = `ANO IN (${ano}) AND`
    } else {
      ano_condition = ``
    }

    if (mes != null) {
      mes_condition = `MES IN (${mes}) AND`
    } else {
      mes_condition = ``
    }

    if (devolution != null) {
      if (devolution === 'no') {
        devolution_condition = `VALOR_LIQUIDO_NF > 0 AND`
      } else {
        devolution_condition = ``
      }
    } else {
      devolution_condition = ``
    }

    const redisResponse = await getRedis(req.query)

    if (redisResponse) {
      return res.json(redisResponse)
    }

    // query to the database and get the records
    await request.query(
      `
            SELECT
                    RTRIM(D2_COD) AS PRODUTO,
                    RTRIM(B1_DESC) AS DESCRICAO,
                    D2_TOTAL AS VALOR,
                    ANO,
                    MES,
                    MARGEM,
                    D2_QUANT AS QTD

            FROM    FATURAMENTO WITH (NOLOCK)

            WHERE   ${filial_condition}
                    ${produto_condition}
                    ${grupo_condition}
                    ${ano_condition}
                    ${mes_condition}
                    ${devolution_condition}
                    (F4_DUPLIC = 'S')

            ORDER BY D2_COD
            `,
      async function (err, recordset) {
        if (err) {
          console.log(err)
          return res.json({
            error: {
              message: err
            }
          })
        }

        await setRedis(
          req.query,
          recordset.recordsets[0],
          60 * 60 * 24 // 1 day
        )

        return res.json(recordset.recordsets[0])
        // send records as a response
      }
    )
  }
}
