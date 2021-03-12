const sql = require("mssql");

module.exports = {
  async index(req, res) {
    const request = new sql.Request();

    const { filial, produto, busca_cod_produto, busca_desc_produto } = req.query;

    if(filial!=null) {
      filial_condition = `SB1.B1_FILIAL IN ('${filial.slice(0,2)}') AND`;
    } else {filial_condition = ``;};

    if(produto!=null) {
      produto_condition = `SB1.B1_COD IN ('${produto}') AND`;
    } else {produto_condition = ``;};

    if(busca_cod_produto!=null) {
      busca_cod_produto_condition = `SB1.B1_COD LIKE ('%${busca_cod_produto.toUpperCase()}%') AND`;
    } else {busca_cod_produto_condition = ``;};

    if(busca_desc_produto!=null) {
      busca_desc_produto_condition = `SB1.B1_DESC LIKE ('%${busca_desc_produto.toUpperCase()}%') AND`;
    } else {busca_desc_produto_condition = ``;};
           
    //CONCAT(SUBSTRING(SC2.C2_DATPRI,7,2),'/',SUBSTRING(SC2.C2_DATPRI,5,2),'/',SUBSTRING(SC2.C2_DATPRI,1,4)) AS ENTREGA

        // query to the database and get the records
        await request.query(
            `
            SELECT
                    RTRIM(SB1.B1_COD) AS CODIGO,
                    RTRIM(SB1.B1_DESC) AS DESCRICAO,
                    SB1.B1_EMIN AS PP,
                    SB1.B1_LE AS LE,
                    SB1.B1_UM AS UM,
                    SB1.B1_ESTSEG AS ESTSEG

            FROM	  SB1010 AS SB1 

            WHERE	  ${produto_condition}
                    ${busca_cod_produto_condition}  
                    ${busca_desc_produto_condition}  
                    ${filial_condition}
                    SB1.D_E_L_E_T_ = ''

            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0]);
            // send records as a response
            }
        )
  }
};