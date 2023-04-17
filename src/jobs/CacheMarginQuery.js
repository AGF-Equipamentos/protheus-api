const sql = require('mssql')
const { setRedis } = require('../utils/redis/setRedis')

module.exports = {
  key: 'CacheMarginQuery',
  options: {
    repeat: { cron: '0 */3 * * *' }
  },
  async handle({ data }) {
    const request = new sql.Request()

    await new Promise((resolse, reject) => {
      request.query(
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

        WHERE   ${data.filial_condition}
        ${data.produto_condition}
        ${data.grupo_condition}
        ${data.ano_condition}
        ${data.mes_condition}
        ${data.devolution_condition}
        (F4_DUPLIC = 'S')

        ORDER BY D2_COD
        `,
        async function (err, recordset) {
          if (err) {
            console.log(err)

            reject('Error')
            return
          }

          await setRedis(
            { filial: '0101,0102', ano: '2021,2022,2023', devolution: 'no' },
            recordset.recordsets[0],
            60 * 60 * 24 // 1 day
          )

          resolse('Success')
        }
      )
    })
  }
}
