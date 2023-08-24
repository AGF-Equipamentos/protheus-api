const { format, subDays, subHours } = require('date-fns')
const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const resquest = new sql.Request()

    const {
      filial = "0101','0102','0103", //'0101', '0102', '0103',
      tipo = "CH','NF", //'CH','NF'
      data_inicio = new Date(2000, 0, 1),
      data_fim = format(
        new Date(subHours(subDays(new Date(), 1)), 3),
        'yyyyMMdd'
      )
    } = req.query
    console.log(new Date('2023-08-22'))
    console.log(new Date(2023, 7, 22, 23))
    console.log(subHours(new Date(), 3))
    // 23h
    // console.log(data_fim.replaceAll('-', ''))
    let filial_condition
    let tipo_condition

    if (filial != null) {
      filial_condition = `E1_FILIAL IN ('${filial}') AND`
    } else {
      filial_condition = ``
    }

    if (tipo != null) {
      tipo_condition = `E1_TIPO IN ('${tipo}') AND`
    } else {
      tipo_condition = ``
    }

    await resquest.query(
      `
        SELECT
          E1_FILIAL AS FILIAL,
          E1_NUM AS NF,
          E1_PARCELA AS PARCELA,
          E1_TIPO AS TIPO,
          E1_EMISSAO AS [DATA EMISSÃO],
          E1_VENCREA AS VENCIMENTO,
          E1_CLIENTE AS [COD CLIENTE],
          E1_NOMCLI AS [NOME CLIENTE],
          E1_VALOR AS VALOR, 
          E1_SALDO AS [VALOR PENDENTE],
          DATEDIFF(DAY, E1_VENCREA, GETDATE()) AS DIAS,
          E1_VEND1 AS [COD VENDEDOR],
          E1_CCC AS [CENTRO CUSTO],
          YEAR(E1_VENCREA) AS ANO
        FROM  dbo.SE1010 WITH (NOLOCK)
        WHERE
         E1_SALDO <> 0 AND
         ${filial_condition}
         ${tipo_condition}
         E1_VENCREA <= ${data_fim.replaceAll('-', '')} AND
         E1_VENCREA >= ${format(new Date(data_inicio), 'yyyyMMdd')} AND
         D_E_L_E_T_ = ''
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
        console.log(recordset.recordsets[0].length)
        return res.json(recordset.recordsets[0])
      }
    )
  }
}
