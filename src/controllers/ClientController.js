const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { filial, cnpj, company_name } = req.query

    let filial_condition
    let cnpj_condition
    let company_name_condition

    if (filial != null) {
      filial_condition = `SA1.A1_FILIAL IN ('${filial}') AND`
    } else {
      filial_condition = ``
    }

    if (cnpj != null) {
      cnpj_condition = `SA1.A1_CGC = '${cnpj}' AND`
    } else {
      cnpj_condition = ``
    }

    if (company_name != null) {
      company_name_condition = `SA1.A1_NOME = '${company_name}' AND`
    } else {
      company_name_condition = ``
    }

    // query to the database and get the records
    await request.query(
      `
            SELECT
                    RTRIM(SA1.A1_FILIAL) AS filial,
                    RTRIM(SA1.A1_COD) AS codigo_cliente,
                    RTRIM(SA1.A1_NOME) AS razao_social,
                    RTRIM(SA1.A1_CGC) AS cnpj,
                    RTRIM(SA1.A1_INSCR) AS inscricao_estadual,
                    RTRIM(SA1.A1_CONTRIB) AS contribuinte,
                    RTRIM(SA1.A1_END) AS endereco,
                    RTRIM(SA1.A1_BAIRRO) AS bairro,
                    RTRIM(SA1.A1_MUN) AS municipio,
                    RTRIM(SA1.A1_EST) AS uf,
                    RTRIM(SA1.A1_CEP) AS cep,
                    RTRIM(SA1.A1_CONTATO) AS contato,
                    RTRIM(SA1.A1_EMAIL) AS email,
                    RTRIM(SA1.A1_TEL) AS telefone

            FROM    SA1010 AS SA1 WITH (NOLOCK)

            WHERE   
                    ${company_name_condition}
                    ${cnpj_condition}
                    ${filial_condition}
                    SA1.A1_MSBLQL <> 1 AND
                    SA1.D_E_L_E_T_ = ''

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
