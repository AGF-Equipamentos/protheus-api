const sql = require("mssql");

module.exports = {
  async index(req, res) {
    const request = new sql.Request();

    const { filial, pc, produto, finalizado } = req.headers;

    if(filial!=null) {
      filial_condition = `SC7.C7_FILIAL IN (${filial}) AND`;
    } else {filial_condition = ``;};

    if(pc!=null) {
      pc_condition = `SC7.C7_NUM = ('${pc}') AND`;
    } else {pc_condition = ``;};

    if(produto!=null) {
      produto_condition = `SC7.C7_PRODUTO IN ('${produto}') AND`;
    } else {produto_condition = ``;};

    if(finalizado!=null && finalizado) {
      finalizado_condition = `SC7.C7_QUANT <> SC7.C7_QUJE AND`;
    } else {finalizado_condition = ``;};
           
        // query to the database and get the records
        await request.query(
            `
            SELECT  SC7.C7_NUM AS PEDIDO,	
                    SC7.C7_ITEM AS ITEM,
                    SC7.C7_CONAPRO AS APROVADO,
                    CONCAT(SUBSTRING(SC7.C7_EMISSAO,7,2),'/',SUBSTRING(SC7.C7_EMISSAO,5,2),'/',SUBSTRING(SC7.C7_EMISSAO,1,4)) AS EMISSAO,
                    RTRIM(SC7.C7_PRODUTO) AS PRODUTO,
                    RTRIM(SB1.B1_DESC) AS DESCRICAO,
                    SC7.C7_UM AS UM,
                    SC7.C7_QUANT AS QTD,
                    SC7.C7_QUJE AS QTD_ENT,
                    SC7.C7_PRECO AS PRECO,
                    RTRIM(SC7.C7_OBS) AS OBS,
                    SC7.C7_FORNECE AS FORN,
                    CONCAT(SUBSTRING(SC7.C7_DATPRF,7,2),'/',SUBSTRING(SC7.C7_DATPRF,5,2),'/',SUBSTRING(SC7.C7_DATPRF,1,4)) AS ENTREGA,
                    RTRIM(SA2.A2_NREDUZ) AS DESC_FORN

            FROM	  SC7010 AS SC7 INNER JOIN
                    SB1010 AS SB1 ON SB1.D_E_L_E_T_ = '' AND SB1.B1_COD = SC7.C7_PRODUTO LEFT OUTER JOIN
                    SA2010 AS SA2 ON (SA2.D_E_L_E_T_ = '' AND SA2.A2_FILIAL = '01') AND SA2.A2_COD = SC7.C7_FORNECE
            WHERE	  ${pc_condition}
                    ${filial_condition}
                    ${produto_condition}
                    ${finalizado_condition}
                    SC7.C7_RESIDUO = '' AND
                    SC7.D_E_L_E_T_ = ''

            ORDER BY SC7.C7_DATPRF, SC7.C7_NUM, SC7.C7_ITEM
            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0]);
            // send records as a response
            }
        )
  }
};