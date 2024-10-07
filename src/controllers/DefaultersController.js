const { format, subHours, subDays } = require('date-fns')
const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const {
      filial = "0101','0102','0103','0104','0105','0106",
      tipo = "CH','NF",
      data_inicio = format(new Date(2000, 0, 1), 'yyyyMMdd'),
      data_fim = format(subHours(subDays(new Date(), 2), 3), 'yyyyMMdd')
    } = req.query

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

    await request.query(
      `
        SELECT
          E1_FILIAL AS Filial,
          E1_NUM AS Nf,
          E1_PARCELA AS Parcela,
          E1_TIPO AS Tipo,
          E1_EMISSAO AS Dt_Emissao,
          E1_VENCREA AS Dt_Vencimento,
          E1_CLIENTE AS Cod_Cliente,
          RTRIM(E1_NOMCLI) AS Nome_Cliente,
          E1_VALOR AS Valor, 
          E1_SALDO AS Valor_Pendente,
          DATEDIFF(DAY, E1_VENCREA, GETDATE()) AS Dias,
          E1_VEND1 AS Cod_Vendedor,
          RTRIM(VEND.A3_NOME) AS Nome_Vendedor,
          E1_CCC AS Centro_Custo,
          RTRIM(CC.CTT_DESC01) AS Descricao_Centro_Custo,
          YEAR(E1_VENCREA) AS Ano,
          R_E_C_N_O_ AS ID
        FROM     dbo.SE1010 WITH (NOLOCK) LEFT OUTER JOIN
                    (SELECT        CTT_FILIAL, CTT_CUSTO, CTT_DESC01
                    FROM            dbo.CTT010) AS CC ON LEFT(dbo.SE1010.E1_FILIAL, 2) = LEFT(CC.CTT_FILIAL, 2) AND dbo.SE1010.E1_CCC = CC.CTT_CUSTO LEFT OUTER JOIN
                    (SELECT        A3_FILIAL, A3_COD, A3_NOME
                    FROM            dbo.SA3010) AS VEND ON LEFT(dbo.SE1010.E1_FILIAL, 2) = LEFT(VEND.A3_FILIAL, 2) AND dbo.SE1010.E1_VEND1 = VEND.A3_COD
	      WHERE
         E1_SALDO <> 0 AND
         ${filial_condition}
         ${tipo_condition}
         E1_VENCREA <= ${data_fim} AND
         E1_VENCREA >= ${data_inicio} AND
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
        return res.json(recordset.recordsets[0])
      }
    )
  }
}
