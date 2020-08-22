const sql = require("mssql");

module.exports = {
  async index(req, res) {
    const request = new sql.Request();
           
    //CONCAT(SUBSTRING(SC2.C2_DATPRI,7,2),'/',SUBSTRING(SC2.C2_DATPRI,5,2),'/',SUBSTRING(SC2.C2_DATPRI,1,4)) AS ENTREGA

        // query to the database and get the records
        await request.query(
            `
            SELECT
                    RTRIM(SA1.A1_COD) AS codigo_cliente,
                    RTRIM(SA1.A1_NOME) AS razao_social,
                    RTRIM(SA1.A1_CGC) AS cnpj,
                    RTRIM(SA1.A1_INSCR) AS inscricao_estadual,
                    RTRIM(SA1.A1_END) AS endereco,
                    RTRIM(SA1.A1_BAIRRO) AS bairro,
                    RTRIM(SA1.A1_MUN) AS municipio,
                    RTRIM(SA1.A1_EST) AS uf,
                    RTRIM(SA1.A1_CEP) AS cep,
                    RTRIM(SA1.A1_CONTATO) AS contato,
                    RTRIM(SA1.A1_EMAIL) AS email,
                    RTRIM(SA1.A1_TEL) AS telefone

            FROM    SA1010 AS SA1

            WHERE	  
                    SA1.D_E_L_E_T_ = ''

            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0]);
            // send records as a response
            }
        )
  }
};