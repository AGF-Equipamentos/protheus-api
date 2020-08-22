const sql = require("mssql");

module.exports = {
  async index(req, res) {
    const request = new sql.Request();

    const { filial, produto } = req.headers;

    if(filial!=null) {
      filial_condition = `SG1.G1_FILIAL IN (${filial}) AND`;
    } else {filial_condition = ``;};

    if(produto!=null) {
      produto_condition = `SG1.G1_COMP IN ('${produto}') AND`;
    } else {produto_condition = ``;};
           
    //CONCAT(SUBSTRING(SC2.C2_DATPRI,7,2),'/',SUBSTRING(SC2.C2_DATPRI,5,2),'/',SUBSTRING(SC2.C2_DATPRI,1,4)) AS ENTREGA

        // query to the database and get the records
        await request.query(
            `
            SELECT  
                    RTRIM(SG1.G1_COD) AS CODIGO,
                    RTRIM(SG1.G1_COMP) AS COMPONENTE,
                    SG1.G1_QUANT AS QUANTIDADE

            FROM	  SG1010 AS SG1

            WHERE	  ${filial_condition}
                    ${produto_condition}
                    SG1.D_E_L_E_T_ = ''

            ORDER BY SG1.G1_COMP
            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0]);
            // send records as a response
            }
        )
  }
};