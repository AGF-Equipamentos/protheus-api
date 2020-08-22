const sql = require("mssql");

module.exports = {
  async index(req, res) {
    const request = new sql.Request();

    const { filial, grupo, produto } = req.headers;

    if(filial!=null) {
      filial_condition = `SB1.B1_FILIAL IN (${filial}) AND`;
    } else {filial_condition = ``;};

    if(grupo!=null) {
      grupo_condition = `SB1.B1_GRUPO IN ('${grupo}') AND`;
    } else {grupo_condition = ``;};
    console.log(grupo_condition)

    if(produto!=null) {
      produto_condition = `SB1.B1_COD IN ('${produto}') AND`;
    } else {produto_condition = ``;};
           
    //CONCAT(SUBSTRING(SC2.C2_DATPRI,7,2),'/',SUBSTRING(SC2.C2_DATPRI,5,2),'/',SUBSTRING(SC2.C2_DATPRI,1,4)) AS ENTREGA

        // query to the database and get the records
        await request.query(
            `
            SELECT  
                    RTRIM(SB1.B1_COD) AS codigo,
                    RTRIM(SB1.B1_DESC) AS descricao,
                    SB1.B1_GRUPO AS grupo,
                    RTRIM(SBM.BM_DESC) AS desc_grupo

            FROM	  SB1010 AS SB1 INNER JOIN
                    SBM010 AS SBM ON SBM.D_E_L_E_T_ = '' AND SBM.BM_FILIAL = '01' AND SBM.BM_GRUPO = SB1.B1_GRUPO

            WHERE
                    ${filial_condition}
                    ${grupo_condition}
                    ${produto_condition}
                	  SB1.B1_MSBLQL = '2' AND
                    SB1.D_E_L_E_T_ = ''
            
            ORDER BY grupo

            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0]);
            // send records as a response
            }
        )
  }
};