const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { filial, produto } = req.query

    let filial_condition
    let produto_condition

    if (filial != null) {
      filial_condition = `SB3.B3_FILIAL IN ('${filial}') AND`
    } else {
      filial_condition = ``
    }

    if (produto != null) {
      produto_condition = `SB3.B3_COD IN ('${produto}') AND`
    } else {
      produto_condition = ``
    }

    // query to the database and get the records
    await request.query(
      `
            SELECT
                    RTRIM(SB3.B3_COD) AS CODIGO,
                    SB3.B3_Q01 AS Q01,
                    SB3.B3_Q02 AS Q02,
                    SB3.B3_Q03 AS Q03,
                    SB3.B3_Q04 AS Q04,
                    SB3.B3_Q05 AS Q05,
                    SB3.B3_Q06 AS Q06,
                    SB3.B3_Q07 AS Q07,
                    SB3.B3_Q08 AS Q08,
                    SB3.B3_Q09 AS Q09,
                    SB3.B3_Q10 AS Q10,
                    SB3.B3_Q11 AS Q11,
                    SB3.B3_Q12 AS Q12

            FROM	  SB3010 AS SB3 WITH (NOLOCK)

            WHERE
                    ${produto_condition}
                    ${filial_condition}
                    SB3.D_E_L_E_T_ = ''

            `,
      function (err, recordset) {
        if (err) console.log(err)

        return res.json(recordset.recordsets[0])
        // send records as a response
      }
    )
  }
}
