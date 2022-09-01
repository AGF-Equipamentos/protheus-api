const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { filial, obs, produto, opnumber, fechado, ano, mes } = req.query

    let produto_condition
    let filial_condition
    let obs_condition
    let opnumber_condition
    let fechado_condition
    let mes_condition
    let ano_condition

    if (produto != null) {
      produto_condition = `SC2.C2_PRODUTO IN ('${produto}') AND`
    } else {
      produto_condition = ``
    }

    if (filial != null) {
      filial_condition = `SC2.C2_FILIAL IN (${filial}) AND`
    } else {
      filial_condition = ``
    }

    if (obs != null) {
      obs_condition = `(SC2.C2_OBS LIKE '%${obs}%') AND`
    } else {
      obs_condition = ``
    }

    if (fechado != null && fechado === 'true') {
      fechado_condition = `SC2.C2_DATRF <> '' AND`
    } else if (fechado != null && fechado === 'false') {
      fechado_condition = `SC2.C2_DATRF = '' AND`
    } else {
      fechado_condition = ``
    }

    if (opnumber != null) {
      opnumber_condition = `
      (SC2.C2_NUM = '${opnumber.slice(0, 6)}') AND
      (SC2.C2_ITEM = '${opnumber.slice(6, 8)}') AND
      (SC2.C2_SEQUEN = '${opnumber.slice(8, 11)}') AND
      `
    } else {
      opnumber_condition = ``
    }

    if (mes != null) {
      mes_condition = `
      (SUBSTRING(SC2.C2_DATRF,5,2) = '${mes}') AND
      `
    } else {
      mes_condition = ``
    }

    if (ano != null) {
      ano_condition = `
      (SUBSTRING(SC2.C2_DATRF,1,4) = '${ano}') AND
      `
    } else {
      ano_condition = ``
    }

    // query to the database and get the records
    await request.query(
      `
            SELECT  RTRIM(SC2.C2_PRODUTO) AS PRODUTO,
                    RTRIM(SB1.B1_DESC) AS DESCRICAO,
                    SC2.C2_NUM + SC2.C2_ITEM + SC2.C2_SEQUEN AS OP,
                    RTRIM(SC2.C2_CC) AS CC,
                    SC2.C2_QUANT AS QTD,
                    CONCAT(SUBSTRING(SC2.C2_DATPRI,7,2),'/',SUBSTRING(SC2.C2_DATPRI,5,2),'/',SUBSTRING(SC2.C2_DATPRI,1,4)) AS DAT_INI,
                    CONCAT(SUBSTRING(SC2.C2_DATPRF,7,2),'/',SUBSTRING(SC2.C2_DATPRF,5,2),'/',SUBSTRING(SC2.C2_DATPRF,1,4)) AS DAT_FIM,
                    CONCAT(SUBSTRING(SC2.C2_DATRF,7,2),'/',SUBSTRING(SC2.C2_DATRF,5,2),'/',SUBSTRING(SC2.C2_DATRF,1,4)) AS DAT_REAL,
                    SUBSTRING(SC2.C2_DATRF,5,2) AS MES_REAL,
                    SUBSTRING(SC2.C2_DATRF,1,4) AS ANO_REAL,
                    RTRIM(SC2.C2_OBS) AS OBS,
                    CONCAT(SUBSTRING(SC2.C2_EMISSAO,7,2),'/',SUBSTRING(SC2.C2_EMISSAO,5,2),'/',SUBSTRING(SC2.C2_EMISSAO,1,4)) AS DAT_EMI,
                    SC2.C2_QUJE AS QTD_PRO

            FROM    SC2010 AS SC2 WITH (NOLOCK) LEFT OUTER JOIN
                    SB1010 AS SB1 WITH (NOLOCK) ON SB1.D_E_L_E_T_ = '' AND SB1.B1_COD = SC2.C2_PRODUTO

            WHERE   ${filial_condition}
                    ${produto_condition}
                    ${obs_condition}
                    ${opnumber_condition}
                    ${fechado_condition}
                    ${mes_condition}
                    ${ano_condition}
                    (SC2.D_E_L_E_T_ = '')

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
