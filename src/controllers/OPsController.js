const sql = require("mssql");

module.exports = {
  async index(req, res) {
    const request = new sql.Request();

    const { filial, obs } = req.headers;

    if(filial!=null) {
      filial_condition = `SC2.C2_FILIAL IN (${filial}) AND`;
    } else {filial_condition = ``;};

    if(obs!=null) {
      obs_condition = `(SC2.C2_OBS LIKE '%${obs}%') AND`;
    } else {obs_condition = ``;};
           
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
                    RTRIM(SC2.C2_OBS) AS OBS,
                    CONCAT(SUBSTRING(SC2.C2_EMISSAO,7,2),'/',SUBSTRING(SC2.C2_EMISSAO,5,2),'/',SUBSTRING(SC2.C2_EMISSAO,1,4)) AS DAT_EMI,
                    SC2.C2_QUJE AS QTD_PRO

            FROM    SC2010 AS SC2 LEFT OUTER JOIN
                    SB1010 AS SB1 ON SB1.D_E_L_E_T_ = '' AND SB1.B1_COD = SC2.C2_PRODUTO

            WHERE   ${filial_condition}
                    ${obs_condition}
                    (SC2.C2_DATRF = '') AND 
                    (SC2.D_E_L_E_T_ = '')

            ORDER BY SC2.C2_DATPRI
            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0]);
            // send records as a response
            }
        )
  }
};